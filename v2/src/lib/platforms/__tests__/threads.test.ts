import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { publishTextPost, publishImagePost, publishThreadChain } from '../threads';

vi.mock('axios');
const mockAxios = vi.mocked(axios);

describe('Threads Platform client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('publishTextPost', () => {
    it('creates and publishes text post successfully', async () => {
      // Step 1: create container response
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'container_123' } } as any);
      // Step 2: publish container response
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'post_123' } } as any);

      const result = await publishTextPost('user123', 'token123', 'Hello Threads');
      expect(result).toEqual({
        postId: 'post_123',
        url: 'https://www.threads.net/t/post_123',
      });

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockAxios.post).toHaveBeenNthCalledWith(
        1,
        'https://graph.threads.net/v1.0/user123/threads',
        { media_type: 'TEXT', text: 'Hello Threads' },
        { params: { access_token: 'token123' } }
      );
      expect(mockAxios.post).toHaveBeenNthCalledWith(
        2,
        'https://graph.threads.net/v1.0/user123/threads_publish',
        { creation_id: 'container_123' },
        { params: { access_token: 'token123' } }
      );
    });

    it('returns error if container creation fails', async () => {
      mockAxios.post.mockRejectedValueOnce(new Error('Network Error') as any);

      const result = await publishTextPost('user123', 'token123', 'Hello Threads');
      expect(result).toEqual({ error: 'Network Error' });
    });
  });

  describe('publishImagePost', () => {
    it('creates and publishes image post successfully', async () => {
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'container_img_123' } } as any);
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'post_img_123' } } as any);

      const result = await publishImagePost('user123', 'token123', 'https://example.com/img.jpg', 'Beautiful day');
      expect(result).toEqual({
        postId: 'post_img_123',
        url: 'https://www.threads.net/t/post_img_123',
      });

      expect(mockAxios.post).toHaveBeenCalledTimes(2);
      expect(mockAxios.post).toHaveBeenNthCalledWith(
        1,
        'https://graph.threads.net/v1.0/user123/threads',
        { media_type: 'IMAGE', image_url: 'https://example.com/img.jpg', text: 'Beautiful day' },
        { params: { access_token: 'token123' } }
      );
    });
  });

  describe('publishThreadChain', () => {
    it('publishes a chain of text posts sequentially', async () => {
      // Chunk 1 container and publish
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'c1' } } as any);
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'p1' } } as any);
      // Chunk 2 container and publish
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'c2' } } as any);
      mockAxios.post.mockResolvedValueOnce({ data: { id: 'p2' } } as any);

      const results = await publishThreadChain('user123', 'token123', ['Part 1', 'Part 2']);
      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ postId: 'p1', url: 'https://www.threads.net/t/p1' });
      expect(results[1]).toEqual({ postId: 'p2', url: 'https://www.threads.net/t/p2' });

      // First chunk container has no replyToId, second has previousThreadId ('p1')
      expect(mockAxios.post).toHaveBeenNthCalledWith(
        1,
        'https://graph.threads.net/v1.0/user123/threads',
        { media_type: 'TEXT', text: 'Part 1' },
        { params: { access_token: 'token123' } }
      );
      expect(mockAxios.post).toHaveBeenNthCalledWith(
        3,
        'https://graph.threads.net/v1.0/user123/threads',
        { media_type: 'TEXT', text: 'Part 2', reply_to_id: 'p1' },
        { params: { access_token: 'token123' } }
      );
    });
  });
});
