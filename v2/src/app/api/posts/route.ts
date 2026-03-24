import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import type { Platform } from '@/lib/types';

const VALID_PLATFORMS: Platform[] = ['facebook', 'instagram', 'twitter', 'threads'];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { content, platforms, mediaUrls, mediaType, scheduledAt } = body;

  // Validation
  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 });
  }

  const invalidPlatforms = platforms.filter((p: string) => !VALID_PLATFORMS.includes(p as Platform));
  if (invalidPlatforms.length > 0) {
    return NextResponse.json({ error: `Invalid platforms: ${invalidPlatforms.join(', ')}` }, { status: 400 });
  }

  const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;

  const post = await prisma.post.create({
    data: {
      userId,
      content,
      platforms,
      mediaUrls: mediaUrls || [],
      mediaType: mediaType || null,
      scheduledAt: parsedScheduledAt,
      status: parsedScheduledAt ? 'scheduled' : 'draft',
    },
  });

  return NextResponse.json(post, { status: 201 });
}

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: any = { userId };
  if (status) where.status = status;

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(posts);
}
