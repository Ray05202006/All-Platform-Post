import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

import { FacebookService } from './services/facebook.service';
import { TwitterService } from './services/twitter.service';
import { ThreadsService } from './services/threads.service';
import { InstagramService } from './services/instagram.service';
import { EncryptionService } from '../../common/services/encryption.service';

// SplitResult 型別：表示 text-splitter 的分割結果，並對外匯出
export interface SplitResult {
  platform: string;
  chunks: string[];
  needsSplitting: boolean;
}

// 平臺限制配置
const PLATFORM_LIMITS: Record<string, number> = {
  facebook: 63206,
  instagram: 2200,
  twitter: 280,
  threads: 500,
};

@Injectable()
export class PlatformService {
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private encryptionService: EncryptionService,
    private facebookService: FacebookService,
    private twitterService: TwitterService,
    private threadsService: ThreadsService,
    private instagramService: InstagramService,
  ) {}

  /**
   * 釋出到多個平臺
   */
  async publishToMultiplePlatforms(
    userId: string,
    content: string,
    platforms: string[],
    mediaUrls?: string[],
    _mediaType?: string | null,
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const platform of platforms) {
      try {
        switch (platform) {
          case 'facebook':
            results.facebook = await this.publishToFacebook(
              userId,
              content,
              mediaUrls?.[0],
            );
            break;
          case 'twitter':
            results.twitter = await this.publishToTwitter(userId, content);
            break;
          case 'threads':
            results.threads = await this.publishToThreads(userId, content);
            break;
          case 'instagram':
            results.instagram = await this.publishToInstagram(
              userId,
              content,
              mediaUrls?.[0],
            );
            break;
          default:
            results[platform] = { error: `Unknown platform: ${platform}` };
        }
      } catch (error) {
        this.logger.error(
          `Unhandled error publishing to ${platform} for user ${userId}: ${error.message}`,
          error.stack,
        );
        results[platform] = { error: error.message };
      }
    }

    return results;
  }

  /**
   * 釋出到 Facebook
   */
  private async publishToFacebook(
    userId: string,
    content: string,
    mediaUrl?: string,
  ) {
    const connection = await this.getConnection(userId, 'facebook');
    if (!connection) {
      return { error: 'Facebook not connected' };
    }

    const accessToken = this.encryptionService.decrypt(connection.accessToken);

    // 獲取使用者的 Facebook Pages
    const pages = await this.facebookService.getPages(accessToken);
    if (!pages.length) {
      return { error: 'No Facebook pages found' };
    }

    // 使用第一個 Page（後續可讓使用者選擇）
    const page = pages[0];

    if (mediaUrl) {
      return this.facebookService.publishPhotoPost(
        page.id,
        page.access_token,
        content,
        mediaUrl,
      );
    } else {
      return this.facebookService.publishTextPost(
        page.id,
        page.access_token,
        content,
      );
    }
  }

  /**
   * 釋出到 Twitter
   */
  private async publishToTwitter(userId: string, content: string) {
    const connection = await this.getConnection(userId, 'twitter');
    if (!connection) {
      return { error: 'Twitter not connected' };
    }

    const accessToken = this.encryptionService.decrypt(connection.accessToken);
    const tokenSecret = connection.refreshToken
      ? this.encryptionService.decrypt(connection.refreshToken)
      : '';

    const consumerKey = this.configService.get<string>('TWITTER_CLIENT_ID');
    const consumerSecret = this.configService.get<string>('TWITTER_CLIENT_SECRET');

    if (!consumerKey || !consumerSecret) {
      this.logger.error('Twitter API credentials (TWITTER_CLIENT_ID / TWITTER_CLIENT_SECRET) are not configured');
      return { error: 'Twitter is not configured. Please contact the administrator.' };
    }

    // 檢查是否需要分割成串文
    const twitterLength = this.twitterService.calculateLength(content);

    if (twitterLength <= 280) {
      // 單條推文
      return this.twitterService.publishTweet(
        content,
        accessToken,
        tokenSecret,
        consumerKey,
        consumerSecret,
      );
    } else {
      // 需要分割成串文
      const chunks = this.splitForTwitter(content);
      const results = await this.twitterService.publishThread(
        chunks,
        accessToken,
        tokenSecret,
        consumerKey,
        consumerSecret,
      );

      // 返回第一條推文的資訊
      return results[0];
    }
  }

  /**
   * 釋出到 Threads
   */
  private async publishToThreads(userId: string, content: string) {
    const connection = await this.getConnection(userId, 'threads');
    if (!connection) {
      return { error: 'Threads not connected' };
    }

    const accessToken = this.encryptionService.decrypt(connection.accessToken);

    // 檢查是否需要分割
    if (content.length <= 500) {
      return this.threadsService.publishTextPost(
        connection.platformUserId,
        accessToken,
        content,
      );
    } else {
      // 分割成多條
      const chunks = this.splitForPlatform(content, 'threads');
      const results = await this.threadsService.publishThreadChain(
        connection.platformUserId,
        accessToken,
        chunks,
      );
      return results[0];
    }
  }

  /**
   * 釋出到 Instagram
   * 注意：Instagram 需要圖片
   */
  private async publishToInstagram(
    userId: string,
    content: string,
    mediaUrl?: string,
  ) {
    if (!mediaUrl) {
      return { error: 'Instagram requires an image' };
    }

    const connection = await this.getConnection(userId, 'instagram');
    if (!connection) {
      return { error: 'Instagram not connected' };
    }

    const accessToken = this.encryptionService.decrypt(connection.accessToken);

    // Instagram 的 platformUserId 儲存的是 IG User ID
    return this.instagramService.publishImagePost(
      connection.platformUserId,
      accessToken,
      mediaUrl,
      content,
    );
  }

  /**
   * 獲取平臺連線（僅返回已啟用的連線）
   */
  private async getConnection(userId: string, platform: string) {
    return this.prisma.platformConnection.findFirst({
      where: { userId, platform, isActive: true },
    });
  }

  /**
   * 簡單的文字分割（用於 Twitter）
   */
  private splitForTwitter(text: string): string[] {
    const maxLength = 280 - 10; // 預留編號空間
    const chunks: string[] = [];

    // 按句子分割
    const sentences = text.split(/([。！?？\n]+|[.!?]+\s+)/).filter((s) => s.trim());

    let current = '';
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');
      const testLength = this.twitterService.calculateLength(current + sentence);

      if (testLength <= maxLength) {
        current += sentence;
      } else {
        if (current) chunks.push(current.trim());
        current = sentence;
      }
    }

    if (current) chunks.push(current.trim());

    // 新增編號
    if (chunks.length > 1) {
      return chunks.map((chunk, i) => `${chunk} (${i + 1}/${chunks.length})`);
    }

    return chunks;
  }

  /**
   * 通用文字分割
   */
  private splitForPlatform(text: string, platform: string): string[] {
    const maxLength = (PLATFORM_LIMITS[platform] || 500) - 10;
    const chunks: string[] = [];

    const sentences = text.split(/([。！?？\n]+|[.!?]+\s+)/).filter((s) => s.trim());

    let current = '';
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] + (sentences[i + 1] || '');

      if ((current + sentence).length <= maxLength) {
        current += sentence;
      } else {
        if (current) chunks.push(current.trim());
        current = sentence;
      }
    }

    if (current) chunks.push(current.trim());

    if (chunks.length > 1) {
      return chunks.map((chunk, i) => `${chunk} (${i + 1}/${chunks.length})`);
    }

    return chunks;
  }

  /**
   * 預覽分割結果
   */
  previewSplit(content: string, platforms: string[]): SplitResult[] {
    return platforms.map((platform) => {
      const maxLength = PLATFORM_LIMITS[platform] || 500;
      const contentLength =
        platform === 'twitter'
          ? this.twitterService.calculateLength(content)
          : content.length;

      if (contentLength <= maxLength) {
        return {
          platform,
          chunks: [content],
          needsSplitting: false,
        };
      }

      const chunks =
        platform === 'twitter'
          ? this.splitForTwitter(content)
          : this.splitForPlatform(content, platform);

      return {
        platform,
        chunks,
        needsSplitting: true,
      };
    });
  }
}
