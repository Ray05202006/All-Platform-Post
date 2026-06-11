import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { publishToMultiplePlatforms } from '@/lib/publisher';

import { logger } from '@/lib/logger';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  const post = await prisma.post.findFirst({
    where: { id, userId },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status === 'published') {
    return NextResponse.json({ error: 'Post already published' }, { status: 400 });
  }

  // Set status to publishing
  await prisma.post.update({
    where: { id },
    data: { status: 'publishing' },
  });

  try {
    const results = await publishToMultiplePlatforms(
      userId,
      post.content,
      post.platforms,
      post.mediaUrls,
      post.mediaType,
    );

    const successCount = Object.values(results).filter((r) => !r.error).length;
    const failCount = Object.values(results).filter((r) => r.error).length;
    const status = failCount === 0 ? 'published' : successCount === 0 ? 'failed' : 'partial';

    if (status === 'published') {
      await logger.info('publisher', `Post ${id} published successfully to all platforms: ${post.platforms.join(', ')}`, {
        userId,
        context: { postId: id, platforms: post.platforms, results },
      });
    } else if (status === 'partial') {
      await logger.warn('publisher', `Post ${id} published with partial success to platforms: ${post.platforms.join(', ')}`, {
        userId,
        context: { postId: id, platforms: post.platforms, results },
      });
    } else {
      await logger.error('publisher', `Post ${id} failed to publish to all platforms: ${post.platforms.join(', ')}`, {
        userId,
        error: new Error(`Publish failed: ${JSON.stringify(results)}`),
        context: { postId: id, platforms: post.platforms, results },
      });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status,
        publishedAt: failCount === 0 ? new Date() : undefined,
        results: results as any,
      },
    });

    return NextResponse.json(updatedPost);
  } catch (error: any) {
    await logger.error('publisher', `Post ${id} publishing process crashed: ${error.message}`, {
      userId,
      error,
      context: { postId: id },
    });

    await prisma.post.update({
      where: { id },
      data: {
        status: 'failed',
        results: { error: error.message },
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
