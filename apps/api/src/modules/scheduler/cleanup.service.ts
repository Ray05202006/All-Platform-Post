import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulerService } from './scheduler.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private prisma: PrismaService,
    private schedulerService: SchedulerService,
  ) {}

  /**
   * 每天凌晨 3 点清理旧贴文
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldPosts() {
    this.logger.log('Running daily cleanup of old posts...');

    // 删除 90 天前的已发布贴文
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const result = await this.prisma.post.deleteMany({
      where: {
        status: 'published',
        publishedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Deleted ${result.count} old published posts`);
  }

  /**
   * 每小时清理失败的任务
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedJobs() {
    this.logger.log('Running hourly cleanup of failed jobs...');

    const cleaned = await this.schedulerService.cleanupFailedJobs(
      24 * 60 * 60 * 1000, // 24 小时前的失败任务
    );

    this.logger.log(`Cleaned ${cleaned} failed jobs`);
  }

  /**
   * 每小时清理过期的发布日志
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldLogs() {
    this.logger.log('Running daily cleanup of old publish logs...');

    // 删除 30 天前的发布日志
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const result = await this.prisma.publishLog.deleteMany({
      where: {
        publishedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Deleted ${result.count} old publish logs`);
  }

  /**
   * 每分钟检查过期的排程（安全网）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkExpiredSchedules() {
    // 查找状态为 scheduled 但排程时间已过的贴文
    const expiredPosts = await this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lt: new Date(Date.now() - 5 * 60 * 1000), // 5 分钟前
        },
      },
    });

    if (expiredPosts.length > 0) {
      this.logger.warn(`Found ${expiredPosts.length} expired scheduled posts`);

      // 标记为失败
      await this.prisma.post.updateMany({
        where: {
          id: { in: expiredPosts.map((p) => p.id) },
        },
        data: {
          status: 'failed',
          results: { error: 'Scheduled time passed without publishing' },
        },
      });
    }
  }
}
