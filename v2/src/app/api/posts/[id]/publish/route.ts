import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { publishToMultiplePlatforms } from '@/lib/publisher';

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const post = await prisma.post.findFirst({
    where: { id: params.id, userId },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status === 'published') {
    return NextResponse.json({ error: 'Post already published' }, { status: 400 });
  }

  // Set status to publishing
  await prisma.post.update({
    where: { id: params.id },
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

    const updatedPost = await prisma.post.update({
      where: { id: params.id },
      data: {
        status,
        publishedAt: failCount === 0 ? new Date() : undefined,
        results: results as any,
      },
    });

    return NextResponse.json(updatedPost);
  } catch (error: any) {
    await prisma.post.update({
      where: { id: params.id },
      data: {
        status: 'failed',
        results: { error: error.message },
      },
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
