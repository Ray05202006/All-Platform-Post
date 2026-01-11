import { test, expect } from '../fixtures/auth.fixture';
import { setupApiMocks, createScheduledPost, createMockConnection } from '../fixtures/api-mock.fixture';
import { mockExternalPlatforms } from '../fixtures/platform-mock.fixture';
import { SELECTORS, getFutureDate, formatDateTimeLocal } from '../fixtures/test-data';

test.describe('Scheduled Posts Page', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockExternalPlatforms(authenticatedPage);
  });

  test.describe('Page Structure', () => {
    test('should display scheduled posts heading', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/scheduled');
      await expect(authenticatedPage.getByRole('heading', { name: '排程管理' })).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test('should show empty state message when no scheduled posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, { posts: [] });
      await authenticatedPage.goto('/dashboard/scheduled');
      await expect(authenticatedPage.getByText('暂无排程贴文')).toBeVisible();
    });

    test('should have link to create new post', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, { posts: [] });
      await authenticatedPage.goto('/dashboard/scheduled');
      await expect(authenticatedPage.getByRole('link', { name: /创建|新增/ })).toBeVisible();
    });
  });

  test.describe('Scheduled Posts List', () => {
    test('should display scheduled posts', async ({ authenticatedPage }) => {
      const futureDate = getFutureDate(2);
      await setupApiMocks(authenticatedPage, {
        posts: [
          createScheduledPost(futureDate, {
            id: 'post1',
            content: 'Scheduled post content',
            platforms: ['facebook'],
          }),
        ],
      });
      await authenticatedPage.goto('/dashboard/scheduled');
      await expect(authenticatedPage.getByText('Scheduled post content')).toBeVisible();
    });

    test('should show countdown or scheduled time', async ({ authenticatedPage }) => {
      const futureDate = getFutureDate(2);
      await setupApiMocks(authenticatedPage, {
        posts: [
          createScheduledPost(futureDate, {
            content: 'Test scheduled post',
            platforms: ['facebook'],
          }),
        ],
      });
      await authenticatedPage.goto('/dashboard/scheduled');
      // Should show some time indicator
      await expect(authenticatedPage.locator('text=/小时|分钟|后/')).toBeVisible();
    });

    test('should show platform icons for scheduled posts', async ({ authenticatedPage }) => {
      const futureDate = getFutureDate(1);
      await setupApiMocks(authenticatedPage, {
        posts: [
          createScheduledPost(futureDate, {
            platforms: ['facebook', 'twitter'],
          }),
        ],
      });
      await authenticatedPage.goto('/dashboard/scheduled');
      // Platform icons should be visible (check for first occurrence)
      await expect(authenticatedPage.getByText('📘').first()).toBeVisible();
    });
  });

  test.describe('Post Actions', () => {
    test('should have Publish Now button', async ({ authenticatedPage }) => {
      const futureDate = getFutureDate(1);
      await setupApiMocks(authenticatedPage, {
        posts: [createScheduledPost(futureDate)],
      });
      await authenticatedPage.goto('/dashboard/scheduled');
      await expect(authenticatedPage.locator(SELECTORS.publishButton).first()).toBeVisible();
    });

    test('should have Edit Time button', async ({ authenticatedPage }) => {
      const futureDate = getFutureDate(1);
      await setupApiMocks(authenticatedPage, {
        posts: [createScheduledPost(futureDate)],
      });
      await authenticatedPage.goto('/dashboard/scheduled');
      await expect(authenticatedPage.locator(SELECTORS.editTimeButton).first()).toBeVisible();
    });

    test('should have Cancel button', async ({ authenticatedPage }) => {
      const futureDate = getFutureDate(1);
      await setupApiMocks(authenticatedPage, {
        posts: [createScheduledPost(futureDate)],
      });
      await authenticatedPage.goto('/dashboard/scheduled');
      await expect(authenticatedPage.locator(SELECTORS.cancelScheduleButton).first()).toBeVisible();
    });

    test('should open time editor when clicking Edit Time', async ({ authenticatedPage }) => {
      const futureDate = getFutureDate(1);
      await setupApiMocks(authenticatedPage, {
        posts: [createScheduledPost(futureDate)],
      });
      await authenticatedPage.goto('/dashboard/scheduled');

      await authenticatedPage.locator(SELECTORS.editTimeButton).first().click();
      await expect(authenticatedPage.locator('input[type="datetime-local"]').first()).toBeVisible();
    });
  });

  test.describe('Multiple Scheduled Posts', () => {
    test('should display multiple scheduled posts', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        posts: [
          createScheduledPost(getFutureDate(1), { id: 'post1', content: 'First scheduled post' }),
          createScheduledPost(getFutureDate(2), { id: 'post2', content: 'Second scheduled post' }),
          createScheduledPost(getFutureDate(3), { id: 'post3', content: 'Third scheduled post' }),
        ],
      });
      await authenticatedPage.goto('/dashboard/scheduled');

      await expect(authenticatedPage.getByText('First scheduled post')).toBeVisible();
      await expect(authenticatedPage.getByText('Second scheduled post')).toBeVisible();
      await expect(authenticatedPage.getByText('Third scheduled post')).toBeVisible();
    });
  });
});
