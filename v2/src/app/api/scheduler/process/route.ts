import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { publishToMultiplePlatforms } from '@/lib/publisher';

export async function POST(request: Request) {
  // Protect with API key
  const apiKey = request.headers.get('x-scheduler-api-key');
  if (!apiKey || apiKey !== process.env.SCHEDULER_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const duePosts = await prisma.post.findMany({
    where: {
      status: 'scheduled',
      scheduledAt: { lte: new Date() },
    },
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
      await prisma.post.update({
        where: { id: post.id },
        data: {
          status: 'failed',
          results: { error: error.message },
        },
      });
    }
  }

  return NextResponse.json({ processed, total: duePosts.length });
}
