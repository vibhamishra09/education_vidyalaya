/**
 * Request Session tests — Tier 2 core features.
 */

import { test, expect } from '@playwright/test';
import { RequestSessionPage } from '../../pages/sessions/request-session.page';

test.describe('Request Session', () => {
  let requestPage: RequestSessionPage;

  test.beforeEach(async ({ page }) => {
    requestPage = new RequestSessionPage(page);
    await requestPage.goto();
    await page.waitForLoadState('domcontentloaded');
  });

  test('request session page loads for authenticated user', async ({ page }) => {
    await expect(page).toHaveURL(/\/request-session/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('request session page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Request|Session|Webyalaya/i);
  });

  test('session request form renders correctly', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Should have some form elements
    const hasForm = await page.locator('form, [data-testid="session-form"]').first().isVisible().catch(() => false);
    const hasInput = await page.locator('input, textarea, select').first().isVisible().catch(() => false);
    expect(hasForm || hasInput).toBeTruthy();
  });

  test('unauthenticated user is redirected to sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/request-session');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
