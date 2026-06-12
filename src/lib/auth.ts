import { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import CredentialsProvider from 'next-auth/providers/credentials';
import prisma from './db';
import { verifyTurnstileToken } from './turnstile';

if (!process.env.NEXTAUTH_SECRET && process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("NEXTAUTH_SECRET must be set");
}

const isStagingOrDev =
  process.env.NEXT_PUBLIC_APP_URL?.includes('staging') ||
  process.env.NODE_ENV === 'development';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    ...(isStagingOrDev
      ? [
          CredentialsProvider({
            name: 'Staging Bypass',
            credentials: {
              email: { label: 'Email', type: 'text' },
              turnstileToken: { label: 'Turnstile Token', type: 'text' },
            },
            async authorize(credentials) {
              const email = credentials?.email || 'ray95@gmail.com';
              const turnstileToken = credentials?.turnstileToken;

              if (process.env.TURNSTILE_SECRET_KEY) {
                if (!turnstileToken) {
                  throw new Error('Turnstile token is required');
                }
                const isValid = await verifyTurnstileToken(turnstileToken);
                if (!isValid) {
                  throw new Error('Turnstile verification failed');
                }
              }

              // Upsert the user in db so they have a valid database profile
              const user = await prisma.user.upsert({
                where: { email },
                update: { name: 'Staging Tester' },
                create: { email, name: 'Staging Tester' },
              });
              return user;
            },
          }),
        ]
      : []),
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
