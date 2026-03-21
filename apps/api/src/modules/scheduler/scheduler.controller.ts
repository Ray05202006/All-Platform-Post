import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
@UseGuards(JwtAuthGuard)
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
