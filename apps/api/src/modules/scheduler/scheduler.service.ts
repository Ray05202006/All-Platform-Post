import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ScheduledPostJob {
  postId: string;
  userId: string;
}

export interface JobStatus {
  exists: boolean;
  status?: string;
  scheduledFor?: Date;
}

export interface PendingJob {
  id: string;
  postId: string;
  userId: string;
  scheduledFor: string;
}

/**
 * DB-based scheduler — no Redis/BullMQ required.
 * Scheduling state is stored directly in the Post.status + Post.scheduledAt columns.
 * An Azure Timer Trigger polls every minute and publishes due posts.
 */
@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Schedule a post: just set scheduledAt and status in DB.
   */
  async schedulePost(postId: string, userId: string, scheduledAt: Date): Promise<void> {
    const scheduledTime = scheduledAt.getTime();
    if (Number.isNaN(scheduledTime)) {
      throw new Error('Invalid scheduled time');
    }

    const now = Date.now();
    const delay = scheduledTime - now;
    const pastToleranceMs = 5 * 60 * 1000;
    const maxFutureMs = 365 * 24 * 60 * 60 * 1000;

    if (delay < -pastToleranceMs) {
      throw new Error('Scheduled time is too far in the past. Please check your device time and timezone.');
    }

    if (delay > maxFutureMs) {
      throw new Error('Scheduled time is too far in the future.');
    }

    this.logger.log(`Scheduling post ${postId} for ${scheduledAt.toISOString()}`);

    await this.prisma.post.update({
      where: { id: postId, userId },
      data: {
        status: 'scheduled',
        scheduledAt,
      },
    });
  }

  /**
   * Cancel schedule: revert status to draft, clear scheduledAt.
   */
  async cancelSchedule(postId: string): Promise<boolean> {
    try {
      await this.prisma.post.update({
        where: { id: postId },
        data: {
          status: 'draft',
          scheduledAt: null,
        },
      });
      this.logger.log(`Cancelled scheduled post ${postId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to cancel schedule for post ${postId}:`, error);
      return false;
    }
  }

  /**
   * Reschedule: update scheduledAt.
   */
  async reschedulePost(postId: string, userId: string, newScheduledAt: Date): Promise<void> {
    return this.schedulePost(postId, userId, newScheduledAt);
  }

  /**
   * Get schedule status for a post.
   */
  async getJobStatus(postId: string): Promise<JobStatus> {
    const post = await this.prisma.post.findUnique({
      where: { id: postId },
      select: { status: true, scheduledAt: true },
    });

    if (!post || post.status !== 'scheduled') {
      return { exists: false };
    }

    return {
      exists: true,
      status: post.status,
      scheduledFor: post.scheduledAt ?? undefined,
    };
  }

  /**
   * Get all pending scheduled posts (for dashboard display).
   */
  async getPendingJobs(): Promise<PendingJob[]> {
    const posts = await this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { gt: new Date() },
      },
      select: { id: true, userId: true, scheduledAt: true },
      orderBy: { scheduledAt: 'asc' },
    });

    return posts.map((post) => ({
      id: post.id,
      postId: post.id,
      userId: post.userId,
      scheduledFor: post.scheduledAt!.toISOString(),
    }));
  }

  /**
   * Called by Azure Timer Trigger every minute.
   * Finds all due posts and publishes them.
   */
  async processDuePosts(publishPost: (userId: string, postId: string) => Promise<any>): Promise<void> {
    const duePosts = await this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: { lte: new Date() },
      },
    });

    if (duePosts.length === 0) return;

    this.logger.log(`Processing ${duePosts.length} due posts`);

    for (const post of duePosts) {
      try {
        // Mark as publishing to prevent double-processing
        await this.prisma.post.update({
          where: { id: post.id },
          data: { status: 'publishing' },
        });

        await publishPost(post.userId, post.id);
        this.logger.log(`Published scheduled post ${post.id}`);
      } catch (error) {
        this.logger.error(`Failed to publish post ${post.id}:`, error);
        await this.prisma.post.update({
          where: { id: post.id },
          data: {
            status: 'failed',
            results: { error: (error as Error).message },
          },
        });
      }
    }
  }

  /** Cleanup old failed posts (optional maintenance) */
  async cleanupFailedJobs(olderThanMs: number = 24 * 60 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanMs);
    const result = await this.prisma.post.updateMany({
      where: {
        status: 'failed',
        updatedAt: { lt: cutoff },
      },
      data: { status: 'failed' }, // no-op update just to count; real cleanup is app-specific
    });
    this.logger.log(`Found ${result.count} old failed posts`);
    return result.count;
  }
}
