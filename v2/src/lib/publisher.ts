import prisma from '@/lib/db';
import { decrypt } from '@/lib/encryption';
import type { PlatformResult } from '@/lib/types';
import * as facebook from '@/lib/platforms/facebook';
import * as twitter from '@/lib/platforms/twitter';
import * as threads from '@/lib/platforms/threads';
import * as instagram from '@/lib/platforms/instagram';
import { splitForTwitter, splitForPlatform } from '@/lib/splitter';

const RETRY_DELAYS = [1000, 2000, 4000];

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < RETRY_DELAYS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS[attempt]));
      }
    }
  }
  throw lastError;
}

async function getConnection(userId: string, platform: string) {
  return prisma.platformConnection.findFirst({
    where: { userId, platform, isActive: true },
  });
}

async function publishToFacebook(
  userId: string,
  content: string,
  mediaUrl?: string,
): Promise<PlatformResult> {
  const connection = await getConnection(userId, 'facebook');
  if (!connection) return { error: 'Facebook not connected' };

  const accessToken = decrypt(connection.accessToken);
  const pages = await facebook.getPages(accessToken);
  if (!pages.length) return { error: 'No Facebook pages found' };

  // Use page from metadata if available, else first page
  const metadata = connection.metadata as any;
  const page = metadata?.pageId
    ? pages.find((p: any) => p.id === metadata.pageId) || pages[0]
    : pages[0];

  if (mediaUrl) {
    return facebook.publishPhotoPost(page.id, page.access_token, content, mediaUrl);
  }
  return facebook.publishTextPost(page.id, page.access_token, content);
}

async function publishToTwitter(userId: string, content: string): Promise<PlatformResult> {
  const connection = await getConnection(userId, 'twitter');
  if (!connection) return { error: 'Twitter not connected' };

  const accessToken = decrypt(connection.accessToken);
  const tokenSecret = connection.refreshToken ? decrypt(connection.refreshToken) : '';
  const consumerKey = process.env.TWITTER_CLIENT_ID;
  const consumerSecret = process.env.TWITTER_CLIENT_SECRET;

  if (!consumerKey || !consumerSecret) {
    return { error: 'Twitter is not configured. Please contact the administrator.' };
  }

  const twitterLength = twitter.calculateLength(content);
  if (twitterLength <= 280) {
    return twitter.publishTweet(content, accessToken, tokenSecret, consumerKey, consumerSecret);
  }

  const chunks = splitForTwitter(content);
  const results = await twitter.publishThread(chunks, accessToken, tokenSecret, consumerKey, consumerSecret);
  return results[0];
}

async function publishToThreads(userId: string, content: string): Promise<PlatformResult> {
  const connection = await getConnection(userId, 'threads');
  if (!connection) return { error: 'Threads not connected' };

  const accessToken = decrypt(connection.accessToken);

  if (content.length <= 500) {
    return threads.publishTextPost(connection.platformUserId, accessToken, content);
  }

  const chunks = splitForPlatform(content, 'threads');
  const results = await threads.publishThreadChain(connection.platformUserId, accessToken, chunks);
  return results[0];
}

async function publishToInstagram(
  userId: string,
  content: string,
  mediaUrl?: string,
): Promise<PlatformResult> {
  if (!mediaUrl) return { error: 'Instagram requires an image' };

  const connection = await getConnection(userId, 'instagram');
  if (!connection) return { error: 'Instagram not connected' };

  const accessToken = decrypt(connection.accessToken);
  return instagram.publishImagePost(connection.platformUserId, accessToken, mediaUrl, content);
}

export async function publishToMultiplePlatforms(
  userId: string,
  content: string,
  platforms: string[],
  mediaUrls?: string[],
  _mediaType?: string | null,
): Promise<Record<string, PlatformResult>> {
  const results: Record<string, PlatformResult> = {};

  for (const platform of platforms) {
    try {
      const publish = async (): Promise<PlatformResult> => {
        switch (platform) {
          case 'facebook':
            return publishToFacebook(userId, content, mediaUrls?.[0]);
          case 'twitter':
            return publishToTwitter(userId, content);
          case 'threads':
            return publishToThreads(userId, content);
          case 'instagram':
            return publishToInstagram(userId, content, mediaUrls?.[0]);
          default:
            return { error: `Unknown platform: ${platform}` };
        }
      };

      results[platform] = await withRetry(publish);
    } catch (error: any) {
      results[platform] = { error: error.message };
    }
  }

  return results;
}
