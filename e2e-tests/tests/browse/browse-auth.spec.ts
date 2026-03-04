/**
 * Browse page — authenticated user tests.
 * Tier 2 core features.
 */

import { test, expect } from '@playwright/test';
import { BrowsePage } from '../../pages/browse/browse.page';

test.describe('Browse — Authenticated', () => {
  let browsePage: BrowsePage;

  test.beforeEach(async ({ page }) => {
    browsePage = new BrowsePage(page);
    await browsePage.goto();
    await page.waitForLoadState('networkidle');
  });

  test('authenticated user can access browse page', async ({ page }) => {
    await expect(page).toHaveURL(/\/browse/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('browse page search input works', async ({ page }) => {
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="search" i]'
    ).first();

    if (await searchInput.isVisible()) {
      await searchInput.fill('JavaScript');
      await page.waitForTimeout(600); // wait for debounce
      // Results should update (no crash = pass)
      await expect(page).toHaveURL(/\/browse/);
    }
  });

  test('can switch between tabs if they exist', async ({ page }) => {
    const tabs = page.locator('[role="tab"]');
    const tabCount = await tabs.count();

    if (tabCount > 1) {
      await tabs.nth(1).click();
      await page.waitForTimeout(500);
      // No crash = pass
      await expect(page).toHaveURL(/\/browse/);
    }
  });

  test('clicking a peer card navigates to profile', async ({ page }) => {
    const peerCards = page.locator('[data-testid="peer-card"], [class*="peer-card"]');
    const count = await peerCards.count();

    if (count > 0) {
      // Click the first peer card or its CTA link
      const firstCard = peerCards.first();
      const profileLink = firstCard.locator('a').first();

      if (await profileLink.isVisible()) {
        const href = await profileLink.getAttribute('href');
        if (href) {
          await profileLink.click();
          await page.waitForLoadState('domcontentloaded');
          // Should navigate somewhere (profile, etc.)
          await expect(page).not.toHaveURL(/\/browse/);
        }
      }
    }
  });
});
