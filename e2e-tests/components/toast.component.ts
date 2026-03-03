import { Page } from '@playwright/test';

export class ToastComponent {
  constructor(private page: Page) {}

  private get container() {
    return this.page.locator('[data-sonner-toaster]');
  }

  async waitForToast(text: string, timeout = 10_000): Promise<void> {
    const toast = this.container
      .locator('[data-sonner-toast]')
      .filter({ hasText: text });
    await toast.waitFor({ state: 'visible', timeout });
  }

  async getToastMessage(): Promise<string> {
    const toast = this.container.locator('[data-sonner-toast]').last();
    return toast.textContent().then((t) => t?.trim() ?? '');
  }

  async dismissToast(): Promise<void> {
    const closeBtn = this.container.locator('button[aria-label="Close"], button[data-close-button]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  }

  async hasSuccessToast(): Promise<boolean> {
    return this.container
      .locator('[data-type="success"], [data-sonner-toast][data-type="success"]')
      .isVisible();
  }

  async hasErrorToast(): Promise<boolean> {
    return this.container
      .locator('[data-type="error"], [data-sonner-toast][data-type="error"]')
      .isVisible();
  }
}
