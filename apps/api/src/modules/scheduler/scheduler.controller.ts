import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
export class SchedulerController {
  constructor(private schedulerService: SchedulerService) {}

  /**
   * 获取所有待处理的排程任务
   */
  @Get('pending')
  async getPendingJobs() {
    const jobs = await this.schedulerService.getPendingJobs();
    return jobs.map((job) => ({
      id: job.id,
      postId: job.data.postId,
      userId: job.data.userId,
      delay: job.opts.delay,
      scheduledFor: new Date(job.timestamp + (job.opts.delay || 0)),
      attemptsMade: job.attemptsMade,
    }));
  }

  /**
   * 手动触发清理失败任务
   */
  @Get('cleanup')
  async cleanupFailedJobs() {
    const cleaned = await this.schedulerService.cleanupFailedJobs();
    return { cleaned };
  }
}
