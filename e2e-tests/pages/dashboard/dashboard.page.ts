import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class DashboardPage extends BasePage {
  // Metric cards
  readonly metricsContainer = this.page.locator('[data-testid="metrics"], .metric-card, [class*="metric"]');
  readonly coinsDisplay = this.page.locator(':text("Coins"), :text("Webya"), [data-testid="coins"]').first();
  readonly streakDisplay = this.page.locator(':text("Streak"), [data-testid="streak"]').first();
  readonly achievementsSection = this.page.locator(':text("Achievement"), [data-testid="achievements"]').first();

  // Session widgets
  readonly upcomingSessionsSection = this.page.locator(':text("Upcoming"), [data-testid="upcoming-sessions"]').first();
  readonly sessionRequestsSection = this.page.locator(':text("Session Request"), [data-testid="session-requests"]').first();

  // Quick actions
  readonly browseButton = this.page.locator('a[href="/browse"], button:has-text("Browse")').first();
  readonly createRoomButton = this.page.locator(
    'a[href="/create-study-room"], button:has-text("Create"), button:has-text("Study Room")'
  ).first();

  async goto(): Promise<void> {
    await this.navigate('/dashboard');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async waitForDashboardLoad(): Promise<void> {
    // Wait for skeleton loaders to disappear
    await this.page.waitForFunction(() => {
      const skeletons = document.querySelectorAll('[data-slot="skeleton"], .animate-pulse');
      return skeletons.length === 0;
    }, { timeout: 15_000 });
  }

  async getCoinsBalance(): Promise<string> {
    await this.coinsDisplay.waitFor({ state: 'visible', timeout: 10_000 });
    return this.coinsDisplay.textContent().then((t) => t?.trim() ?? '0');
  }

  async getStreakCount(): Promise<string> {
    await this.streakDisplay.waitFor({ state: 'visible', timeout: 10_000 });
    return this.streakDisplay.textContent().then((t) => t?.trim() ?? '0');
  }

  async getUpcomingSessions(): Promise<number> {
    await this.upcomingSessionsSection.waitFor({ state: 'visible', timeout: 10_000 });
    const items = this.upcomingSessionsSection.locator('[data-testid="session-item"], .session-item, li');
    return items.count();
  }

  async getPendingRequests(): Promise<number> {
    const section = this.sessionRequestsSection;
    if (!(await section.isVisible())) return 0;
    const cards = section.locator('[data-testid="request-card"], .request-card');
    return cards.count();
  }

  async getAchievementCount(): Promise<number> {
    const section = this.achievementsSection;
    if (!(await section.isVisible())) return 0;
    const items = section.locator('[data-testid="achievement"], .achievement');
    return items.count();
  }

  async navigateToBrowse(): Promise<void> {
    await this.browseButton.click();
    await this.page.waitForURL(/\/browse/, { timeout: 10_000 });
  }

  async navigateToCreateRoom(): Promise<void> {
    await this.createRoomButton.click();
    await this.page.waitForURL(/\/create-study-room/, { timeout: 10_000 });
  }

  async expectDashboardLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/(dashboard|$)/);
  }
}
