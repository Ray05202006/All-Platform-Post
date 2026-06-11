import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const envKeys = Object.keys(process.env);
    return NextResponse.json({
      success: true,
      hasConnectionString: !!process.env.AZURE_STORAGE_CONNECTION_STRING,
      hasDbUrl: !!process.env.DATABASE_URL,
      connectionStringLength: process.env.AZURE_STORAGE_CONNECTION_STRING?.length || 0,
      envKeys: envKeys.sort(),
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
