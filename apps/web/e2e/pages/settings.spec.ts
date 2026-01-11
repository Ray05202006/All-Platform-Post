import { test, expect } from '../fixtures/auth.fixture';
import { setupApiMocks, createMockConnection } from '../fixtures/api-mock.fixture';
import { SELECTORS } from '../fixtures/test-data';

test.describe('Settings Page', () => {
  test.describe('Page Structure', () => {
    test('should display settings heading', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/settings');
      await expect(authenticatedPage.locator('h2')).toContainText('设置');
    });

    test('should display platform connections section', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/settings');
      await expect(authenticatedPage.getByRole('heading', { name: '平台连接' })).toBeVisible();
    });

    test('should display all four platforms', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/settings');

      // Use heading role for platform names to be more specific
      await expect(authenticatedPage.getByRole('heading', { name: 'Facebook' })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: 'Instagram' })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: /Twitter/ })).toBeVisible();
      await expect(authenticatedPage.getByRole('heading', { name: 'Threads' })).toBeVisible();
    });
  });

  test.describe('Platform Connection Status', () => {
    test('should show Connect button for unconnected platforms', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, { connections: [] });
      await authenticatedPage.goto('/dashboard/settings');

      const connectButtons = authenticatedPage.locator(SELECTORS.connectButton);
      await expect(connectButtons).toHaveCount(4);
    });

    test('should show Disconnect button for connected platforms', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true)],
      });
      await authenticatedPage.goto('/dashboard/settings');

      await expect(authenticatedPage.locator(SELECTORS.disconnectButton)).toBeVisible();
    });

    test('should show connected username', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [createMockConnection('facebook', true, 'testuser123')],
      });
      await authenticatedPage.goto('/dashboard/settings');

      await expect(authenticatedPage.getByText('@testuser123')).toBeVisible();
    });

    test('should show multiple connected platforms', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [
          createMockConnection('facebook', true, 'fb_user'),
          createMockConnection('twitter', true, 'tw_user'),
          createMockConnection('instagram', true, 'ig_user'),
        ],
      });
      await authenticatedPage.goto('/dashboard/settings');

      await expect(authenticatedPage.getByText('@fb_user')).toBeVisible();
      await expect(authenticatedPage.getByText('@tw_user')).toBeVisible();
      await expect(authenticatedPage.getByText('@ig_user')).toBeVisible();
    });
  });

  test.describe('OAuth Callback Handling', () => {
    test('should show success notification after OAuth callback', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/settings?connected=facebook');
      await expect(authenticatedPage.getByText(/成功连接|已连接.*facebook/i)).toBeVisible();
    });

    test('should show error notification on OAuth failure', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/settings?error=facebook_failed');
      await expect(authenticatedPage.getByText(/连接失败|错误/)).toBeVisible();
    });

    test('should auto-hide notification after delay', async ({ authenticatedPage }) => {
      await authenticatedPage.goto('/dashboard/settings?connected=facebook');

      // Look for the notification in the specific notification banner
      const notification = authenticatedPage.locator('.bg-green-50').getByText(/成功连接|已连接/);
      await expect(notification).toBeVisible();

      // Wait for notification to disappear (usually 5 seconds)
      await authenticatedPage.waitForTimeout(6000);
      await expect(notification).not.toBeVisible();
    });
  });

  test.describe('Connect Button Behavior', () => {
    test('connect button should be clickable', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, { connections: [] });
      await authenticatedPage.goto('/dashboard/settings');

      const connectButton = authenticatedPage.locator(SELECTORS.connectButton).first();
      await expect(connectButton).toBeEnabled();
    });
  });

  test.describe('Mixed Connection States', () => {
    test('should show correct buttons for mixed connection states', async ({ authenticatedPage }) => {
      await setupApiMocks(authenticatedPage, {
        connections: [
          createMockConnection('facebook', true),
          createMockConnection('twitter', true),
        ],
      });
      await authenticatedPage.goto('/dashboard/settings');

      // Should have 2 disconnect buttons (for connected platforms)
      await expect(authenticatedPage.locator(SELECTORS.disconnectButton)).toHaveCount(2);
      // Connect buttons include "连接" text which also appears in "断开连接"
      // Use exact text match for connect button
      await expect(authenticatedPage.getByRole('button', { name: '连接', exact: true })).toHaveCount(2);
    });
  });
});
