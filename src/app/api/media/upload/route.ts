import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { uploadToBlob } from '@/lib/storage';
import { randomUUID } from 'crypto';
import { logger } from '@/lib/logger';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4'];

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file') as File | null;

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large (max 10MB)' }, { status: 400 });
  }

  const ext = file.name.split('.').pop() || 'bin';
  const filename = `${userId}/${randomUUID()}.${ext}`;

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await uploadToBlob(buffer, filename, file.type);

    await logger.info('api', `Media file uploaded successfully: ${filename}`, {
      userId,
      context: { filename, url },
    });

    return NextResponse.json({ url, filename }, { status: 201 });
  } catch (error: any) {
    await logger.error('api', `Media upload failed: ${error.message}`, {
      userId,
      error,
      context: { filename },
    });
    return NextResponse.json({ error: `Upload failed: ${error.message}` }, { status: 500 });
  }
}

