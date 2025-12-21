import { Injectable } from '@nestjs/common';
import axios from 'axios';
import * as crypto from 'crypto';

export interface TwitterPublishResult {
  tweetId?: string;
  url?: string;
  error?: string;
}

/**
 * Twitter API v2 服务
 * 文档: https://developer.twitter.com/en/docs/twitter-api
 */
@Injectable()
export class TwitterService {
  private readonly apiUrl = 'https://api.twitter.com/2';

  /**
   * 生成 OAuth 1.0a 签名
   * Twitter API v2 仍需要 OAuth 1.0a 进行用户认证操作
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
   * 发布推文
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
      console.error('Twitter publish error:', error.response?.data);
      return {
        error:
          error.response?.data?.detail ||
          error.response?.data?.errors?.[0]?.message ||
          error.message,
      };
    }
  }

  /**
   * 发布串文（Thread）
   * 将长文分割成多条推文串连发布
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
        break; // 如果有错误，停止发布后续推文
      }

      previousTweetId = result.tweetId;

      // 添加延迟避免速率限制
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    return results;
  }

  /**
   * 计算 Twitter 字符长度
   * 中日韩字符算 2 字符，URL 固定算 23 字符
   */
  calculateLength(text: string): number {
    let length = 0;

    // 移除 URL（后面单独计算）
    const urls = text.match(/https?:\/\/\S+/g) || [];
    let textWithoutUrls = text;
    urls.forEach((url) => {
      textWithoutUrls = textWithoutUrls.replace(url, '');
    });

    // 计算字符权重
    for (const char of textWithoutUrls) {
      const code = char.codePointAt(0)!;
      length += code <= 0x10ff ? 1 : 2;
    }

    // URL 固定 23 字符
    length += urls.length * 23;

    return length;
  }
}
