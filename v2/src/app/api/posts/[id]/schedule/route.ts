import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-wrapper';
import prisma from '@/lib/db';

export const PUT = withApiHandler('api', async (request, { params, userId }) => {
  const { id } = params;

  const body = await request.json();
  const { scheduledAt } = body;

  if (!scheduledAt) {
    return NextResponse.json({ error: 'scheduledAt is required' }, { status: 400 });
  }

  const scheduledDate = new Date(scheduledAt);
  if (scheduledDate <= new Date()) {
    return NextResponse.json({ error: 'scheduledAt must be in the future' }, { status: 400 });
  }

  const post = await prisma.post.findFirst({
    where: { id, userId },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status !== 'draft' && post.status !== 'scheduled') {
    return NextResponse.json({ error: 'Cannot schedule a post that is already published or publishing' }, { status: 400 });
  }

  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      scheduledAt: scheduledDate,
      status: 'scheduled',
    },
  });

  return NextResponse.json(updatedPost);
});

export const DELETE = withApiHandler('api', async (request, { params, userId }) => {
  const { id } = params;

  const post = await prisma.post.findFirst({
    where: { id, userId },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status !== 'scheduled') {
    return NextResponse.json({ error: 'Post is not scheduled' }, { status: 400 });
  }

  const updatedPost = await prisma.post.update({
    where: { id },
    data: {
      scheduledAt: null,
      status: 'draft',
    },
  });

  return NextResponse.json(updatedPost);
});

