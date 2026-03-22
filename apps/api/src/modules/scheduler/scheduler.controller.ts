import { Controller, Get } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(private schedulerService: SchedulerService) {}

  @Get('pending')
  async getPendingJobs() {
    return this.schedulerService.getPendingJobs();
  }

  @Get('cleanup')
  async cleanupFailedJobs() {
    const cleaned = await this.schedulerService.cleanupFailedJobs();
    return { cleaned };
  }
}
