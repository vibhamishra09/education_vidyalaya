import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export interface StudyRoomData {
  name: string;
  description?: string;
  maxParticipants?: number;
  skill?: string;
  isPrivate?: boolean;
}

export class CreateStudyRoomPage extends BasePage {
  readonly roomNameInput = this.page.locator('input[name="name"], input[placeholder*="room name"], input[placeholder*="name"]').first();
  readonly descriptionTextarea = this.page.locator('textarea[name="description"], textarea[placeholder*="description"]').first();
  readonly maxParticipantsInput = this.page.locator('input[name="maxParticipants"], input[type="number"]').first();
  readonly skillInput = this.page.locator('input[placeholder*="skill"], [data-testid="skill-input"]').first();
  readonly privateToggle = this.page.locator('input[type="checkbox"][name*="private"], [data-testid="private-toggle"]').first();
  readonly submitButton = this.page.locator('button[type="submit"], button:has-text("Create Room"), button:has-text("Create")').first();

  async goto(): Promise<void> {
    await this.navigate('/create-study-room');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillRoomName(name: string): Promise<void> {
    await this.roomNameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.roomNameInput.fill(name);
  }

  async fillDescription(desc: string): Promise<void> {
    if (await this.descriptionTextarea.isVisible()) {
      await this.descriptionTextarea.fill(desc);
    }
  }

  async setMaxParticipants(n: number): Promise<void> {
    if (await this.maxParticipantsInput.isVisible()) {
      await this.maxParticipantsInput.fill(String(n));
    }
  }

  async selectSkill(skill: string): Promise<void> {
    if (await this.skillInput.isVisible()) {
      await this.skillInput.fill(skill);
      await this.page.keyboard.press('Enter');
    }
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async createRoom(data: StudyRoomData): Promise<void> {
    await this.fillRoomName(data.name);
    if (data.description) await this.fillDescription(data.description);
    if (data.maxParticipants) await this.setMaxParticipants(data.maxParticipants);
    if (data.skill) await this.selectSkill(data.skill);
    await this.submit();
  }

  async waitForRoomCreated(): Promise<void> {
    await this.page.waitForURL(/\/(studyroom|rooms)\//, { timeout: 30_000 });
  }

  async expectOnCreatePage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/create-study-room/);
  }
}
