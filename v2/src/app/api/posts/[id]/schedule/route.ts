import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
    where: { id: params.id, userId },
  });

  if (!post) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 });
  }

  if (post.status !== 'draft' && post.status !== 'scheduled') {
    return NextResponse.json({ error: 'Cannot schedule a post that is already published or publishing' }, { status: 400 });
  }

  const updatedPost = await prisma.post.update({
    where: { id: params.id },
    data: {
      scheduledAt: scheduledDate,
      status: 'scheduled',
    },
  });

  return NextResponse.json(updatedPost);
}

export async function DELETE(
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

  if (post.status !== 'scheduled') {
    return NextResponse.json({ error: 'Post is not scheduled' }, { status: 400 });
  }

  const updatedPost = await prisma.post.update({
    where: { id: params.id },
    data: {
      scheduledAt: null,
      status: 'draft',
    },
  });

  return NextResponse.json(updatedPost);
}
