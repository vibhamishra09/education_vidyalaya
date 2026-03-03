import { Page, expect } from '@playwright/test';

export class BasePage {
  constructor(protected page: Page) {}

  async navigate(path: string): Promise<void> {
    await this.page.goto(path);
  }

  async waitForLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  async getTitle(): Promise<string> {
    return this.page.title();
  }

  async takeScreenshot(name: string): Promise<void> {
    await this.page.screenshot({ path: `test-results/screenshots/${name}.png`, fullPage: true });
  }

  async isVisible(selector: string): Promise<boolean> {
    return this.page.locator(selector).isVisible();
  }

  async waitForToast(message: string, timeout = 10_000): Promise<void> {
    const toast = this.page
      .locator('[data-sonner-toaster] [data-sonner-toast]')
      .filter({ hasText: message });
    await toast.waitFor({ state: 'visible', timeout });
  }

  async dismissModal(): Promise<void> {
    const closeBtn = this.page.locator(
      '[role="dialog"] button[aria-label="Close"], [role="dialog"] button:has-text("Cancel")'
    ).first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
    }
  }

  async expectPageTitle(title: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(title, 'i'));
  }

  async expectUrl(urlOrPattern: string | RegExp): Promise<void> {
    await expect(this.page).toHaveURL(urlOrPattern);
  }
}
