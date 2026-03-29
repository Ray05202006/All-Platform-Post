import { headers } from 'next/headers';

/**
 * Get the app's base URL for server-side API routes.
 * Tries env vars first, then falls back to request headers.
 */
export async function getAppUrl(): Promise<string> {
  // Try environment variables
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL;
  if (envUrl) return envUrl.replace(/\/$/, '');

  // Fallback: derive from request headers
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}
