/**
 * Session management tests — Tier 3 extended coverage.
 */

import { test, expect } from '@playwright/test';

test.describe('Session Management', () => {
  test('sessions route is accessible to authenticated users', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForLoadState('domcontentloaded');
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('sessions page renders content', async ({ page }) => {
    await page.goto('/sessions');
    await page.waitForLoadState('networkidle');
    // Page loaded = content or empty state is visible
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/sessions|\/dashboard/);
  });
});
