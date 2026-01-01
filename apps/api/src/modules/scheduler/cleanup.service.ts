import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SchedulerService } from './scheduler.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    private prisma: PrismaService,
    private schedulerService: SchedulerService,
    private configService: ConfigService,
  ) {}

  /**
   * 每天凌晨 3 点清理旧贴文
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async cleanupOldPosts() {
    this.logger.log('Running daily cleanup of old posts...');

    // 删除指定天数前的已发布贴文（默认 90 天，可通过环境变量配置）
    const retentionDays = this.configService.get<number>('CLEANUP_POSTS_RETENTION_DAYS', 90);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.post.deleteMany({
      where: {
        status: 'published',
        publishedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Deleted ${result.count} old published posts (retention: ${retentionDays} days)`);
  }

  /**
   * 每小时清理失败的任务
   */
  @Cron(CronExpression.EVERY_HOUR)
  async cleanupFailedJobs() {
    this.logger.log('Running hourly cleanup of failed jobs...');

    // 删除指定小时前的失败任务（默认 24 小时，可通过环境变量配置）
    const retentionHours = this.configService.get<number>('CLEANUP_FAILED_JOBS_RETENTION_HOURS', 24);
    const cleaned = await this.schedulerService.cleanupFailedJobs(
      retentionHours * 60 * 60 * 1000,
    );

    this.logger.log(`Cleaned ${cleaned} failed jobs (retention: ${retentionHours} hours)`);
  }

  /**
   * 每小时清理过期的发布日志
   */
  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async cleanupOldLogs() {
    this.logger.log('Running daily cleanup of old publish logs...');

    // 删除指定天数前的发布日志（默认 30 天，可通过环境变量配置）
    const retentionDays = this.configService.get<number>('CLEANUP_LOGS_RETENTION_DAYS', 30);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await this.prisma.publishLog.deleteMany({
      where: {
        publishedAt: { lt: cutoffDate },
      },
    });

    this.logger.log(`Deleted ${result.count} old publish logs (retention: ${retentionDays} days)`);
  }

  /**
   * 每分钟检查过期的排程（安全网）
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async checkExpiredSchedules() {
    // 查找状态为 scheduled 但排程时间已过的贴文
    // 使用30分钟缓冲避免暂时性故障导致误报
    const expiredPosts = await this.prisma.post.findMany({
      where: {
        status: 'scheduled',
        scheduledAt: {
          lt: new Date(Date.now() - 30 * 60 * 1000), // 30 分钟前
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
