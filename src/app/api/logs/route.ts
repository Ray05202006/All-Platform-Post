import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-wrapper';
import prisma from '@/lib/db';

export const GET = withApiHandler('api', async (request, { userId: _userId }) => {
  const { searchParams } = new URL(request.url);
  const level = searchParams.get('level');
  const category = searchParams.get('category');
  const search = searchParams.get('search');
  const pageStr = searchParams.get('page') || '1';
  const limitStr = searchParams.get('limit') || '20';

  const page = Math.max(1, parseInt(pageStr, 10));
  const limit = Math.max(1, Math.min(100, parseInt(limitStr, 10)));
  const skip = (page - 1) * limit;

  // Build prisma where clause
  const where: any = {};
  if (level) {
    where.level = level;
  }
  if (category) {
    where.category = category;
  }
  if (search) {
    where.message = {
      contains: search,
      mode: 'insensitive', // Case-insensitive search
    };
  }

  // Fetch count and logs concurrently
  const [total, logs] = await Promise.all([
    prisma.systemLog.count({ where }),
    prisma.systemLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip,
      take: limit,
    }),
  ]);

  return NextResponse.json({
    logs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  });
});
