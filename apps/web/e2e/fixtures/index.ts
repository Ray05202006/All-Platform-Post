/**
 * E2E Test Fixtures
 *
 * auth.fixture.ts    — Playwright fixture that provides an `authenticatedPage`
 *                      with a mocked JWT session so tests skip the login flow.
 *
 * api-mock.fixture.ts — Intercepts /api/* routes via page.route() so E2E tests
 *                       do not need a running backend. This is the correct way
 *                       to mock API responses in Playwright tests.
 *
 * test-data.ts        — Shared constants: test post content, selectors, helpers.
 *
 * NOTE: There is intentionally no fixture for mocking external platform APIs
 * (graph.facebook.com, api.twitter.com, etc.). Those HTTP calls are made by the
 * NestJS backend process — not the browser — so Playwright's page.route() cannot
 * intercept them. Any such fixture would silently have no effect.
 * Mock the /api/* backend routes instead (see api-mock.fixture.ts).
 */

export * from './api-mock.fixture';
export * from './auth.fixture';
export * from './test-data';
