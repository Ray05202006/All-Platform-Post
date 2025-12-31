import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

export interface ScheduledPostJob {
  postId: string;
  userId: string;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    @InjectQueue('scheduled-posts') private postQueue: Queue<ScheduledPostJob>,
    private prisma: PrismaService,
  ) {}

  /**
   * 添加排程发布任务
   */
  async schedulePost(postId: string, userId: string, scheduledAt: Date): Promise<Job<ScheduledPostJob>> {
    const delay = scheduledAt.getTime() - Date.now();

    if (delay <= 0) {
      throw new Error('Scheduled time must be in the future');
    }

    this.logger.log(`Scheduling post ${postId} for ${scheduledAt.toISOString()} (delay: ${delay}ms)`);

    const job = await this.postQueue.add(
      'publish-post',
      { postId, userId },
      {
        delay,
        jobId: `post-${postId}`, // 使用唯一 ID 便于取消
      },
    );

    return job;
  }

  /**
   * 取消排程
   */
  async cancelSchedule(postId: string): Promise<boolean> {
    const jobId = `post-${postId}`;

    try {
      const job = await this.postQueue.getJob(jobId);
      if (job) {
        await job.remove();
        this.logger.log(`Cancelled scheduled post ${postId}`);
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(`Failed to cancel schedule for post ${postId}:`, error);
      return false;
    }
  }

  /**
   * 更新排程时间
   */
  async reschedulePost(postId: string, userId: string, newScheduledAt: Date): Promise<Job<ScheduledPostJob>> {
    // 先取消旧的排程
    await this.cancelSchedule(postId);

    // 添加新的排程
    return this.schedulePost(postId, userId, newScheduledAt);
  }

  /**
   * 获取排程任务状态
   */
  async getJobStatus(postId: string): Promise<{
    exists: boolean;
    status?: string;
    scheduledFor?: Date;
  }> {
    const jobId = `post-${postId}`;
    const job = await this.postQueue.getJob(jobId);

    if (!job) {
      return { exists: false };
    }

    const state = await job.getState();
    const delay = job.opts.delay || 0;
    const scheduledFor = new Date(job.timestamp + delay);

    return {
      exists: true,
      status: state,
      scheduledFor,
    };
  }

  /**
   * 获取所有待处理的排程任务
   */
  async getPendingJobs(): Promise<Job<ScheduledPostJob>[]> {
    return this.postQueue.getJobs(['delayed', 'waiting']);
  }

  /**
   * 系统启动时恢复未执行的排程
   */
  async restoreScheduledPosts(): Promise<void> {
    this.logger.log('Restoring scheduled posts from database...');

    // 查找所有状态为 scheduled 的贴文
    const scheduledPosts = await this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          gt: new Date(), // 只恢复未来的排程
        },
      },
    });

    for (const post of scheduledPosts) {
      try {
        // 检查任务是否已存在
        const existingJob = await this.postQueue.getJob(`post-${post.id}`);
        if (!existingJob) {
          await this.schedulePost(post.id, post.userId, post.scheduledAt!);
          this.logger.log(`Restored scheduled post ${post.id}`);
        }
      } catch (error) {
        this.logger.error(`Failed to restore scheduled post ${post.id}:`, error);
      }
    }

    this.logger.log(`Restored ${scheduledPosts.length} scheduled posts`);
  }

  /**
   * 清理过期的失败任务
   */
  async cleanupFailedJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cleaned = await this.postQueue.clean(olderThanMs, 100, 'failed');
    this.logger.log(`Cleaned ${cleaned.length} failed jobs`);
    return cleaned.length;
  }
}
