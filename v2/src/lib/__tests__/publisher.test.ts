import { describe, it, expect, vi, beforeEach } from 'vitest';
import { publishToMultiplePlatforms } from '../publisher';
import prisma from '@/lib/db';
import * as threads from '@/lib/platforms/threads';

vi.mock('@/lib/db', () => ({
  default: {
    platformConnection: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock('@/lib/encryption', () => ({
  decrypt: vi.fn((val) => val),
  encrypt: vi.fn((val) => val),
}));

vi.mock('@/lib/storage', () => ({
  signUrl: vi.fn((url) => `${url}?signed=true`),
}));

vi.mock('@/lib/platforms/facebook');
vi.mock('@/lib/platforms/twitter');
vi.mock('@/lib/platforms/threads');
vi.mock('@/lib/platforms/instagram');

const mockFindFirst = vi.mocked(prisma.platformConnection.findFirst);

describe('Publisher service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('publishes to Threads with text', async () => {
    mockFindFirst.mockResolvedValue({
      platformUserId: 'threads_user_123',
      accessToken: 'encrypted_token',
      tokenExpiresAt: null,
    } as any);

    vi.mocked(threads.publishTextPost).mockResolvedValue({ postId: 'th123', url: 'https://threads.net/t/th123' });

    const results = await publishToMultiplePlatforms('user123', 'Hello Threads', ['threads']);
    expect(results.threads).toEqual({ postId: 'th123', url: 'https://threads.net/t/th123' });
    expect(threads.publishTextPost).toHaveBeenCalledWith('threads_user_123', 'encrypted_token', 'Hello Threads');
  });

  it('publishes to Threads with image', async () => {
    mockFindFirst.mockResolvedValue({
      platformUserId: 'threads_user_123',
      accessToken: 'encrypted_token',
      tokenExpiresAt: null,
    } as any);

    vi.mocked(threads.publishImagePost).mockResolvedValue({ postId: 'th_img_123', url: 'https://threads.net/t/th_img_123' });

    const results = await publishToMultiplePlatforms(
      'user123',
      'Hello Threads with image',
      ['threads'],
      ['https://example.com/img.jpg']
    );
    expect(results.threads).toEqual({ postId: 'th_img_123', url: 'https://threads.net/t/th_img_123' });
    expect(threads.publishImagePost).toHaveBeenCalledWith(
      'threads_user_123',
      'encrypted_token',
      'https://example.com/img.jpg?signed=true',
      'Hello Threads with image'
    );
  });
});
