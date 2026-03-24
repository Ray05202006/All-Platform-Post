import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { deleteFromBlob } from '@/lib/storage';

export async function DELETE(
  request: Request,
  { params }: { params: { filename: string } },
) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const filename = decodeURIComponent(params.filename);
  await deleteFromBlob(filename);
  return NextResponse.json({ success: true });
}
