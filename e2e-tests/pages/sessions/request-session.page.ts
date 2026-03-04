import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class RequestSessionPage extends BasePage {
  readonly skillSelect = this.page.locator('select[name="skill"], [data-testid="skill-select"]').first();
  readonly skillInput = this.page.locator('input[name="skill"], input[placeholder*="skill"]').first();
  readonly messageTextarea = this.page.locator('textarea[name="message"], textarea[placeholder*="message"]').first();
  readonly dateInput = this.page.locator('input[type="date"], input[name="date"]').first();
  readonly timeInput = this.page.locator('input[type="time"], input[name="time"]').first();
  readonly submitButton = this.page.locator('button[type="submit"], button:has-text("Request"), button:has-text("Send Request")').first();

  async goto(peerId?: string): Promise<void> {
    if (peerId) {
      await this.navigate(`/request-session?peerId=${peerId}`);
    } else {
      await this.navigate('/request-session');
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectSkill(skill: string): Promise<void> {
    const selectEl = this.skillSelect;
    if (await selectEl.isVisible()) {
      await selectEl.selectOption({ label: skill });
    } else if (await this.skillInput.isVisible()) {
      await this.skillInput.fill(skill);
    }
  }

  async fillMessage(message: string): Promise<void> {
    await this.messageTextarea.waitFor({ state: 'visible', timeout: 10_000 });
    await this.messageTextarea.fill(message);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async requestSession(skill: string, message: string): Promise<void> {
    await this.selectSkill(skill);
    await this.fillMessage(message);
    await this.submit();
  }

  async waitForSuccess(): Promise<void> {
    await this.waitForToast('request');
  }

  async expectOnRequestPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/request-session/);
  }
}
