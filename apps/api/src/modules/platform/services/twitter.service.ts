import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

function isCJKChar(code: number): boolean {
  return (
    (code >= 0x1100 && code <= 0x11FF) ||
    (code >= 0x2E80 && code <= 0x9FFF) ||
    (code >= 0xAC00 && code <= 0xD7AF) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    (code >= 0xFF00 && code <= 0xFFEF) ||
    (code >= 0x20000 && code <= 0x2FA1F)
  );
}

export interface TwitterPublishResult {
  tweetId?: string;
  url?: string;
  error?: string;
}

/**
 * Twitter API v2 服務
 * 文件: https://developer.twitter.com/en/docs/twitter-api
 */
@Injectable()
export class TwitterService {
  private readonly logger = new Logger(TwitterService.name);
  private readonly apiUrl = 'https://api.twitter.com/2';

  /**
   * 生成 OAuth 1.0a 簽名
   * Twitter API v2 仍需要 OAuth 1.0a 進行使用者認證操作
   */
  private generateOAuthSignature(
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

    return crypto
      .createHmac('sha1', signingKey)
      .update(signatureBase)
      .digest('base64');
  }

  /**
   * 生成 OAuth 1.0a Authorization header
   */
  private generateOAuthHeader(
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

    const signature = this.generateOAuthSignature(
      method,
      url,
      oauthParams,
      consumerSecret,
      tokenSecret,
    );

    oauthParams.oauth_signature = signature;

    const headerParts = Object.keys(oauthParams)
      .sort()
      .map((key) => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return `OAuth ${headerParts}`;
  }

  /**
   * 釋出推文
   */
  async publishTweet(
    text: string,
    accessToken: string,
    tokenSecret: string,
    consumerKey: string,
    consumerSecret: string,
    replyToTweetId?: string,
  ): Promise<TwitterPublishResult> {
    try {
      const url = `${this.apiUrl}/tweets`;

      const body: any = { text };
      if (replyToTweetId) {
        body.reply = { in_reply_to_tweet_id: replyToTweetId };
      }

      const authHeader = this.generateOAuthHeader(
        'POST',
        url,
        consumerKey,
        consumerSecret,
        accessToken,
        tokenSecret,
      );

      const response = await axios.post(url, body, {
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
      });

      const tweetId = response.data.data.id;
      return {
        tweetId,
        url: `https://twitter.com/i/web/status/${tweetId}`,
      };
    } catch (error) {
      this.logger.error('Twitter publish error:', error.response?.data);
      return {
        error:
          error.response?.data?.detail ||
          error.response?.data?.errors?.[0]?.message ||
          error.message,
      };
    }
  }

  /**
   * 釋出串文（Thread）
   * 將長文分割成多條推文串連發布
   */
  async publishThread(
    tweets: string[],
    accessToken: string,
    tokenSecret: string,
    consumerKey: string,
    consumerSecret: string,
  ): Promise<TwitterPublishResult[]> {
    const results: TwitterPublishResult[] = [];
    let previousTweetId: string | undefined;

    for (const text of tweets) {
      const result = await this.publishTweet(
        text,
        accessToken,
        tokenSecret,
        consumerKey,
        consumerSecret,
        previousTweetId,
      );

      results.push(result);

      if (result.error) {
        break; // 如果有錯誤，停止釋出後續推文
      }

      previousTweetId = result.tweetId;

      // 新增延遲避免速率限制
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * 計算 Twitter 字元長度
   * 中日韓字元算 2 字元，URL 固定算 23 字元
   */
  calculateLength(text: string): number {
    let length = 0;

    // 移除 URL（後面單獨計算）
    const urls = text.match(/https?:\/\/\S+/g) || [];
    let textWithoutUrls = text;
    urls.forEach((url) => {
      textWithoutUrls = textWithoutUrls.replace(url, '');
    });

    // 計算字元權重
    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0)!;
      length += isCJKChar(code) ? 2 : 1;
    }

    // URL 固定 23 字元
    length += urls.length * 23;

    return length;
  }
}
