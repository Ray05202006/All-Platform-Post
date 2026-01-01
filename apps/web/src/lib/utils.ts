import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * Safely extracts filename from a URL
 * @param url - The URL to extract filename from
 * @returns The filename or empty string if extraction fails
 */
export function extractFilenameFromUrl(url: string): string {
  try {
    // Try URL parsing first
    if (typeof window !== 'undefined') {
      const urlObj = new URL(url, window.location.origin);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      return parts[parts.length - 1] || '';
    }
    // Fallback to simple string split
    const parts = url.split('/');
    return parts[parts.length - 1] || '';
  } catch {
    // Fallback to simple string split
    const parts = url.split('/');
    return parts[parts.length - 1] || '';
  }
}

/**
 * Type guard for post result objects
 */
export interface PostResult {
  postId?: string;
  error?: string;
  [key: string]: any;
}

/**
 * Checks if a post result has an error
 */
export function hasResultError(result: unknown): result is PostResult {
  return typeof result === 'object' && result !== null && 'error' in result;
}

/**
 * Gets the error message from a post result
 */
export function getResultError(result: unknown): string | null {
  if (hasResultError(result)) {
    return result.error || null;
  }
  return null;
}

/**
 * Gets the post ID from a post result
 */
export function getResultPostId(result: unknown): string | null {
  if (typeof result === 'object' && result !== null && 'postId' in result) {
    return (result as PostResult).postId || null;
  }
  return null;
}
