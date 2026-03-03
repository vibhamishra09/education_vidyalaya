/**
 * Join Study Room tests — Tier 2 core features.
 *
 * NOTE: Video room (LiveKit) is not exercised in these tests.
 * Tests verify the room listing and navigation into a room.
 */

import { test, expect } from '@playwright/test';

test.describe('Join Study Room', () => {
  test('study rooms are listed on the browse page', async ({ page }) => {
    await page.goto('/browse');
    await page.waitForLoadState('networkidle');

    // Look for study room cards (may be in a separate tab)
    const roomsTab = page.locator('[role="tab"]:has-text("Room"), [role="tab"]:has-text("Study")').first();
    if (await roomsTab.isVisible()) {
      await roomsTab.click();
      await page.waitForTimeout(500);
    }

    // Either rooms exist or empty state — both are valid
    const content = page.locator('[class*="card"], [class*="room"], :text("No rooms")').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  test('rooms route is accessible to authenticated users', async ({ page }) => {
    await page.goto('/rooms');
    // Should not redirect to sign-in
    await expect(page).not.toHaveURL(/\/sign-in/);
  });
});
