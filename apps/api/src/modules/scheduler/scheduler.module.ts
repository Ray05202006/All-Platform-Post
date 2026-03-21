import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { PostModule } from '../post/post.module';
import { PostService } from '../post/post.service';

@Module({
  imports: [PostModule],
  controllers: [SchedulerController],
  providers: [SchedulerService],
  exports: [SchedulerService],
})
export class SchedulerModule {
  constructor(
    private schedulerService: SchedulerService,
    private postService: PostService,
  ) {}

  onModuleInit() {
    // Inject SchedulerService into PostService (avoid circular dependency)
    this.postService.setSchedulerService(this.schedulerService);
  }
}
