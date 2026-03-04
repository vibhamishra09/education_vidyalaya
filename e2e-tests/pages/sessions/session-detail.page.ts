import { Page } from '@playwright/test';
import { BasePage } from '../base.page';

export class SessionDetailPage extends BasePage {
  readonly acceptButton = this.page.locator('button:has-text("Accept"), button[data-testid="accept"]').first();
  readonly rejectButton = this.page.locator('button:has-text("Reject"), button[data-testid="reject"]').first();
  readonly cancelButton = this.page.locator('button:has-text("Cancel Session"), button:has-text("Cancel")').first();
  readonly sessionStatus = this.page.locator('[data-testid="session-status"], [class*="status-badge"]').first();

  async acceptSession(): Promise<void> {
    await this.acceptButton.click();
    const confirmBtn = this.page.locator('[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Accept")').first();
    if (await confirmBtn.isVisible()) await confirmBtn.click();
  }

  async rejectSession(): Promise<void> {
    await this.rejectButton.click();
  }

  async cancelSession(): Promise<void> {
    await this.cancelButton.click();
    const confirmBtn = this.page.locator('[role="dialog"] button:has-text("Confirm"), [role="dialog"] button:has-text("Cancel Session")').first();
    if (await confirmBtn.isVisible()) await confirmBtn.click();
  }

  async getStatus(): Promise<string> {
    return this.sessionStatus.textContent().then((t) => t?.trim() ?? '');
  }
}
