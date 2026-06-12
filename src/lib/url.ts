import { headers } from 'next/headers';

/**
 * Get the app's base URL for server-side API routes.
 *
 * IMPORTANT: Do NOT use NEXT_PUBLIC_* vars here — Next.js inlines them
 * at build time, so they reflect the build environment, not runtime.
 * Use NEXTAUTH_URL (a server-only env var set at runtime) or derive
 * the URL from request headers.
 */
export async function getAppUrl(): Promise<string> {
  // 1. Runtime-only env var (not inlined by Next.js)
  if (process.env.NEXTAUTH_URL) {
    return process.env.NEXTAUTH_URL.replace(/\/$/, '');
  }

  // 2. Fallback: derive from request headers
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}
