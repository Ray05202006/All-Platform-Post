import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-wrapper';
import prisma from '@/lib/db';
import { signUrl } from '@/lib/storage';

export const GET = withApiHandler('api', async (request, { params, userId }) => {
  const { id } = params;

  const post = await prisma.post.findFirst({
    where: { id, userId },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  return NextResponse.json({
    ...post,
    mediaUrls: post.mediaUrls.map(url => signUrl(url)),
  });
});

export const DELETE = withApiHandler('api', async (request, { params, userId }) => {
  const { id } = params;

  const post = await prisma.post.findFirst({
    where: { id, userId },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status === 'published') {
    return NextResponse.json({ error: 'Cannot delete published post' }, { status: 400 });
  }

  await prisma.post.delete({ where: { id } });
  return NextResponse.json({ success: true });
});

