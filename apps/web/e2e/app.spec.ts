import { test, expect } from '@playwright/test';

test.describe('Web App Basic Tests', () => {
  test('homepage redirects to dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/dashboard');
  });

  test('dashboard page loads successfully', async ({ page }) => {
    await page.goto('/dashboard');

    // Check page title or main heading
    await expect(page.locator('h2')).toContainText('发文编辑器');
  });

  test('dashboard has post editor elements', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for content textarea
    await expect(page.locator('textarea[placeholder="输入贴文内容..."]')).toBeVisible();

    // Check for platform selection label (exact match to avoid duplicates)
    await expect(page.getByText('选择平台', { exact: true })).toBeVisible();

    // Check for media file section
    await expect(page.getByText('媒体文件')).toBeVisible();
  });

  test('dashboard has navigation links', async ({ page }) => {
    await page.goto('/dashboard');

    // Check navigation links in the navbar (using nav element context)
    const nav = page.locator('nav');
    await expect(nav.getByRole('link', { name: '排程' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '历史' })).toBeVisible();
    await expect(nav.getByRole('link', { name: '设置' })).toBeVisible();
  });

  test('can navigate to settings page', async ({ page }) => {
    await page.goto('/dashboard');

    const nav = page.locator('nav');
    await nav.getByRole('link', { name: '设置' }).click();
    await expect(page).toHaveURL('/dashboard/settings');
  });

  test('can navigate to scheduled page', async ({ page }) => {
    await page.goto('/dashboard');

    const nav = page.locator('nav');
    await nav.getByRole('link', { name: '排程' }).click();
    await expect(page).toHaveURL('/dashboard/scheduled');
  });

  test('can navigate to history page', async ({ page }) => {
    await page.goto('/dashboard');

    const nav = page.locator('nav');
    await nav.getByRole('link', { name: '历史' }).click();
    await expect(page).toHaveURL('/dashboard/history');
  });

  test('textarea accepts input', async ({ page }) => {
    await page.goto('/dashboard');

    const textarea = page.locator('textarea[placeholder="输入贴文内容..."]');
    await textarea.fill('Test content for posting');
    await expect(textarea).toHaveValue('Test content for posting');
  });
});
