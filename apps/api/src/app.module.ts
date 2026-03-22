import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PostModule } from './modules/post/post.module';
import { PlatformModule } from './modules/platform/platform.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { MediaModule } from './modules/media/media.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    // Rate limiting
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),

    // Prisma
    PrismaModule,

    // Auth (OAuth for Facebook, Twitter, Instagram, Threads)
    AuthModule,

    // Post management
    PostModule,

    // Platform API integrations
    PlatformModule,

    // Scheduler (DB-based, polled by Azure Timer Trigger)
    SchedulerModule,

    // Media upload and processing
    MediaModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
