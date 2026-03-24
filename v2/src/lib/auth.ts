import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import prisma from './db';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  callbacks: {
    async signIn({ user, account, profile: _profile }) {
      if (!user.email) return false;

      // Upsert user in database
      await prisma.user.upsert({
        where: { email: user.email },
        update: {
          name: user.name,
          avatarUrl: user.image,
          provider: account?.provider,
          providerId: account?.providerAccountId,
        },
        create: {
          email: user.email,
          name: user.name,
          avatarUrl: user.image,
          provider: account?.provider,
          providerId: account?.providerAccountId,
        },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email },
        });
        if (dbUser) {
          token.userId = dbUser.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        (session.user as any).id = token.userId;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
};

/** Helper to get the authenticated user ID from a NextAuth session, or null */
export async function getSessionUserId(): Promise<string | null> {
  // This will be used in API routes with getServerSession
  return null; // Placeholder — each API route calls getServerSession(authOptions)
}
