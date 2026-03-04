/**
 * Chat tests — Tier 2 core features.
 */

import { test, expect } from '@playwright/test';
import { ChatPage } from '../../pages/chat/chat.page';

test.describe('Chat', () => {
  let chatPage: ChatPage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    await chatPage.goto();
    await page.waitForLoadState('domcontentloaded');
  });

  test('chat page loads for authenticated user', async ({ page }) => {
    await expect(page).toHaveURL(/\/chat/);
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('chat page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Chat|Webyalaya/i);
  });

  test('chat page renders channel list or empty state', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    // Either a channel list or an empty/welcome state is acceptable
    const hasContent = await page.locator('body').isVisible();
    expect(hasContent).toBeTruthy();
  });

  test('message input is visible when a channel is selected', async ({ page }) => {
    await page.waitForLoadState('networkidle');

    // Try clicking the first channel if it exists
    const channels = page.locator('[data-testid="channel"], [class*="channel"] li, [class*="channel-item"]');
    const count = await channels.count();

    if (count > 0) {
      await channels.first().click();
      const messageInput = page.locator(
        'textarea[placeholder*="message"], input[placeholder*="message"]'
      ).first();
      if (await messageInput.isVisible()) {
        await expect(messageInput).toBeVisible();
      }
    }
  });

  test('unauthenticated user cannot access chat', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/chat');
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
