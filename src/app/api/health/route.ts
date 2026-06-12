import { NextResponse } from 'next/server';
import { PrismaClient } from '@/generated/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    FACEBOOK_APP_ID: !!process.env.FACEBOOK_APP_ID,
    FACEBOOK_APP_SECRET: !!process.env.FACEBOOK_APP_SECRET,
    TWITTER_CLIENT_ID: !!process.env.TWITTER_CLIENT_ID,
    TWITTER_CLIENT_SECRET: !!process.env.TWITTER_CLIENT_SECRET,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    NODE_ENV: process.env.NODE_ENV,
  };

  let dbStatus = 'untested';
  try {
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$disconnect();
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  return NextResponse.json({ envCheck, dbStatus });
}
