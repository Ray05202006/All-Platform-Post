import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envCheck = {
    DATABASE_URL: !!process.env.DATABASE_URL,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: !!process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    ENCRYPTION_KEY: !!process.env.ENCRYPTION_KEY,
    NODE_ENV: process.env.NODE_ENV,
  };

  // Test database connection
  let dbStatus = 'untested';
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    await prisma.$connect();
    await prisma.$disconnect();
    dbStatus = 'connected';
  } catch (e: any) {
    dbStatus = `error: ${e.message}`;
  }

  return NextResponse.json({ envCheck, dbStatus });
}
