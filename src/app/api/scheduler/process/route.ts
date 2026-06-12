import { NextResponse } from 'next/server';
import * as crypto from "crypto";
import prisma from '@/lib/db';
import { publishToMultiplePlatforms } from '@/lib/publisher';
import redis from '@/lib/redis';
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

  // Acquire a lock to prevent concurrent executions of the scheduler process
  let hasLock = false;
  const lockKey = 'scheduler:lock';
  const lockValue = crypto.randomUUID();
  const lockTimeoutSeconds = 55; // Timer runs every 60 seconds

  if (redis) {
    try {
      const acquired = await redis.set(lockKey, lockValue, {
        nx: true,
        ex: lockTimeoutSeconds,
      });

      if (!acquired) {
        await logger.warn('scheduler', 'Another scheduler instance is already running. Skipping execution.', {
          context: { reason: 'Lock acquisition failed' },
        });
        return NextResponse.json({ message: 'Another scheduler process is already running', skipped: true });
      }
      hasLock = true;
    } catch (redisError: any) {
      await logger.error('scheduler', `Failed to acquire lock from Redis: ${redisError.message}. Proceeding without lock.`, {
        error: redisError,
      });
    }
  }

  try {
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
  } finally {
    // Release the lock if we acquired it
    if (hasLock && redis) {
      try {
        const currentLock = await redis.get(lockKey);
        if (currentLock === lockValue) {
          await redis.del(lockKey);
        }
      } catch (redisError: any) {
        await logger.error('scheduler', `Failed to release lock in Redis: ${redisError.message}`, {
          error: redisError,
        });
      }
    }
  }
}

