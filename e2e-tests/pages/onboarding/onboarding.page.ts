import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export interface OnboardingProfile {
  displayName: string;
  bio?: string;
  location?: string;
  school?: string;
}

export interface OnboardingSkills {
  have: string[];
  want: string[];
}

export class OnboardingPage extends BasePage {
  // Step 1 — Profile
  readonly displayNameInput = this.page.locator('input[placeholder*="display name"], input[placeholder*="name"]').first();
  readonly bioTextarea = this.page.locator('textarea[placeholder*="bio"], textarea[placeholder*="about"]').first();
  readonly locationInput = this.page.locator('input[placeholder*="location"], input[placeholder*="city"]').first();
  readonly schoolInput = this.page.locator('input[placeholder*="school"], input[placeholder*="university"]').first();
  readonly randomAvatarButton = this.page.locator('button:has-text("Random"), button[aria-label*="random"]').first();
  readonly nextButton = this.page.locator('button:has-text("Next"), button:has-text("Continue")').first();
  readonly completeButton = this.page.locator('button:has-text("Complete"), button:has-text("Finish"), button:has-text("Get started")').first();

  async goto(): Promise<void> {
    await this.navigate('/onboarding');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async fillDisplayName(name: string): Promise<void> {
    await this.displayNameInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.displayNameInput.clear();
    await this.displayNameInput.fill(name);
  }

  async fillBio(bio: string): Promise<void> {
    const textarea = this.bioTextarea;
    if (await textarea.isVisible()) {
      await textarea.fill(bio);
    }
  }

  async fillLocation(location: string): Promise<void> {
    const input = this.locationInput;
    if (await input.isVisible()) {
      await input.fill(location);
    }
  }

  async fillSchool(school: string): Promise<void> {
    const input = this.schoolInput;
    if (await input.isVisible()) {
      await input.fill(school);
    }
  }

  async selectRandomAvatar(): Promise<void> {
    const btn = this.randomAvatarButton;
    if (await btn.isVisible()) {
      await btn.click();
    }
  }

  async clickNext(): Promise<void> {
    await this.nextButton.click();
  }

  /** Add a skill to the "Skills I Have" input. */
  async addSkillIHave(skill: string): Promise<void> {
    // SkillInput component — look for the input in the "skills i have" section
    const section = this.page.locator(':text("skills i have"), :text("I can teach"), :text("I have")').first();
    const skillInput = section.locator('input').first();

    if (await skillInput.isVisible()) {
      await skillInput.fill(skill);
      await this.page.keyboard.press('Enter');
    } else {
      // Fallback: find the first skill input
      const inputs = this.page.locator('input[placeholder*="skill"], input[placeholder*="add skill"]');
      await inputs.first().fill(skill);
      await this.page.keyboard.press('Enter');
    }
  }

  /** Add a skill to the "Skills I Want" input. */
  async addSkillIWant(skill: string): Promise<void> {
    const section = this.page.locator(':text("skills i want"), :text("I want to learn"), :text("I want")').first();
    const skillInput = section.locator('input').first();

    if (await skillInput.isVisible()) {
      await skillInput.fill(skill);
      await this.page.keyboard.press('Enter');
    } else {
      // Fallback: find the second skill input
      const inputs = this.page.locator('input[placeholder*="skill"], input[placeholder*="add skill"]');
      await inputs.last().fill(skill);
      await this.page.keyboard.press('Enter');
    }
  }

  /** Complete the full onboarding flow. */
  async completeOnboarding(profile: OnboardingProfile, skills: OnboardingSkills): Promise<void> {
    await this.fillDisplayName(profile.displayName);
    if (profile.bio) await this.fillBio(profile.bio);
    if (profile.location) await this.fillLocation(profile.location);
    if (profile.school) await this.fillSchool(profile.school);
    await this.selectRandomAvatar();

    await this.clickNext();

    // Step 2 — Skills
    for (const skill of skills.have) {
      await this.addSkillIHave(skill);
    }
    for (const skill of skills.want) {
      await this.addSkillIWant(skill);
    }

    // Complete / finish button
    const finishBtn = this.completeButton;
    await finishBtn.waitFor({ state: 'visible', timeout: 5_000 });
    await finishBtn.click();
  }

  async waitForDashboard(): Promise<void> {
    await this.page.waitForURL(/\/(dashboard|$)/, { timeout: 30_000 });
  }

  async expectOnOnboardingPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/onboarding/);
  }
}
