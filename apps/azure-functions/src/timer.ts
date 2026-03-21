import { app, InvocationContext, Timer } from '@azure/functions';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from '../../api/src/app.module';
import { SchedulerService } from '../../api/src/modules/scheduler/scheduler.service';
import { PostService } from '../../api/src/modules/post/post.service';

let nestApp: any = null;

async function getNestApp() {
  if (nestApp) return nestApp;
  const expressApp = express();
  const adapter = new ExpressAdapter(expressApp);
  nestApp = await NestFactory.create(AppModule, adapter, { logger: ['error', 'warn'] });
  await nestApp.init();
  return nestApp;
}

// Timer Trigger — runs every minute: "0 * * * * *"
app.timer('scheduled-posts-processor', {
  schedule: '0 * * * * *', // every minute
  handler: async (timer: Timer, context: InvocationContext) => {
    context.log('Timer trigger: processing due scheduled posts');

    try {
      const app = await getNestApp();
      const schedulerService = app.get(SchedulerService);
      const postService = app.get(PostService);

      await schedulerService.processDuePosts(
        (userId: string, postId: string) => postService.publishPost(userId, postId)
      );

      context.log('Timer trigger: done');
    } catch (error) {
      context.error('Timer trigger error:', error);
      throw error;
    }
  },
});
