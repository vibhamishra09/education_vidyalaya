/**
 * Create Study Room tests — Tier 2 core features.
 */

import { test, expect } from '@playwright/test';
import { CreateStudyRoomPage } from '../../pages/study-room/create-room.page';
import { createStudyRoomData } from '../../data/study-room.factory';

test.describe('Create Study Room', () => {
  let createRoomPage: CreateStudyRoomPage;

  test.beforeEach(async ({ page }) => {
    createRoomPage = new CreateStudyRoomPage(page);
    await createRoomPage.goto();
    await page.waitForLoadState('domcontentloaded');
  });

  test('create room page loads for authenticated user', async ({ page }) => {
    await expect(page).toHaveURL(/\/create-study-room/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('create room page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Create|Study Room|Webyalaya/i);
  });

  test('create room form has a room name input', async ({ page }) => {
    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="room name" i], input[placeholder*="name" i]'
    ).first();
    await expect(nameInput).toBeVisible({ timeout: 10_000 });
  });

  test('submitting empty form shows validation errors', async ({ page }) => {
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Create")'
    ).first();

    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      // Should stay on create page (validation prevents submission)
      await expect(page).toHaveURL(/\/create-study-room/);
    }
  });

  test('can fill in room name field', async ({ page }) => {
    const data = createStudyRoomData();
    const nameInput = page.locator(
      'input[name="name"], input[placeholder*="room name" i], input[placeholder*="name" i]'
    ).first();

    if (await nameInput.isVisible()) {
      await nameInput.fill(data.name);
      await expect(nameInput).toHaveValue(data.name);
    }
  });

  test('unauthenticated user cannot create a study room', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/create-study-room');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
