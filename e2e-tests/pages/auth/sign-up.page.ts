import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class SignUpPage extends BasePage {
  readonly emailInput = this.page.locator('input[name="emailAddress"], input[type="email"]').first();
  readonly passwordInput = this.page.locator('input[type="password"]').first();
  readonly continueButton = this.page.locator(
    'button[type="submit"]:has-text("Continue"), button:has-text("Continue")'
  ).first();
  // Email verification code input
  readonly verificationCodeInput = this.page.locator('input[name="code"]').first();

  async goto(): Promise<void> {
    await this.navigate('/sign-up');
    await this.emailInput.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.continueButton.click();
  }

  /** Fill email + password and submit. Does NOT handle email verification. */
  async signUp(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  async fillVerificationCode(code: string): Promise<void> {
    await this.verificationCodeInput.waitFor({ state: 'visible', timeout: 15_000 });
    await this.verificationCodeInput.fill(code);
    await this.continueButton.click();
  }

  async waitForRedirectToOnboarding(): Promise<void> {
    await this.page.waitForURL(/\/onboarding/, { timeout: 30_000 });
  }

  async expectOnSignUpPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-up/);
  }
}
