import { Module, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostModule } from './modules/post/post.module';
import { PlatformModule } from './modules/platform/platform.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { SchedulerService } from './modules/scheduler/scheduler.service';
import { MediaModule } from './modules/media/media.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Scheduling
    ScheduleModule.forRoot(),

    // BullMQ (Task Queue)
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),

    // Static files (uploads)
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    // Prisma
    PrismaModule,

    // Auth (OAuth for Facebook, Twitter, Instagram, Threads)
    AuthModule,

    // Post management
    PostModule,

    // Platform API integrations
    PlatformModule,

    // Scheduler (BullMQ job queue)
    SchedulerModule,

    // Media upload and processing
    MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements OnApplicationBootstrap {
  constructor(private schedulerService: SchedulerService) {}

  async onApplicationBootstrap() {
    // 系统启动时恢复未执行的排程任务（在所有模块初始化后）
    await this.schedulerService.restoreScheduledPosts();
  }
}
