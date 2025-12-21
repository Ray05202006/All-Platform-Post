import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './modules/prisma/prisma.module';

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

    // Future modules will be added here
    // AuthModule,
    // PostModule,
    // PlatformModule,
    // MediaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
