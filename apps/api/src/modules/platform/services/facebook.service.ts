import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface FacebookPublishResult {
  postId?: string;
  url?: string;
  error?: string;
}

/**
 * Facebook Pages API 服务
 * 文档: https://developers.facebook.com/docs/pages/publishing
 */
@Injectable()
export class FacebookService {
  private readonly graphApiUrl = 'https://graph.facebook.com/v19.0';

  /**
   * 获取用户的 Facebook Pages
   */
  async getPages(accessToken: string): Promise<any[]> {
    try {
      const response = await axios.get(`${this.graphApiUrl}/me/accounts`, {
        params: {
          access_token: accessToken,
          fields: 'id,name,access_token,picture',
        },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Failed to get Facebook pages:', error.response?.data);
      throw error;
    }
  }

  /**
   * 发布文字贴文到 Facebook Page
   */
  async publishTextPost(
    pageId: string,
    pageAccessToken: string,
    message: string,
  ): Promise<FacebookPublishResult> {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${pageId}/feed`,
        {
          message,
          published: true,
        },
        {
          params: { access_token: pageAccessToken },
        },
      );

      return {
        postId: response.data.id,
        url: `https://www.facebook.com/${response.data.id}`,
      };
    } catch (error) {
      console.error('Facebook publish error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * 发布带图片的贴文
   */
  async publishPhotoPost(
    pageId: string,
    pageAccessToken: string,
    message: string,
    photoUrl: string,
  ): Promise<FacebookPublishResult> {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${pageId}/photos`,
        {
          url: photoUrl,
          caption: message,
          published: true,
        },
        {
          params: { access_token: pageAccessToken },
        },
      );

      return {
        postId: response.data.id,
        url: `https://www.facebook.com/${response.data.id}`,
      };
    } catch (error) {
      console.error('Facebook photo publish error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * 发布留言到贴文
   */
  async publishComment(
    postId: string,
    pageAccessToken: string,
    message: string,
  ): Promise<{ commentId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${postId}/comments`,
        { message },
        {
          params: { access_token: pageAccessToken },
        },
      );

      return { commentId: response.data.id };
    } catch (error) {
      console.error('Facebook comment error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}
