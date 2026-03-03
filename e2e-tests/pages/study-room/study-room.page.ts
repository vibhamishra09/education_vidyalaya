import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class StudyRoomPage extends BasePage {
  readonly micButton = this.page.locator('[data-testid="mic-toggle"], button[aria-label*="mic"], button[aria-label*="Mic"]').first();
  readonly cameraButton = this.page.locator('[data-testid="camera-toggle"], button[aria-label*="camera"], button[aria-label*="Camera"]').first();
  readonly leaveButton = this.page.locator('button:has-text("Leave"), button[aria-label*="leave"]').first();
  readonly chatButton = this.page.locator('button:has-text("Chat"), button[aria-label*="chat"]').first();
  readonly participantCount = this.page.locator('[data-testid="participant-count"], [class*="participant-count"]').first();
  readonly roomTitle = this.page.locator('[data-testid="room-title"], h1, h2').first();

  async waitForRoomLoad(timeout = 30_000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded');
    // Wait for either video elements or a loading spinner to disappear
    await this.page.waitForFunction(
      () => !document.querySelector('[data-testid="loading-spinner"]'),
      { timeout }
    );
  }

  async toggleMic(): Promise<void> {
    await this.micButton.click();
  }

  async toggleCamera(): Promise<void> {
    await this.cameraButton.click();
  }

  async openChat(): Promise<void> {
    await this.chatButton.click();
  }

  async leaveRoom(): Promise<void> {
    await this.leaveButton.click();
    // Handle confirmation dialog if present
    const confirmBtn = this.page.locator('[role="dialog"] button:has-text("Leave"), [role="dialog"] button:has-text("Confirm")').first();
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
    }
  }

  async getParticipantCount(): Promise<number> {
    const text = await this.participantCount.textContent();
    const match = text?.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }
}
