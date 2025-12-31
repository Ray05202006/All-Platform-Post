import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PostService } from '../../post/post.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ScheduledPostJob } from '../scheduler.service';

@Processor('scheduled-posts')
export class PostProcessor extends WorkerHost {
  private readonly logger = new Logger(PostProcessor.name);

  constructor(
    private postService: PostService,
    private prisma: PrismaService,
  ) {
    super();
  }

  /**
   * 处理排程发布任务
   */
  async process(job: Job<ScheduledPostJob>): Promise<any> {
    const { postId, userId } = job.data;

    this.logger.log(`Processing scheduled post ${postId} (attempt ${job.attemptsMade + 1})`);

    try {
      // 检查贴文是否仍然存在且状态正确
      const post = await this.prisma.post.findFirst({
        where: { id: postId, userId },
      });

      if (!post) {
        this.logger.warn(`Post ${postId} not found, skipping`);
        return { success: false, reason: 'Post not found' };
      }

      if (post.status !== 'scheduled') {
        this.logger.warn(`Post ${postId} status is ${post.status}, skipping`);
        return { success: false, reason: `Invalid status: ${post.status}` };
      }

      // 执行发布
      const result = await this.postService.publishPost(userId, postId);

      this.logger.log(`Successfully published scheduled post ${postId}`);

      return {
        success: true,
        postId,
        publishedAt: result.publishedAt,
        results: result.results,
      };
    } catch (error) {
      this.logger.error(`Failed to publish scheduled post ${postId}:`, error);

      // 如果是最后一次尝试，更新状态为失败
      if (job.attemptsMade >= (job.opts.attempts || 3) - 1) {
        await this.prisma.post.update({
          where: { id: postId },
          data: {
            status: 'failed',
            results: { error: error.message },
          },
        });
      }

      throw error; // 抛出错误以触发重试
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<ScheduledPostJob>) {
    this.logger.log(`Job ${job.id} completed for post ${job.data.postId}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<ScheduledPostJob>, error: Error) {
    this.logger.error(`Job ${job.id} failed for post ${job.data.postId}: ${error.message}`);
  }

  @OnWorkerEvent('active')
  onActive(job: Job<ScheduledPostJob>) {
    this.logger.log(`Job ${job.id} started processing for post ${job.data.postId}`);
  }
}
