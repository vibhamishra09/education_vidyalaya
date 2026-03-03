import { Page } from '@playwright/test';
import { StudyRoomPage } from '../study-room/study-room.page';

export class DebateRoomPage extends StudyRoomPage {
  readonly debateTimer = this.page.locator('[data-testid="debate-timer"], [class*="timer"]').first();
  readonly currentSpeaker = this.page.locator('[data-testid="current-speaker"]').first();
  readonly raiseHandButton = this.page.locator('button:has-text("Raise Hand"), button[aria-label*="raise hand"]').first();

  async raiseHand(): Promise<void> {
    await this.raiseHandButton.click();
  }

  async getTimerValue(): Promise<string> {
    return this.debateTimer.textContent().then((t) => t?.trim() ?? '');
  }
}
