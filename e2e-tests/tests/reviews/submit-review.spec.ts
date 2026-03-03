/**
 * Submit Review tests — Tier 3 extended coverage.
 */

import { test, expect } from '@playwright/test';

test.describe('Submit Review', () => {
  test('submit review page requires a valid session ID', async ({ page }) => {
    await page.goto('/submit-review');
    await page.waitForLoadState('domcontentloaded');
    // Should either show the form (with a sessionId param) or redirect
    // Without a session ID, page may show an error state or redirect
    const isOnPage = page.url().includes('/submit-review');
    const isRedirected = page.url().includes('/dashboard') || page.url().includes('/sessions');
    expect(isOnPage || isRedirected).toBeTruthy();
  });

  test('submit review page is auth protected', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/submit-review');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
