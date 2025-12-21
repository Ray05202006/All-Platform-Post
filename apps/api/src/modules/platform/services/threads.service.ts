import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface ThreadsPublishResult {
  threadId?: string;
  url?: string;
  error?: string;
}

/**
 * Threads API 服务
 * 文档: https://developers.facebook.com/docs/threads
 */
@Injectable()
export class ThreadsService {
  private readonly apiUrl = 'https://graph.threads.net/v1.0';

  /**
   * 创建文字 Thread
   */
  async createTextThread(
    userId: string,
    accessToken: string,
    text: string,
    replyToId?: string,
  ): Promise<{ containerId: string }> {
    const body: any = {
      media_type: 'TEXT',
      text,
    };

    if (replyToId) {
      body.reply_to_id = replyToId;
    }

    const response = await axios.post(
      `${this.apiUrl}/${userId}/threads`,
      body,
      {
        params: { access_token: accessToken },
      },
    );

    return { containerId: response.data.id };
  }

  /**
   * 创建图片 Thread
   */
  async createImageThread(
    userId: string,
    accessToken: string,
    text: string,
    imageUrl: string,
  ): Promise<{ containerId: string }> {
    const response = await axios.post(
      `${this.apiUrl}/${userId}/threads`,
      {
        media_type: 'IMAGE',
        image_url: imageUrl,
        text,
      },
      {
        params: { access_token: accessToken },
      },
    );

    return { containerId: response.data.id };
  }

  /**
   * 发布 Thread Container
   */
  async publishThread(
    userId: string,
    accessToken: string,
    containerId: string,
  ): Promise<ThreadsPublishResult> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/${userId}/threads_publish`,
        {
          creation_id: containerId,
        },
        {
          params: { access_token: accessToken },
        },
      );

      const threadId = response.data.id;
      return {
        threadId,
        url: `https://www.threads.net/t/${threadId}`,
      };
    } catch (error) {
      console.error('Threads publish error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * 发布文字贴文
   */
  async publishTextPost(
    userId: string,
    accessToken: string,
    text: string,
  ): Promise<ThreadsPublishResult> {
    try {
      // Step 1: 创建容器
      const { containerId } = await this.createTextThread(
        userId,
        accessToken,
        text,
      );

      // Step 2: 发布容器
      return await this.publishThread(userId, accessToken, containerId);
    } catch (error) {
      console.error('Threads text post error:', error.response?.data);
      return {
        error: error.response?.data?.error?.message || error.message,
      };
    }
  }

  /**
   * 发布串文（回复自己形成串联）
   */
  async publishThreadChain(
    userId: string,
    accessToken: string,
    texts: string[],
  ): Promise<ThreadsPublishResult[]> {
    const results: ThreadsPublishResult[] = [];
    let previousThreadId: string | undefined;

    for (const text of texts) {
      try {
        // 创建容器（可能是回复）
        const { containerId } = await this.createTextThread(
          userId,
          accessToken,
          text,
          previousThreadId,
        );

        // 发布
        const result = await this.publishThread(userId, accessToken, containerId);
        results.push(result);

        if (result.error) {
          break;
        }

        previousThreadId = result.threadId;

        // 添加延迟避免速率限制
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({
          error: error.message,
        });
        break;
      }
    }

    return results;
  }

  /**
   * 获取用户资料
   */
  async getUserProfile(accessToken: string): Promise<{
    id: string;
    username: string;
    threadsProfilePictureUrl?: string;
  }> {
    const response = await axios.get(`${this.apiUrl}/me`, {
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
