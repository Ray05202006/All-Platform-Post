import { NextResponse } from 'next/server';
import * as crypto from "crypto";
import prisma from '@/lib/db';
import { publishToMultiplePlatforms } from '@/lib/publisher';

import { logger } from '@/lib/logger';

export async function POST(request: Request) {
  // Protect with API key
  const apiKey = request.headers.get('x-scheduler-api-key');
  const expectedKey = process.env.SCHEDULER_API_KEY;
  if (
    !apiKey ||
    !expectedKey ||
    apiKey.length !== expectedKey.length ||
    !crypto.timingSafeEqual(Buffer.from(apiKey), Buffer.from(expectedKey))
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const duePosts = await prisma.post.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() },
    },
  });

  await logger.info('scheduler', 'Scheduler process initiated.', {
    context: { dueCount: duePosts.length },
  });

  if (duePosts.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  let processed = 0;

  for (const post of duePosts) {
    try {
      // Atomically set to publishing to prevent double-processing
      await prisma.post.update({
        where: { id: post.id },
        data: { status: 'publishing' },
      });

      const results = await publishToMultiplePlatforms(
        post.userId,
        post.content,
        post.platforms,
        post.mediaUrls,
        post.mediaType,
      );

      const successCount = Object.values(results).filter((r) => !r.error).length;
      const failCount = Object.values(results).filter((r) => r.error).length;
      const status = failCount === 0 ? 'published' : successCount === 0 ? 'failed' : 'partial';

      if (status === 'published') {
        await logger.info('scheduler', `Scheduled post ${post.id} published successfully to all platforms: ${post.platforms.join(', ')}`, {
          userId: post.userId,
          context: { postId: post.id, platforms: post.platforms, results },
        });
      } else if (status === 'partial') {
        await logger.warn('scheduler', `Scheduled post ${post.id} published with partial success to platforms: ${post.platforms.join(', ')}`, {
          userId: post.userId,
          context: { postId: post.id, platforms: post.platforms, results },
        });
      } else {
        await logger.error('scheduler', `Scheduled post ${post.id} failed to publish to all platforms: ${post.platforms.join(', ')}`, {
          userId: post.userId,
          error: new Error(`Publish failed: ${JSON.stringify(results)}`),
          context: { postId: post.id, platforms: post.platforms, results },
        });
      }

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status,
          publishedAt: failCount === 0 ? new Date() : undefined,
          results: results as any,
        },
      });

      processed++;
    } catch (error: any) {
      await logger.error('scheduler', `Scheduler failed to process post ${post.id}: ${error.message}`, {
        userId: post.userId,
        error,
        context: { postId: post.id },
      });

      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'failed',
          results: { error: error.message },
        },
      });
    }
  }

  await logger.info('scheduler', `Scheduler process completed. Processed ${processed}/${duePosts.length} posts.`, {
    context: { processed, total: duePosts.length },
  });

  return NextResponse.json({ processed, total: duePosts.length });
}
