/**
 * Profile tests — Tier 2 core features.
 */

import { test, expect } from '@playwright/test';
import { ProfilePage } from '../../pages/profile/profile.page';

test.describe('Profile', () => {
  let profilePage: ProfilePage;

  test.beforeEach(async ({ page }) => {
    profilePage = new ProfilePage(page);
  });

  test('profile page loads for authenticated user', async ({ page }) => {
    await profilePage.goto();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(/\/profile/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('profile page has correct title', async ({ page }) => {
    await profilePage.goto();
    await expect(page).toHaveTitle(/Profile|Webyalaya/i);
  });

  test('profile page renders user content', async ({ page }) => {
    await profilePage.goto();
    await page.waitForLoadState('networkidle');

    const hasContent = await Promise.any([
      page.locator('h1, h2').first().isVisible(),
      page.locator('[class*="avatar"], img[alt*="avatar"]').first().isVisible(),
      page.locator(':text("Edit Profile")').first().isVisible(),
    ]);
    expect(hasContent).toBeTruthy();
  });

  test('unauthenticated user is redirected from /profile', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
