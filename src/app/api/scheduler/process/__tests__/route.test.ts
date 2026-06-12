import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: {
    post: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('@/lib/publisher', () => ({
  publishToMultiplePlatforms: vi.fn(),
}));

import prisma from '@/lib/db';
import { publishToMultiplePlatforms } from '@/lib/publisher';
import { POST } from '@/app/api/scheduler/process/route';

const mockFindMany = vi.mocked(prisma.post.findMany);
const mockUpdate = vi.mocked(prisma.post.update);
const mockPublish = vi.mocked(publishToMultiplePlatforms);

const VALID_KEY = 'test-scheduler-key-123';

function makeRequest(apiKey?: string) {
  const headers: Record<string, string> = {};
  if (apiKey !== undefined) headers['x-scheduler-api-key'] = apiKey;
  return new Request('http://localhost/api/scheduler/process', { method: 'POST', headers });
}

const scheduledPost = {
  id: 'post1',
  userId: 'u1',
  content: 'Scheduled content',
  platforms: ['twitter'],
  mediaUrls: [],
  mediaType: null,
  status: 'scheduled',
};

beforeEach(() => {
  vi.clearAllMocks();
  process.env.SCHEDULER_API_KEY = VALID_KEY;
  mockUpdate.mockImplementation(async ({ data }) => ({ ...scheduledPost, ...data }) as any);
});

describe('POST /api/scheduler/process', () => {
  describe('API key authentication', () => {
    it('returns 401 when no x-scheduler-api-key header', async () => {
      const res = await POST(makeRequest());
      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ error: 'Unauthorized' });
    });

    it('returns 401 when wrong API key', async () => {
      const res = await POST(makeRequest('wrong-key'));
      expect(res.status).toBe(401);
    });

    it('accepts correct API key', async () => {
      mockFindMany.mockResolvedValue([]);
      const res = await POST(makeRequest(VALID_KEY));
      expect(res.status).toBe(200);
    });

    it('returns 401 when SCHEDULER_API_KEY env var is not set', async () => {
      delete process.env.SCHEDULER_API_KEY;
      const res = await POST(makeRequest(VALID_KEY));
      expect(res.status).toBe(401);
    });
  });

  describe('no due posts', () => {
    it('returns { processed: 0 } without total', async () => {
      mockFindMany.mockResolvedValue([]);
      const res = await POST(makeRequest(VALID_KEY));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ processed: 0 });
      expect(mockPublish).not.toHaveBeenCalled();
    });

    it('queries for scheduled posts with scheduledAt <= now', async () => {
      mockFindMany.mockResolvedValue([]);
      const before = new Date();
      await POST(makeRequest(VALID_KEY));
      const after = new Date();

      const query = mockFindMany.mock.calls[0][0];
      expect(query?.where?.status).toBe('scheduled');
      const queryDate = query?.where?.scheduledAt?.lte as Date;
      expect(queryDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(queryDate.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('processing due posts', () => {
    it('processes one post and returns { processed: 1, total: 1 }', async () => {
      mockFindMany.mockResolvedValue([scheduledPost] as any);
      mockPublish.mockResolvedValue({ twitter: { postId: 't1' } } as any);

      const res = await POST(makeRequest(VALID_KEY));
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ processed: 1, total: 1 });
    });

    it('sets post to publishing before calling publisher (prevents double-processing)', async () => {
      mockFindMany.mockResolvedValue([scheduledPost] as any);
      mockPublish.mockResolvedValue({ twitter: { postId: 't1' } } as any);

      await POST(makeRequest(VALID_KEY));

      expect(mockUpdate.mock.calls[0][0]).toMatchObject({
        where: { id: 'post1' },
        data: { status: 'publishing' },
      });
    });

    it('all succeed → status=published with publishedAt set', async () => {
      mockFindMany.mockResolvedValue([scheduledPost] as any);
      mockPublish.mockResolvedValue({ twitter: { postId: 't1' } } as any);

      await POST(makeRequest(VALID_KEY));

      const finalUpdate = mockUpdate.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('published');
      expect(finalUpdate.data.publishedAt).toBeInstanceOf(Date);
    });

    it('all fail → status=failed, no publishedAt', async () => {
      mockFindMany.mockResolvedValue([scheduledPost] as any);
      mockPublish.mockResolvedValue({ twitter: { error: 'API down' } } as any);

      await POST(makeRequest(VALID_KEY));

      const finalUpdate = mockUpdate.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('failed');
      expect(finalUpdate.data.publishedAt).toBeUndefined();
    });

    it('mixed platforms → status=partial', async () => {
      const post = { ...scheduledPost, platforms: ['twitter', 'threads'] };
      mockFindMany.mockResolvedValue([post] as any);
      mockPublish.mockResolvedValue({
        twitter: { postId: 't1' },
        threads: { error: 'failed' },
      } as any);

      await POST(makeRequest(VALID_KEY));

      const finalUpdate = mockUpdate.mock.calls[1][0];
      expect(finalUpdate.data.status).toBe('partial');
    });

    it('processes multiple posts and counts all successes', async () => {
      const posts = [
        { ...scheduledPost, id: 'p1' },
        { ...scheduledPost, id: 'p2' },
        { ...scheduledPost, id: 'p3' },
      ];
      mockFindMany.mockResolvedValue(posts as any);
      mockPublish.mockResolvedValue({ twitter: { postId: 'tx' } } as any);

      const res = await POST(makeRequest(VALID_KEY));
      expect(await res.json()).toEqual({ processed: 3, total: 3 });
    });

    it('publish throws → sets status=failed, continues to next post, does not count failed post', async () => {
      const posts = [
        { ...scheduledPost, id: 'p1' },
        { ...scheduledPost, id: 'p2' },
      ];
      mockFindMany.mockResolvedValue(posts as any);
      mockPublish
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ twitter: { postId: 't2' } } as any);

      const res = await POST(makeRequest(VALID_KEY));
      const body = await res.json();
      // p1 failed (caught, not counted), p2 succeeded (counted)
      expect(body).toEqual({ processed: 1, total: 2 });
    });
  });
});
