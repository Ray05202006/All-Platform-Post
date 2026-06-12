import { NextResponse } from 'next/server';
import { previewSplit } from '@/lib/splitter';

export async function POST(request: Request) {
  const body = await request.json();
  const { content, platforms } = body;

  if (!content || typeof content !== 'string') {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return NextResponse.json({ error: 'At least one platform is required' }, { status: 400 });
  }

  const results = previewSplit(content, platforms);
  return NextResponse.json(results);
}
