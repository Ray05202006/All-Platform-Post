import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Threads OAuth 2.0 Strategy (手动实现)
 * Threads API 使用 Facebook 的 OAuth 基础设施
 * 但需要特定的 scope 和 endpoints
 */
@Injectable()
export class ThreadsStrategy {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get<string>('FACEBOOK_APP_ID');
    this.clientSecret = this.configService.get<string>('FACEBOOK_APP_SECRET');
    this.redirectUri = `${this.configService.get<string>('API_URL') || 'http://localhost:3001'}/api/auth/threads/callback`;
  }

  /**
   * 生成 Threads 授权 URL
   */
  getAuthorizationUrl(state: string): string {
    const baseUrl = 'https://threads.net/oauth/authorize';
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'threads_basic,threads_content_publish,threads_manage_replies',
      response_type: 'code',
      state,
    });

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * 交换授权码获取 access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    accessToken: string;
    userId: string;
  }> {
    const response = await axios.post(
      'https://graph.threads.net/oauth/access_token',
      new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
        code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return {
      accessToken: response.data.access_token,
      userId: response.data.user_id,
    };
  }

  /**
   * 获取长期 token（60 天）
   */
  async getLongLivedToken(shortLivedToken: string): Promise<{
    accessToken: string;
    expiresIn: number;
  }> {
    const response = await axios.get(
      'https://graph.threads.net/access_token',
      {
        params: {
          grant_type: 'th_exchange_token',
          client_secret: this.clientSecret,
          access_token: shortLivedToken,
        },
      },
    );

    return {
      accessToken: response.data.access_token,
      expiresIn: response.data.expires_in,
    };
  }

  /**
   * 获取用户资料
   */
  async getUserProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    threadsProfilePictureUrl?: string;
  }> {
    const response = await axios.get('https://graph.threads.net/v1.0/me', {
      params: {
        fields: 'id,username,threads_profile_picture_url',
        access_token: accessToken,
      },
    });

    return {
      id: response.data.id,
      username: response.data.username,
      threadsProfilePictureUrl: response.data.threads_profile_picture_url,
    };
  }
}
