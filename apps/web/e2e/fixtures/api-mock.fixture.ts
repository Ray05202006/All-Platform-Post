import { Page, Route } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

export type Platform = 'facebook' | 'instagram' | 'twitter' | 'threads';
export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface PlatformConnection {
  id: string;
  platform: Platform;
  platformUsername: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: string;
  content: string;
  platforms: Platform[];
  mediaUrls: string[];
  mediaType?: 'image' | 'video';
  status: PostStatus;
  scheduledAt?: string;
  publishedAt?: string;
  results?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface MockConfig {
  connections?: PlatformConnection[];
  posts?: Post[];
  publishResult?: Record<string, any>;
}

export async function setupApiMocks(page: Page, config: MockConfig = {}): Promise<void> {
  // Mock connections endpoint
  await page.route(`${API_BASE_URL}/api/auth/connections`, async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(config.connections || []),
      });
    } else {
      await route.continue();
    }
  });

  // Mock posts endpoint with pattern to capture query parameters
  await page.route(new RegExp(`${API_BASE_URL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/api/posts(\\?.*)?$`), async (route: Route) => {
    const method = route.request().method();
    if (method === 'GET') {
      const url = route.request().url();
      const urlObj = new URL(url);
      const statusFilter = urlObj.searchParams.get('status');

      let posts = config.posts || [];
      if (statusFilter && posts.length > 0) {
        posts = posts.filter(p => p.status === statusFilter);
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(posts),
      });
    } else if (method === 'POST') {
      // Mock post creation
      const body = route.request().postDataJSON() as Partial<Post>;
      const newPost = createMockPost({
        ...body,
        id: `post_${Date.now()}`,
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newPost),
      });
    } else {
      await route.continue();
    }
  });

  // Mock publish endpoint
  await page.route(`${API_BASE_URL}/api/posts/*/publish`, async (route: Route) => {
    if (config.publishResult) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(config.publishResult),
      });
    } else {
      // Default mock publish result
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'post_published',
          status: 'published',
          results: { facebook: { postId: '123', success: true } },
        }),
      });
    }
  });
}

export function createMockConnection(
  platform: Platform,
  isActive = true,
  username?: string
): PlatformConnection {
  const now = new Date().toISOString();
  return {
    id: `conn_${platform}_${Date.now()}`,
    platform,
    platformUsername: username || `test_${platform}_user`,
    isActive,
    createdAt: now,
    updatedAt: now,
  };
}

export function createMockPost(overrides: Partial<Post> = {}): Post {
  const now = new Date().toISOString();
  return {
    id: `post_${Date.now()}`,
    content: 'Test post content',
    platforms: ['facebook'],
    mediaUrls: [],
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

export function createScheduledPost(
  scheduledAt: Date,
  overrides: Partial<Post> = {}
): Post {
  return createMockPost({
    status: 'scheduled',
    scheduledAt: scheduledAt.toISOString(),
    ...overrides,
  });
}

export function createPublishedPost(
  results: Record<string, any>,
  overrides: Partial<Post> = {}
): Post {
  return createMockPost({
    status: 'published',
    publishedAt: new Date().toISOString(),
    results,
    ...overrides,
  });
}

export function createFailedPost(
  errors: Record<string, string>,
  overrides: Partial<Post> = {}
): Post {
  const results: Record<string, any> = {};
  for (const [platform, error] of Object.entries(errors)) {
    results[platform] = { error };
  }
  return createMockPost({
    status: 'failed',
    results,
    ...overrides,
  });
}
