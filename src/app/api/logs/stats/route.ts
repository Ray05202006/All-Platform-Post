import { NextResponse } from 'next/server';
import { withApiHandler } from '@/lib/api-wrapper';
import prisma from '@/lib/db';

export const GET = withApiHandler('api', async (_request, { userId: _userId }) => {
  // 1. Get counts by level
  const levelCounts = await prisma.systemLog.groupBy({
    by: ['level'],
    _count: { _all: true },
  });

  const levelStats = {
    info: levelCounts.find(c => c.level === 'info')?._count._all || 0,
    warn: levelCounts.find(c => c.level === 'warn')?._count._all || 0,
    error: levelCounts.find(c => c.level === 'error')?._count._all || 0,
  };

  // 2. Get counts by category
  const categoryCounts = await prisma.systemLog.groupBy({
    by: ['category'],
    _count: { _all: true },
  });

  const categoryStats = categoryCounts.reduce((acc, curr) => {
    acc[curr.category] = curr._count._all;
    return acc;
  }, {} as Record<string, number>);

  // 3. Get recent 5 errors
  const recentErrors = await prisma.systemLog.findMany({
    where: { level: 'error' },
    orderBy: { timestamp: 'desc' },
    take: 5,
  });

  // 4. Get log count grouped by day for the last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const dailyLogs = await prisma.systemLog.findMany({
    where: {
      timestamp: { gte: sevenDaysAgo },
    },
    select: {
      timestamp: true,
      level: true,
    },
    orderBy: { timestamp: 'asc' },
  });

  const dailyStats: Record<string, { info: number; warn: number; error: number }> = {};
  
  // Initialize last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    dailyStats[dateStr] = { info: 0, warn: 0, error: 0 };
  }

  // Populate counts
  for (const log of dailyLogs) {
    const dateStr = log.timestamp.toISOString().split('T')[0];
    if (dailyStats[dateStr] && (log.level === 'info' || log.level === 'warn' || log.level === 'error')) {
      dailyStats[dateStr][log.level]++;
    }
  }

  const chartData = Object.entries(dailyStats).map(([date, counts]) => ({
    date,
    ...counts,
  }));

  return NextResponse.json({
    levelStats,
    categoryStats,
    recentErrors,
    chartData,
  });
});
