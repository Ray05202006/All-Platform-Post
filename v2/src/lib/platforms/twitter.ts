import * as crypto from 'crypto';
import axios from 'axios';
import type { PlatformResult } from '@/lib/types';

const API_URL = 'https://api.twitter.com/2';

function isCJKChar(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11ff) ||
    (code >= 0x2e80 && code <= 0x9fff) ||
    (code >= 0xac00 && code <= 0xd7af) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xff00 && code <= 0xffef) ||
    (code >= 0x20000 && code <= 0x2fa1f)
  );
}

export function calculateLength(text: string): number {
  let length = 0;

  const urls = text.match(/https?:\/\/\S+/g) || [];
  let textWithoutUrls = text;
  urls.forEach((url) => {
    textWithoutUrls = textWithoutUrls.replace(url, '');
  });

  for (const char of textWithoutUrls) {
    const code = char.codePointAt(0)!;
    length += isCJKChar(code) ? 2 : 1;
  }

  length += urls.length * 23;
  return length;
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string,
): string {
  const paramString = Object.keys(params)
    .sort()
    .map((key) => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBase = `${method}&${encodeURIComponent(url)}&${encodeURIComponent(paramString)}`;
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function generateOAuthHeader(
  method: string,
  url: string,
  consumerKey: string,
  consumerSecret: string,
  accessToken: string,
  tokenSecret: string,
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };

  const signature = generateOAuthSignature(method, url, oauthParams, consumerSecret, tokenSecret);
  oauthParams.oauth_signature = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

export async function publishTweet(
  content: string,
  accessToken: string,
  tokenSecret: string,
  consumerKey: string,
  consumerSecret: string,
  replyToTweetId?: string,
): Promise<PlatformResult> {
  try {
    const url = `${API_URL}/tweets`;
    const body: any = { text: content };
    if (replyToTweetId) {
      body.reply = { in_reply_to_tweet_id: replyToTweetId };
    }

    const authHeader = generateOAuthHeader('POST', url, consumerKey, consumerSecret, accessToken, tokenSecret);

    const response = await axios.post(url, body, {
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
    });

    const tweetId = response.data.data.id;
    return {
      postId: tweetId,
      url: `https://twitter.com/i/web/status/${tweetId}`,
    };
  } catch (error: any) {
    return {
      error:
        error.response?.data?.detail ||
        error.response?.data?.errors?.[0]?.message ||
        error.message,
    };
  }
}

export async function publishThread(
  chunks: string[],
  accessToken: string,
  tokenSecret: string,
  consumerKey: string,
  consumerSecret: string,
): Promise<PlatformResult[]> {
  const results: PlatformResult[] = [];
  let previousTweetId: string | undefined;

  for (const text of chunks) {
    const result = await publishTweet(text, accessToken, tokenSecret, consumerKey, consumerSecret, previousTweetId);
    results.push(result);

    if (result.error) break;
    previousTweetId = result.postId;

    // Rate limit delay
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return results;
}
