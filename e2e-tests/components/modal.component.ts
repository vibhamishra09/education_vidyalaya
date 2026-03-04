import { Page } from '@playwright/test';

export class ModalComponent {
  constructor(private page: Page) {}

  private get dialog() {
    return this.page.locator('[role="dialog"]').first();
  }

  async isOpen(): Promise<boolean> {
    return this.dialog.isVisible();
  }

  async getTitle(): Promise<string> {
    const title = this.dialog.locator('[data-testid="modal-title"], h2, [class*="dialog-title"]').first();
    return title.textContent().then((t) => t?.trim() ?? '');
  }

  async confirm(): Promise<void> {
    const btn = this.dialog.locator(
      'button:has-text("Confirm"), button:has-text("OK"), button:has-text("Yes"), button[data-testid="confirm"]'
    ).first();
    await btn.click();
  }

  async cancel(): Promise<void> {
    const btn = this.dialog.locator(
      'button:has-text("Cancel"), button:has-text("No"), button[aria-label="Close"]'
    ).first();
    await btn.click();
  }

  async waitForOpen(timeout = 5_000): Promise<void> {
    await this.dialog.waitFor({ state: 'visible', timeout });
  }

  async waitForClose(timeout = 5_000): Promise<void> {
    await this.dialog.waitFor({ state: 'hidden', timeout });
  }
}
