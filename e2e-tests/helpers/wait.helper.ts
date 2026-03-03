import { Page } from '@playwright/test';

/** Wait for network to be completely idle (no pending requests for 500ms). */
export async function waitForNetworkIdle(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/** Poll until a condition returns true, or throw on timeout. */
export async function waitUntil(
  condition: () => Promise<boolean>,
  { interval = 500, timeout = 10_000 }: { interval?: number; timeout?: number } = {}
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await condition()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error(`waitUntil timed out after ${timeout}ms`);
}

/** Wait for a Sonner/shadcn toast to appear with the given text. */
export async function waitForToast(page: Page, text: string, timeout = 10_000): Promise<void> {
  // Sonner renders toasts in a [data-sonner-toaster] container
  const toast = page
    .locator('[data-sonner-toaster] [data-sonner-toast]')
    .filter({ hasText: text });
  await toast.waitFor({ state: 'visible', timeout });
}
