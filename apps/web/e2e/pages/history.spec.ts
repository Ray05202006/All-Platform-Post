import { test, expect } from '../fixtures/auth.fixture';
import { setupApiMocks, createMockPost, createPublishedPost, createFailedPost } from '../fixtures/api-mock.fixture';
import { mockExternalPlatforms } from '../fixtures/platform-mock.fixture';
import { SELECTORS } from '../fixtures/test-data';

test.describe('Post History Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockExternalPlatforms(authenticatedPage);
  });

  test.describe('Page Structure', () => {
    test('should display history heading', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/history');
      await expect(authenticatedPage.getByRole('heading', { name: '发文历史' })).toBeVisible();
    });
  });

  test.describe('Filter Buttons', () => {
    test('should display all filter buttons', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.locator(SELECTORS.filterAll)).toBeVisible();
      await expect(authenticatedPage.locator(SELECTORS.filterDraft)).toBeVisible();
      await expect(authenticatedPage.locator(SELECTORS.filterScheduled)).toBeVisible();
      await expect(authenticatedPage.locator(SELECTORS.filterPublished)).toBeVisible();
      await expect(authenticatedPage.locator(SELECTORS.filterFailed)).toBeVisible();
    });

    test('should filter posts when clicking draft filter', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [
          createMockPost({ id: '1', content: 'Draft post', status: 'draft' }),
          createPublishedPost({ facebook: { postId: '123' } }, { id: '2', content: 'Published post' }),
        ],
      });
      await authenticatedPage.goto('/dashboard/history');

      await authenticatedPage.locator(SELECTORS.filterDraft).click();
      // Filtering should be applied
      await expect(authenticatedPage.getByText('Draft post')).toBeVisible();
    });

    test('should filter posts when clicking published filter', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [
          createMockPost({ id: '1', content: 'Draft post', status: 'draft' }),
          createPublishedPost({ facebook: { postId: '123' } }, { id: '2', content: 'Published post' }),
        ],
      });
      await authenticatedPage.goto('/dashboard/history');

      await authenticatedPage.locator(SELECTORS.filterPublished).click();
      await expect(authenticatedPage.getByText('Published post')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state when no posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, { posts: [] });
      await authenticatedPage.goto('/dashboard/history');
      await expect(authenticatedPage.getByText('暂无贴文记录')).toBeVisible();
    });
  });

  test.describe('Post Display', () => {
    test('should show draft status badge', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createMockPost({ status: 'draft', content: 'My draft post' })],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.getByText('My draft post')).toBeVisible();
      // Status badge is a span, not a button
      await expect(authenticatedPage.locator('span:has-text("草稿")')).toBeVisible();
    });

    test('should show published status badge', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createPublishedPost(
          { facebook: { postId: '123', url: 'https://facebook.com/123' } },
          { content: 'My published post' }
        )],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.getByText('My published post')).toBeVisible();
      // Status badge is a span, not a button
      await expect(authenticatedPage.locator('span:has-text("已发布")')).toBeVisible();
    });

    test('should show failed status badge', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createFailedPost(
          { facebook: 'Rate limit exceeded' },
          { content: 'My failed post' }
        )],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.getByText('My failed post')).toBeVisible();
      // Status badge is a span, not a button
      await expect(authenticatedPage.locator('span:has-text("失败")')).toBeVisible();
    });

    test('should show publish results for published posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createPublishedPost(
          { facebook: { postId: '123', url: 'https://facebook.com/123' } },
          { content: 'Published with results' }
        )],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.getByText('发布结果')).toBeVisible();
    });

    test('should show error message for failed posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createFailedPost(
          { facebook: 'Rate limit exceeded' },
          { content: 'Failed post with error' }
        )],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.getByText('Rate limit exceeded')).toBeVisible();
    });
  });

  test.describe('Post Actions', () => {
    test('should have delete button for draft posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createMockPost({ status: 'draft' })],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.locator(SELECTORS.deleteButton)).toBeVisible();
    });

    test('should have publish button for draft posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createMockPost({ status: 'draft' })],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.locator(SELECTORS.publishButton)).toBeVisible();
    });

    test('should have retry button for failed posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [createFailedPost({ facebook: 'Error occurred' })],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.locator(SELECTORS.retryButton)).toBeVisible();
    });
  });

  test.describe('Multiple Posts', () => {
    test('should display multiple posts with different statuses', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [
          createMockPost({ id: '1', content: 'Draft content', status: 'draft' }),
          createPublishedPost({ facebook: { postId: '123' } }, { id: '2', content: 'Published content' }),
          createFailedPost({ twitter: 'API error' }, { id: '3', content: 'Failed content' }),
        ],
      });
      await authenticatedPage.goto('/dashboard/history');

      await expect(authenticatedPage.getByText('Draft content')).toBeVisible();
      await expect(authenticatedPage.getByText('Published content')).toBeVisible();
      await expect(authenticatedPage.getByText('Failed content')).toBeVisible();
    });
  });
});
