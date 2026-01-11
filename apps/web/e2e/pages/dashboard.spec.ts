import { test, expect } from '../fixtures/auth.fixture';
import { setupApiMocks, createMockConnection } from '../fixtures/api-mock.fixture';
import { mockExternalPlatforms } from '../fixtures/platform-mock.fixture';
import { TEST_POSTS, SELECTORS, PLATFORM_LIMITS, formatDateTimeLocal, getMinScheduleDate } from '../fixtures/test-data';

test.describe('Dashboard - Post Editor', () => {
  test.beforeEach(async ({ authenticatedPage }) => {
    await mockExternalPlatforms(authenticatedPage);
  });

  test.describe('Basic UI', () => {
    test('should display post editor heading', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.locator('h2')).toContainText('发文编辑器');
    });

    test('should have content textarea', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.locator(SELECTORS.contentTextarea)).toBeVisible();
    });

    test('should show platform selection section', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.getByText('选择平台', { exact: true })).toBeVisible();
    });

    test('should show media upload section', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.getByText('媒体文件')).toBeVisible();
    });

    test('should have save draft button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.locator(SELECTORS.saveDraftButton)).toBeVisible();
    });
  });

  test.describe('Content Input', () => {
    test('should accept text input', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      const textarea = authenticatedPage.locator(SELECTORS.contentTextarea);
      await textarea.fill(TEST_POSTS.short);
      await expect(textarea).toHaveValue(TEST_POSTS.short);
    });

    test('should accept long text input', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      const textarea = authenticatedPage.locator(SELECTORS.contentTextarea);
      await textarea.fill(TEST_POSTS.long);
      await expect(textarea).toHaveValue(TEST_POSTS.long);
    });

    test('should accept Chinese text input', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      const textarea = authenticatedPage.locator(SELECTORS.contentTextarea);
      await textarea.fill(TEST_POSTS.chinese);
      await expect(textarea).toHaveValue(TEST_POSTS.chinese);
    });

    test('should accept content with URLs', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      const textarea = authenticatedPage.locator(SELECTORS.contentTextarea);
      await textarea.fill(TEST_POSTS.withUrl);
      await expect(textarea).toHaveValue(TEST_POSTS.withUrl);
    });

    test('should accept content with hashtags', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      const textarea = authenticatedPage.locator(SELECTORS.contentTextarea);
      await textarea.fill(TEST_POSTS.withHashtags);
      await expect(textarea).toHaveValue(TEST_POSTS.withHashtags);
    });
  });

  test.describe('Platform Selection', () => {
    test('should show message when no platforms connected', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, { connections: [] });
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.getByText('尚未连接任何平台')).toBeVisible();
    });

    test('should display connected platforms', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [
          createMockConnection('facebook', true),
          createMockConnection('twitter', true),
        ],
      });
      await authenticatedPage.goto('/dashboard');
      // Use label text which is more specific
      await expect(authenticatedPage.locator('label:has-text("Facebook")')).toBeVisible();
      await expect(authenticatedPage.locator('label:has-text("Twitter")')).toBeVisible();
    });

    test('should allow selecting a platform', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await expect(authenticatedPage.locator('input[type="checkbox"]:checked')).toHaveCount(1);
    });

    test('should allow selecting multiple platforms', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [
          createMockConnection('facebook', true),
          createMockConnection('twitter', true),
          createMockConnection('instagram', true),
        ],
      });
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await authenticatedPage.locator('label:has-text("Twitter")').click();
      await expect(authenticatedPage.locator('input[type="checkbox"]:checked')).toHaveCount(2);
    });
  });

  test.describe('Scheduling', () => {
    test('should toggle schedule mode', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.getByText('设置排程').click();
      await expect(authenticatedPage.locator(SELECTORS.scheduleDateInput)).toBeVisible();
    });

    test('should accept schedule date input', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.getByText('设置排程').click();

      const futureDate = getMinScheduleDate();
      const dateInput = authenticatedPage.locator(SELECTORS.scheduleDateInput);
      await dateInput.fill(formatDateTimeLocal(futureDate));

      await expect(dateInput).toHaveValue(formatDateTimeLocal(futureDate));
    });

    test('should show schedule button when date is set', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });
      await authenticatedPage.goto('/dashboard');

      await authenticatedPage.locator(SELECTORS.contentTextarea).fill('Test content');
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await authenticatedPage.getByText('设置排程').click();

      const futureDate = getMinScheduleDate();
      await authenticatedPage.locator(SELECTORS.scheduleDateInput).fill(formatDateTimeLocal(futureDate));

      await expect(authenticatedPage.locator(SELECTORS.scheduleButton)).toBeVisible();
    });
  });

  test.describe('Publishing Button States', () => {
    test('publish button should be disabled without content', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.locator('label:has-text("Facebook")').click();
      await expect(authenticatedPage.locator(SELECTORS.publishButton)).toBeDisabled();
    });

    test('publish button should be disabled without platform selection', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });
      await authenticatedPage.goto('/dashboard');
      await authenticatedPage.locator(SELECTORS.contentTextarea).fill('Test content');
      await expect(authenticatedPage.locator(SELECTORS.publishButton)).toBeDisabled();
    });

    test('publish button should be enabled with content and platform', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });
      await authenticatedPage.goto('/dashboard');

      await authenticatedPage.locator(SELECTORS.contentTextarea).fill('Test content');
      await authenticatedPage.locator('label:has-text("Facebook")').click();

      await expect(authenticatedPage.locator(SELECTORS.publishButton)).toBeEnabled();
    });
  });

  test.describe('Media Upload', () => {
    test('should show upload button', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard');
      await expect(authenticatedPage.locator(SELECTORS.mediaUploadButton)).toBeVisible();
    });
  });
});
