import { test, expect } from '../fixtures/auth.fixture';
import { setupApiMocks, createMockConnection } from '../fixtures/api-mock.fixture';
import { mockExternalPlatforms } from '../fixtures/platform-mock.fixture';
import { TEST_POSTS, SELECTORS, formatDateTimeLocal, getMinScheduleDate } from '../fixtures/test-data';

test.describe('Post Creation Flow', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockExternalPlatforms(authenticatedPage);
  });

  test.describe('Create and Publish Post', () => {
    test('should create and publish a post to single platform', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.short);

      // Select platform
      await authenticatedPage.locator('label:has-text("Facebook")').click();

      // Verify publish button is enabled
      await expect(authenticatedPage.locator(SELECTORS.publishButton)).toBeEnabled();

      // Handle the alert dialog that shows on success
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('发布成功');
        await dialog.accept();
      });

      // Click publish
      await authenticatedPage.locator(SELECTORS.publishButton).click();

      // Wait for the form to reset (textarea should be empty after success)
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });
    });

    test('should create and publish a post to multiple platforms', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [
          createMockConnection('facebook', true),
          createMockConnection('twitter', true),
        ],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content (short enough for Twitter)
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.short);

      // Select multiple platforms
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await authenticatedPage.locator('label:has-text("Twitter")').click();

      // Verify both are selected
      await expect(authenticatedPage.locator('input[type="checkbox"]:checked')).toHaveCount(2);

      // Handle the alert dialog that shows on success
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('发布成功');
        await dialog.accept();
      });

      // Click publish
      await authenticatedPage.locator(SELECTORS.publishButton).click();

      // Wait for the form to reset
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });
    });
  });

  test.describe('Save as Draft', () => {
    test('should save post as draft', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.medium);

      // Select a platform (required for saving)
      await authenticatedPage.locator('label:has-text("Facebook")').click();

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('草稿已保存');
        await dialog.accept();
      });

      // Click save draft
      await authenticatedPage.locator(SELECTORS.saveDraftButton).click();

      // Wait briefly for the dialog to be handled
      await authenticatedPage.waitForTimeout(1000);
    });

    test('should save draft with platform selection', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('instagram', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.withHashtags);

      // Select platform
      await authenticatedPage.locator('label:has-text("Instagram")').click();

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('草稿已保存');
        await dialog.accept();
      });

      // Save as draft
      await authenticatedPage.locator(SELECTORS.saveDraftButton).click();

      // Wait briefly for the dialog to be handled
      await authenticatedPage.waitForTimeout(1000);
    });
  });

  test.describe('Schedule Post', () => {
    test('should schedule a post for future', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('twitter', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.twitterMax);

      // Select platform
      await authenticatedPage.locator('label:has-text("Twitter")').click();

      // Enable scheduling
      await authenticatedPage.getByText('设置排程').click();

      // Set future time
      const futureDate = getMinScheduleDate();
      await authenticatedPage.locator(SELECTORS.scheduleDateInput).fill(formatDateTimeLocal(futureDate));

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('已添加到排程');
        await dialog.accept();
      });

      // Click schedule button
      await authenticatedPage.locator(SELECTORS.scheduleButton).click();

      // Wait for the form to reset
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });
    });

    test('should schedule post to multiple platforms', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [
          createMockConnection('facebook', true),
          createMockConnection('threads', true),
        ],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.medium);

      // Select platforms
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await authenticatedPage.locator('label:has-text("Threads")').click();

      // Enable scheduling
      await authenticatedPage.getByText('设置排程').click();

      // Set future time (2 hours from now)
      const futureDate = new Date();
      futureDate.setHours(futureDate.getHours() + 2);
      await authenticatedPage.locator(SELECTORS.scheduleDateInput).fill(formatDateTimeLocal(futureDate));

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('已添加到排程');
        await dialog.accept();
      });

      // Schedule
      await authenticatedPage.locator(SELECTORS.scheduleButton).click();

      // Wait for the form to reset
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });
    });
  });

  test.describe('Content with Special Characters', () => {
    test('should publish post with Chinese content', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter Chinese content
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.chinese);

      // Select platform
      await authenticatedPage.locator('label:has-text("Facebook")').click();

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('发布成功');
        await dialog.accept();
      });

      // Publish
      await authenticatedPage.locator(SELECTORS.publishButton).click();

      // Wait for the form to reset
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });
    });

    test('should publish post with URLs and hashtags', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content with URL and hashtags
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.mixed);

      // Select platform
      await authenticatedPage.locator('label:has-text("Facebook")').click();

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('发布成功');
        await dialog.accept();
      });

      // Publish
      await authenticatedPage.locator(SELECTORS.publishButton).click();

      // Wait for the form to reset
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });
    });

    test('should publish post with emojis', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('instagram', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Enter content with emojis
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.emoji);

      // Select platform
      await authenticatedPage.locator('label:has-text("Instagram")').click();

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        expect(dialog.message()).toContain('发布成功');
        await dialog.accept();
      });

      // Publish
      await authenticatedPage.locator(SELECTORS.publishButton).click();

      // Wait for the form to reset
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });
    });
  });

  test.describe('Navigation After Actions', () => {
    test('should be able to navigate to history after publishing', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      // Create and publish
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.short);
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await authenticatedPage.locator(SELECTORS.publishButton).click();

      // Wait for the form to reset (indicates success)
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });

      // Navigate to history
      await authenticatedPage.locator(SELECTORS.navHistory).click();
      await expect(authenticatedPage).toHaveURL('/dashboard/history');
    });

    test('should be able to navigate to scheduled after scheduling', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });

      await authenticatedPage.goto('/dashboard');

      // Handle the alert dialog
      authenticatedPage.on('dialog', async (dialog) => {
        await dialog.accept();
      });

      // Create and schedule
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill(TEST_POSTS.short);
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await authenticatedPage.getByText('设置排程').click();

      const futureDate = getMinScheduleDate();
      await authenticatedPage.locator(SELECTORS.scheduleDateInput).fill(formatDateTimeLocal(futureDate));
      await authenticatedPage.locator(SELECTORS.scheduleButton).click();

      // Wait for the form to reset (indicates success)
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toHaveValue('', { timeout: 10000 });

      // Navigate to scheduled
      await authenticatedPage.locator(SELECTORS.navScheduled).click();
      await expect(authenticatedPage).toHaveURL('/dashboard/scheduled');
    });
  });
});
