import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class NotificationsPage extends BasePage {
  readonly notificationsList = this.page.locator('[data-testid="notifications-list"], [class*="notification-list"]');
  readonly notificationItems = this.page.locator('[data-testid="notification-item"], [class*="notification-item"]');
  readonly markAllReadButton = this.page.locator('button:has-text("Mark all read"), button:has-text("Mark all as read")').first();
  readonly unreadBadge = this.page.locator('[data-testid="unread-badge"], [class*="unread-badge"]').first();

  async goto(): Promise<void> {
    await this.navigate('/notifications');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async getNotificationCount(): Promise<number> {
    await this.page.waitForLoadState('networkidle');
    return this.notificationItems.count();
  }

  async markAllAsRead(): Promise<void> {
    if (await this.markAllReadButton.isVisible()) {
      await this.markAllReadButton.click();
    }
  }

  async clickNotification(index = 0): Promise<void> {
    await this.notificationItems.nth(index).click();
  }

  async getUnreadCount(): Promise<number> {
    if (!(await this.unreadBadge.isVisible())) return 0;
    const text = await this.unreadBadge.textContent();
    return parseInt(text?.trim() ?? '0') || 0;
  }

  async expectNotificationsLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/notifications/);
  }
}
