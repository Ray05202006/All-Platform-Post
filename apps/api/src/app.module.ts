import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostModule } from './modules/post/post.module';
import { PlatformModule } from './modules/platform/platform.module';

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

    // Prisma
    PrismaModule,

    // Auth (OAuth for Facebook, Twitter, Instagram, Threads)
    AuthModule,

    // Post management
    PostModule,

    // Platform API integrations
    PlatformModule,

    // Future modules will be added here
    // MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
