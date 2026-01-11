import { Page, Route } from '@playwright/test';

export interface PlatformMockConfig {
  facebook?: {
    postId?: string;
    error?: string;
  };
  twitter?: {
    tweetId?: string;
    error?: string;
  };
  instagram?: {
    postId?: string;
    error?: string;
  };
  threads?: {
    postId?: string;
    error?: string;
  };
}

const DEFAULT_RESPONSES = {
  facebook: {
    postId: 'fb_mock_post_123456',
    pageId: 'fb_mock_page_123',
    pageName: 'Test Page',
  },
  twitter: {
    tweetId: 'tw_mock_tweet_1234567890',
    userId: 'tw_mock_user_123',
  },
  instagram: {
    postId: 'ig_mock_post_123456',
    accountId: 'ig_mock_account_123',
  },
  threads: {
    postId: 'th_mock_post_123456',
    userId: 'th_mock_user_123',
  },
};

export async function mockExternalPlatforms(
  page: Page,
  config: PlatformMockConfig = {}
): Promise<void> {
  await page.route('**/graph.facebook.com/**', async (route: Route) => {
    const fbConfig = config.facebook || {};
    if (fbConfig.error) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: fbConfig.error,
            type: 'OAuthException',
            code: 190,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: fbConfig.postId || DEFAULT_RESPONSES.facebook.postId,
        }),
      });
    }
  });

  await page.route('**/api.twitter.com/**', async (route: Route) => {
    const twConfig = config.twitter || {};
    if (twConfig.error) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: twConfig.error, code: 187 }],
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: twConfig.tweetId || DEFAULT_RESPONSES.twitter.tweetId,
          },
        }),
      });
    }
  });

  await page.route('**/api.x.com/**', async (route: Route) => {
    const twConfig = config.twitter || {};
    if (twConfig.error) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: twConfig.error, code: 187 }],
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: twConfig.tweetId || DEFAULT_RESPONSES.twitter.tweetId,
          },
        }),
      });
    }
  });

  await page.route('**/graph.instagram.com/**', async (route: Route) => {
    const igConfig = config.instagram || {};
    if (igConfig.error) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: igConfig.error,
            type: 'OAuthException',
            code: 190,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: igConfig.postId || DEFAULT_RESPONSES.instagram.postId,
        }),
      });
    }
  });

  await page.route('**/graph.threads.net/**', async (route: Route) => {
    const thConfig = config.threads || {};
    if (thConfig.error) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: thConfig.error,
            type: 'OAuthException',
            code: 190,
          },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: thConfig.postId || DEFAULT_RESPONSES.threads.postId,
        }),
      });
    }
  });

  await page.route('**/threads.net/api/**', async (route: Route) => {
    const thConfig = config.threads || {};
    if (thConfig.error) {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: { message: thConfig.error },
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: thConfig.postId || DEFAULT_RESPONSES.threads.postId,
        }),
      });
    }
  });
}

export async function mockPlatformSuccess(page: Page): Promise<void> {
  await mockExternalPlatforms(page, {});
}

export async function mockPlatformFailure(
  page: Page,
  platform: 'facebook' | 'twitter' | 'instagram' | 'threads',
  errorMessage: string
): Promise<void> {
  const config: PlatformMockConfig = {};
  config[platform] = { error: errorMessage };
  await mockExternalPlatforms(page, config);
}
