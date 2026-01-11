import { test as base, expect, Page, BrowserContext } from '@playwright/test';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

export interface AuthFixtures {
  authenticatedPage: Page;
  authToken: string;
}

export const test = base.extend<AuthFixtures>({
  authToken: async ({ request }, use) => {
    const response = await request.get(`${API_BASE_URL}/api/auth/dev-token`);
    if (!response.ok()) {
      throw new Error(`Failed to get dev token: ${response.status()}`);
    }
    const data = await response.json();
    await use(data.token);
  },

  authenticatedPage: async ({ page, context, authToken }, use) => {
    await context.addInitScript((token: string) => {
      window.localStorage.setItem('auth_token', token);
    }, authToken);

    await use(page);
  },
});

export { expect };

export async function getAuthToken(request: any): Promise<string> {
  const response = await request.get(`${API_BASE_URL}/api/auth/dev-token`);
  if (!response.ok()) {
    throw new Error(`Failed to get dev token: ${response.status()}`);
  }
  const data = await response.json();
  return data.token;
}

export async function setupAuth(context: BrowserContext, token: string): Promise<void> {
  await context.addInitScript((t: string) => {
    window.localStorage.setItem('auth_token', t);
  }, token);
}
