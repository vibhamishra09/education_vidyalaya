import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class SignInPage extends BasePage {
  // Clerk renders an embedded sign-in form with these selectors
  readonly emailInput = this.page.locator('input[name="identifier"], input[type="email"]').first();
  readonly passwordInput = this.page.locator('input[type="password"]').first();

  async goto(): Promise<void> {
    await this.navigate('/sign-in');
    await this.emailInput.waitFor({ state: 'visible', timeout: 20_000 });
  }

  async fillEmail(email: string): Promise<void> {
    await this.emailInput.fill(email);
  }

  async fillPassword(password: string): Promise<void> {
    await this.passwordInput.fill(password);
  }

  async clickContinue(): Promise<void> {
    await this.emailInput.press('Enter');
    await this.passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  }

  async submit(): Promise<void> {
    await this.passwordInput.press('Enter');
  }

  /** Full sign-in flow helper. */
  async signIn(email: string, password: string): Promise<void> {
    await this.fillEmail(email);
    await this.clickContinue();
    await this.fillPassword(password);
    await this.submit();
  }

  async waitForRedirectToDashboard(): Promise<void> {
    await this.page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), {
      timeout: 30_000,
    });
  }

  async expectOnSignInPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/sign-in/);
  }
}
