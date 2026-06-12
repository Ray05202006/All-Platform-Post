import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-wrapper';
import prisma from '@/lib/db';
import type { Platform } from '@/lib/types';
import { signUrl } from '@/lib/storage';

const VALID_PLATFORMS: Platform[] = ['facebook', 'instagram', 'twitter', 'threads'];

export const POST = withApiHandler('api', async (request, { userId }) => {
  const body = await request.json();
  const { content, platforms, mediaUrls, mediaType, scheduledAt } = body;

  // Validation
  const isScheduled = !!scheduledAt;

  if (isScheduled) {
    if ((!content || typeof content !== 'string' || content.trim() === '') && (!mediaUrls || mediaUrls.length === 0)) {
      return NextResponse.json({ error: 'Content or media is required for scheduled posts' }, { status: 400 });
    }

    if (!Array.isArray(platforms) || platforms.length === 0) {
      return NextResponse.json({ error: 'At least one platform is required for scheduled posts' }, { status: 400 });
    }
  } else {
    if (content !== undefined && typeof content !== 'string') {
      return NextResponse.json({ error: 'Content must be a string' }, { status: 400 });
    }
    if (platforms !== undefined && !Array.isArray(platforms)) {
      return NextResponse.json({ error: 'Platforms must be an array' }, { status: 400 });
    }
  }

  if (Array.isArray(platforms) && platforms.length > 0) {
    const invalidPlatforms = platforms.filter((p: string) => !VALID_PLATFORMS.includes(p as Platform));
    if (invalidPlatforms.length > 0) {
      return NextResponse.json({ error: `Invalid platforms: ${invalidPlatforms.join(', ')}` }, { status: 400 });
    }
  }

  const parsedScheduledAt = scheduledAt ? new Date(scheduledAt) : null;

  const post = await prisma.post.create({
    data: {
      userId: userId!,
      content: content || '',
      platforms: platforms || [],
      mediaUrls: mediaUrls || [],
      mediaType: mediaType || null,
      scheduledAt: parsedScheduledAt,
      status: parsedScheduledAt ? 'scheduled' : 'draft',
    },
  });

  return NextResponse.json({
    ...post,
    mediaUrls: post.mediaUrls.map(url => signUrl(url)),
  }, { status: 201 });
});

export const GET = withApiHandler('api', async (request, { userId }) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  const where: any = { userId };
  if (status) where.status = status;

  const posts = await prisma.post.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });

  const signedPosts = posts.map(post => ({
    ...post,
    mediaUrls: post.mediaUrls.map(url => signUrl(url)),
  }));

  return NextResponse.json(signedPosts);
});

