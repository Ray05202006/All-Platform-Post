import { NextResponse } from 'next/server';
import { uploadToBlob } from '@/lib/storage';

export async function GET() {
  try {
    console.log('Running test_diag upload...');
    const buffer = Buffer.from('diagnostic test content');
    const filename = `diag/test-${Date.now()}.txt`;
    const url = await uploadToBlob(buffer, filename, 'text/plain');
    return NextResponse.json({ success: true, url });
  } catch (error: any) {
    console.error('test_diag upload failed:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
