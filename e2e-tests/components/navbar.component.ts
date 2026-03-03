import { Page } from '@playwright/test';

export class NavbarComponent {
  constructor(private page: Page) {}

  private get nav() {
    return this.page.locator('nav, [data-testid="navbar"], header').first();
  }

  async clickDashboard(): Promise<void> {
    await this.page.locator('a[href="/dashboard"], nav a:has-text("Dashboard")').first().click();
    await this.page.waitForURL(/\/dashboard/, { timeout: 10_000 });
  }

  async clickBrowse(): Promise<void> {
    await this.page.locator('a[href="/browse"], nav a:has-text("Browse")').first().click();
    await this.page.waitForURL(/\/browse/, { timeout: 10_000 });
  }

  async clickChat(): Promise<void> {
    await this.page.locator('a[href="/chat"], nav a:has-text("Chat")').first().click();
    await this.page.waitForURL(/\/chat/, { timeout: 10_000 });
  }

  async clickNotifications(): Promise<void> {
    await this.page.locator(
      'a[href="/notifications"], button[aria-label*="notification"], [data-testid="notifications-bell"]'
    ).first().click();
  }

  async clickProfile(): Promise<void> {
    await this.page.locator(
      'a[href="/profile"], [data-testid="profile-avatar"], button[aria-label*="profile"]'
    ).first().click();
  }

  async signOut(): Promise<void> {
    const userMenu = this.page.locator('[data-testid="user-menu"], button[aria-label*="user menu"]').first();
    if (await userMenu.isVisible()) {
      await userMenu.click();
    }
    await this.page.locator('button:has-text("Sign out"), a:has-text("Sign out"), button:has-text("Logout")').first().click();
    await this.page.waitForURL(/\/(sign-in|$)/, { timeout: 15_000 });
  }

  async isVisible(): Promise<boolean> {
    return this.nav.isVisible();
  }
}
