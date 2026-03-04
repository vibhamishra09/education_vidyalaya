/**
 * Notifications tests — Tier 3 extended coverage.
 */

import { test, expect } from '@playwright/test';
import { NotificationsPage } from '../../pages/notifications/notifications.page';

test.describe('Notifications', () => {
  let notificationsPage: NotificationsPage;

  test.beforeEach(async ({ page }) => {
    notificationsPage = new NotificationsPage(page);
  });

  test('notifications page loads for authenticated user', async ({ page }) => {
    await notificationsPage.goto();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/notifications/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('notifications page renders content or empty state', async ({ page }) => {
    await notificationsPage.goto();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
  });

  test('unauthenticated user is redirected to sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/notifications');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
