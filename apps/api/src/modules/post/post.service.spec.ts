import { PostService } from './post.service';

const mockPost = {
  id: 'post1',
  userId: 'user1',
  content: 'Test post content',
  platforms: ['facebook', 'twitter'],
  mediaUrls: [],
  mediaType: null,
  status: 'draft',
  scheduledAt: null,
  publishedAt: null,
  results: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeService() {
  const prisma = {
    post: {
      findFirst: jest.fn().mockResolvedValue(mockPost),
      update: jest.fn(),
    },
    publishLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as any;

  const platformService = {
    publishToMultiplePlatforms: jest.fn(),
  } as any;

  const service = new PostService(prisma, platformService);
  return { service, prisma, platformService };
}

describe('PostService.publishPost', () => {
  it('should set status=failed when all platforms fail', async () => {
    const { service, prisma, platformService } = makeService();

    const results = {
      facebook: { error: 'Token expired' },
      twitter: { error: 'Rate limited' },
    };
    platformService.publishToMultiplePlatforms.mockResolvedValue(results);
    prisma.post.update
      .mockResolvedValueOnce({ ...mockPost, status: 'publishing' })
      .mockResolvedValueOnce({ ...mockPost, status: 'failed' });

    await service.publishPost('user1', 'post1');

    // First update: set to 'publishing'
    expect(prisma.post.update.mock.calls[0][0].data.status).toBe('publishing');
    // Second update: set to 'failed' because all platforms errored
    expect(prisma.post.update.mock.calls[1][0].data.status).toBe('failed');
  });

  it('should set status=published and publishedAt when all platforms succeed', async () => {
    const { service, prisma, platformService } = makeService();

    const results = {
      facebook: { postId: 'fb_123' },
      twitter: { postId: 'tw_456' },
    };
    platformService.publishToMultiplePlatforms.mockResolvedValue(results);
    prisma.post.update
      .mockResolvedValueOnce({ ...mockPost, status: 'publishing' })
      .mockResolvedValueOnce({ ...mockPost, status: 'published', publishedAt: new Date() });

    await service.publishPost('user1', 'post1');

    const finalData = prisma.post.update.mock.calls[1][0].data;
    expect(finalData.status).toBe('published');
    expect(finalData.publishedAt).toBeDefined();
  });

  it('should store per-platform results after publishing', async () => {
    const { service, prisma, platformService } = makeService();

    const results = { facebook: { postId: 'fb_123' } };
    platformService.publishToMultiplePlatforms.mockResolvedValue(results);
    prisma.post.update
      .mockResolvedValueOnce({ ...mockPost, status: 'publishing' })
      .mockResolvedValueOnce({ ...mockPost, status: 'published' });

    await service.publishPost('user1', 'post1');

    const finalData = prisma.post.update.mock.calls[1][0].data;
    expect(finalData.results).toEqual(results);
  });

  it('should create a PublishLog entry for each platform', async () => {
    const { service, prisma, platformService } = makeService();

    prisma.post.update
      .mockResolvedValueOnce({ ...mockPost, status: 'publishing' })
      .mockResolvedValueOnce({ ...mockPost, status: 'published' });
    platformService.publishToMultiplePlatforms.mockResolvedValue({
      facebook: { postId: 'fb_123' },
      twitter: { postId: 'tw_456' },
    });

    await service.publishPost('user1', 'post1');

    expect(prisma.publishLog.create).toHaveBeenCalledTimes(2);
  });

  it('should throw BadRequestException when post is not found', async () => {
    const { service, prisma } = makeService();
    prisma.post.findFirst.mockResolvedValue(null);

    await expect(service.publishPost('user1', 'missing')).rejects.toThrow('Post not found');
  });

  it('should throw BadRequestException when post is already published', async () => {
    const { service, prisma } = makeService();
    prisma.post.findFirst.mockResolvedValue({ ...mockPost, status: 'published' });

    await expect(service.publishPost('user1', 'post1')).rejects.toThrow('Post already published');
  });

  // Note: 'partial' status (some platforms succeed, some fail) is expected to be
  // implemented by a separate agent. When added, the logic should set status='partial'
  // instead of 'failed' when only some platforms fail.
  it.todo('partial success → status=partial when some platforms fail and some succeed');
});
