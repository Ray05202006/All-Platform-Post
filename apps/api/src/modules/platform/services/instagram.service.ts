import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface InstagramPublishResult {
  mediaId?: string;
  url?: string;
  error?: string;
}

/**
 * Instagram Business API 服務
 * 文件: https://developers.facebook.com/docs/instagram-api/guides/content-publishing
 */
@Injectable()
export class InstagramService {
  private readonly logger = new Logger(InstagramService.name);
  private readonly graphApiUrl = 'https://graph.facebook.com/v19.0';

  /**
   * 透過 Facebook Page 獲取關聯的 Instagram Business Account
   */
  async getInstagramBusinessAccount(
    pageId: string,
    pageAccessToken: string,
  ): Promise<{ igUserId: string } | null> {
    try {
      const response = await axios.get(
        `${this.graphApiUrl}/${pageId}`,
        {
          params: {
            fields: 'instagram_business_account',
            access_token: pageAccessToken,
          },
        },
      );

      const igAccount = response.data.instagram_business_account;
      if (!igAccount) {
        return null;
      }

      return { igUserId: igAccount.id };
    } catch (error) {
      this.logger.error('Failed to get Instagram account:', error.response?.data);
      return null;
    }
  }

  /**
   * 建立圖片 Media Container
   * 注意：Instagram API 不支援直接釋出純文字貼文，必須包含圖片
   */
  async createImageContainer(
    igUserId: string,
    accessToken: string,
    imageUrl: string,
    caption: string,
  ): Promise<{ containerId: string }> {
    const response = await axios.post(
      `${this.graphApiUrl}/${igUserId}/media`,
      {
        image_url: imageUrl,
        caption,
      },
      {
        params: { access_token: accessToken },
      },
    );

    return { containerId: response.data.id };
  }

  /**
   * 建立影片 Media Container
   */
  async createVideoContainer(
    igUserId: string,
    accessToken: string,
    videoUrl: string,
    caption: string,
  ): Promise<{ containerId: string }> {
    const response = await axios.post(
      `${this.graphApiUrl}/${igUserId}/media`,
      {
        media_type: 'VIDEO',
        video_url: videoUrl,
        caption,
      },
      {
        params: { access_token: accessToken },
      },
    );

    return { containerId: response.data.id };
  }

  /**
   * 建立輪播圖（Carousel）Container
   */
  async createCarouselContainer(
    igUserId: string,
    accessToken: string,
    children: string[], // 子媒體 ID 列表
    caption: string,
  ): Promise<{ containerId: string }> {
    const response = await axios.post(
      `${this.graphApiUrl}/${igUserId}/media`,
      {
        media_type: 'CAROUSEL',
        children,
        caption,
      },
      {
        params: { access_token: accessToken },
      },
    );

    return { containerId: response.data.id };
  }

  /**
   * 釋出 Media Container
   */
  async publishMedia(
    igUserId: string,
    accessToken: string,
    containerId: string,
  ): Promise<InstagramPublishResult> {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${igUserId}/media_publish`,
        {
          creation_id: containerId,
        },
        {
          params: { access_token: accessToken },
        },
      );

      const mediaId = response.data.id;
      return {
        mediaId,
        // Instagram 的帖子 URL 需要使用者名稱，這裡先返回 ID
        url: `https://www.instagram.com/p/${mediaId}/`,
      };
    } catch (error) {
      this.logger.error('Instagram publish error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * 檢查 Container 狀態
   * Instagram 的影片容器需要等待處理完成
   */
  async checkContainerStatus(
    containerId: string,
    accessToken: string,
  ): Promise<{ status: string; statusCode?: string }> {
    const response = await axios.get(
      `${this.graphApiUrl}/${containerId}`,
      {
        params: {
          fields: 'status_code',
          access_token: accessToken,
        },
      },
    );

    return {
      status: response.data.status_code === 'FINISHED' ? 'ready' : 'processing',
      statusCode: response.data.status_code,
    };
  }

  /**
   * 釋出圖片貼文
   */
  async publishImagePost(
    igUserId: string,
    accessToken: string,
    imageUrl: string,
    caption: string,
  ): Promise<InstagramPublishResult> {
    try {
      // Step 1: 建立容器
      const { containerId } = await this.createImageContainer(
        igUserId,
        accessToken,
        imageUrl,
        caption,
      );

      // Step 2: 釋出容器
      return await this.publishMedia(igUserId, accessToken, containerId);
    } catch (error) {
      this.logger.error('Instagram image post error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * 釋出留言
   */
  async publishComment(
    mediaId: string,
    accessToken: string,
    message: string,
  ): Promise<{ commentId?: string; error?: string }> {
    try {
      const response = await axios.post(
        `${this.graphApiUrl}/${mediaId}/comments`,
        { message },
        {
          params: { access_token: accessToken },
        },
      );

      return { commentId: response.data.id };
    } catch (error) {
      this.logger.error('Instagram comment error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }
}
