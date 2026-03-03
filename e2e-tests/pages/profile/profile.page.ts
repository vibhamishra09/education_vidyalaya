import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ProfilePage extends BasePage {
  readonly userName = this.page.locator('[data-testid="profile-name"], h1, h2').first();
  readonly skillsList = this.page.locator('[data-testid="skills-list"], [class*="skill-badge"]');
  readonly statsSection = this.page.locator('[data-testid="profile-stats"], [class*="stat"]');
  readonly editProfileButton = this.page.locator('button:has-text("Edit Profile"), button:has-text("Edit")').first();
  readonly requestSessionButton = this.page.locator(
    'button:has-text("Request Session"), a:has-text("Request Session")'
  ).first();

  async goto(userId?: string): Promise<void> {
    if (userId) {
      await this.navigate(`/profile/${userId}`);
    } else {
      await this.navigate('/profile');
    }
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getUserName(): Promise<string> {
    await this.userName.waitFor({ state: 'visible', timeout: 10_000 });
    return this.userName.textContent().then((t) => t?.trim() ?? '');
  }

  async getSkills(): Promise<string[]> {
    await this.page.waitForLoadState('networkidle');
    const skills = await this.skillsList.allTextContents();
    return skills.map((s) => s.trim()).filter(Boolean);
  }

  async getStats(): Promise<Record<string, string>> {
    const stats: Record<string, string> = {};
    const items = this.statsSection.locator('[data-testid="stat-item"], [class*="stat-item"]');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      const item = items.nth(i);
      const label = await item.locator('[class*="label"], span:first-child').textContent();
      const value = await item.locator('[class*="value"], span:last-child').textContent();
      if (label) stats[label.trim()] = value?.trim() ?? '';
    }
    return stats;
  }

  async editProfile(): Promise<void> {
    await this.editProfileButton.click();
  }

  async requestSession(): Promise<void> {
    await this.requestSessionButton.click();
  }

  async expectProfileLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/profile/);
  }
}
