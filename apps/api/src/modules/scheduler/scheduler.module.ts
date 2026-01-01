import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { PostProcessor } from './processors/post.processor';
import { CleanupService } from './cleanup.service';
import { PostModule } from '../post/post.module';
import { PostService } from '../post/post.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'scheduled-posts',
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    PostModule,
  ],
  controllers: [SchedulerController],
  providers: [SchedulerService, PostProcessor, CleanupService],
  exports: [SchedulerService],
})
export class SchedulerModule implements OnModuleInit {
  constructor(
    private schedulerService: SchedulerService,
    private postService: PostService,
  ) {}

  onModuleInit() {
    // 将 SchedulerService 注入到 PostService（避免循环依赖）
    this.postService.setSchedulerService(this.schedulerService);
  }
}
