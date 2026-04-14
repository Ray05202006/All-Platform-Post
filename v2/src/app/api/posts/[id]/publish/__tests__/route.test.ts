import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/db', () => ({
  default: {
    post: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/publisher', () => ({
  publishToMultiplePlatforms: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';
import prisma from '@/lib/db';
import { publishToMultiplePlatforms } from '@/lib/publisher';
import { POST } from '@/app/api/posts/[id]/publish/route';

const mockGetServerSession = vi.mocked(getServerSession);
const mockFindFirst = vi.mocked(prisma.post.findFirst);
const mockUpdate = vi.mocked(prisma.post.update);
const mockPublish = vi.mocked(publishToMultiplePlatforms);

function makeRequest() {
  return new Request('http://localhost/api/posts/p1/publish', { method: 'POST' });
}

const basePost = {
  id: 'p1',
  userId: 'u1',
  content: 'Hello world',
  platforms: ['twitter'],
  mediaUrls: [],
  mediaType: null,
  status: 'draft',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockResolvedValue({ user: { id: 'u1' } } as any);
  mockFindFirst.mockResolvedValue(basePost as any);
  mockUpdate.mockImplementation(async ({ data }) => ({ ...basePost, ...data }) as any);
});

describe('POST /api/posts/[id]/publish', () => {
  describe('authentication', () => {
    it('returns 401 when session is null', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const res = await POST(makeRequest(), { params: { id: 'p1' } });
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 when session has no user id', async () => {
      mockGetServerSession.mockResolvedValue({ user: {} } as any);
      const res = await POST(makeRequest(), { params: { id: 'p1' } });
      expect(res.status).toBe(401);
    });
  });

  describe('post lookup', () => {
    it('returns 404 when post does not exist', async () => {
      mockFindFirst.mockResolvedValue(null);
      const res = await POST(makeRequest(), { params: { id: 'nonexistent' } });
      expect(res.status).toBe(404);
      expect(await res.json()).toEqual({ error: 'Post not found' });
    });

    it('scopes lookup to the authenticated user', async () => {
      mockPublish.mockResolvedValue({ twitter: { postId: 't1' } } as any);
      await POST(makeRequest(), { params: { id: 'p1' } });
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'p1', userId: 'u1' },
      });
    });
  });

  describe('already published guard', () => {
    it('returns 400 when post is already published', async () => {
      mockFindFirst.mockResolvedValue({ ...basePost, status: 'published' } as any);
      const res = await POST(makeRequest(), { params: { id: 'p1' } });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'Post already published' });
    });
  });

  describe('publish state machine', () => {
    it('sets status to publishing before calling publisher', async () => {
      mockPublish.mockResolvedValue({ twitter: { postId: 't1' } } as any);
      await POST(makeRequest(), { params: { id: 'p1' } });
      expect(mockUpdate.mock.calls[0][0]).toMatchObject({
        where: { id: 'p1' },
        data: { status: 'publishing' },
      });
    });

    it('all platforms succeed → status=published with publishedAt set', async () => {
      const post = { ...basePost, platforms: ['twitter', 'threads'] };
      mockFindFirst.mockResolvedValue(post as any);
      mockPublish.mockResolvedValue({
        twitter: { postId: 't1', url: 'https://x.com/t1' },
        threads: { postId: 'th1', url: 'https://threads.net/th1' },
      } as any);

      const res = await POST(makeRequest(), { params: { id: 'p1' } });
      expect(res.status).toBe(200);

      const finalUpdate = mockUpdate.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('published');
      expect(finalUpdate.data.publishedAt).toBeInstanceOf(Date);
    });

    it('all platforms fail → status=failed, no publishedAt', async () => {
      const post = { ...basePost, platforms: ['twitter', 'threads'] };
      mockFindFirst.mockResolvedValue(post as any);
      mockPublish.mockResolvedValue({
        twitter: { error: 'rate limited' },
        threads: { error: 'server error' },
      } as any);

      await POST(makeRequest(), { params: { id: 'p1' } });

      const finalUpdate = mockUpdate.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('failed');
      expect(finalUpdate.data.publishedAt).toBeUndefined();
    });

    it('mixed success/failure → status=partial', async () => {
      const post = { ...basePost, platforms: ['twitter', 'threads'] };
      mockFindFirst.mockResolvedValue(post as any);
      mockPublish.mockResolvedValue({
        twitter: { postId: 't1', url: 'https://x.com/t1' },
        threads: { error: 'failed' },
      } as any);

      await POST(makeRequest(), { params: { id: 'p1' } });

      const finalUpdate = mockUpdate.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('partial');
    });
  });

  describe('publisher throws', () => {
    it('catches thrown error → status=failed, returns 500', async () => {
      mockPublish.mockRejectedValue(new Error('Network timeout'));

      const res = await POST(makeRequest(), { params: { id: 'p1' } });
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'Network timeout' });

      const lastUpdate = mockUpdate.mock.calls[mockUpdate.mock.calls.length - 1][0];
      expect(lastUpdate.data.status).toBe('failed');
    });
  });
});
