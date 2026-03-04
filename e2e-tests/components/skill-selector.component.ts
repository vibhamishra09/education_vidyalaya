import { Page } from '@playwright/test';

export class SkillSelectorComponent {
  constructor(
    private page: Page,
    private container: ReturnType<Page['locator']>
  ) {}

  async addSkill(skill: string): Promise<void> {
    const input = this.container.locator('input').first();
    await input.fill(skill);
    await this.page.keyboard.press('Enter');
    // Wait for the skill chip to appear
    await this.container.locator(`[data-testid="skill-chip"]:has-text("${skill}"), .skill-badge:has-text("${skill}")`).waitFor({ state: 'visible', timeout: 5_000 });
  }

  async removeSkill(skill: string): Promise<void> {
    const chip = this.container.locator(`[data-testid="skill-chip"]:has-text("${skill}"), .skill-badge:has-text("${skill}")`).first();
    const removeBtn = chip.locator('button, [aria-label*="remove"]').first();
    await removeBtn.click();
  }

  async getSkills(): Promise<string[]> {
    const chips = this.container.locator('[data-testid="skill-chip"], .skill-badge');
    return chips.allTextContents().then((texts) => texts.map((t) => t.trim()).filter(Boolean));
  }
}
