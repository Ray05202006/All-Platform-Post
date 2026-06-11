import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

const handler = async (req: Request, context: any) => {
  const host = req.headers.get('host');
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  if (host) {
    process.env.NEXTAUTH_URL = `${proto}://${host}`;
  }
  return NextAuth(authOptions)(req, context);
};

export { handler as GET, handler as POST };
