import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class ChatPage extends BasePage {
  readonly channelList = this.page.locator('[data-testid="channel-list"], [class*="channel-list"]');
  readonly messageInput = this.page.locator(
    'textarea[placeholder*="message"], input[placeholder*="message"], [contenteditable="true"]'
  ).first();
  readonly sendButton = this.page.locator('button[type="submit"], button[aria-label="Send"], button:has-text("Send")').first();
  readonly messagesList = this.page.locator('[data-testid="messages"], [class*="message-list"]');

  async goto(): Promise<void> {
    await this.navigate('/chat');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async selectChannel(channelName: string): Promise<void> {
    await this.channelList.waitFor({ state: 'visible', timeout: 10_000 });
    const channel = this.channelList.locator(`[data-testid="channel"]:has-text("${channelName}"), li:has-text("${channelName}")`).first();
    await channel.click();
  }

  async sendMessage(text: string): Promise<void> {
    await this.messageInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.messageInput.fill(text);
    await this.sendButton.click();
  }

  async waitForMessage(text: string, timeout = 10_000): Promise<void> {
    const msg = this.messagesList.locator(`[data-testid="message"]:has-text("${text}"), .message:has-text("${text}")`).first();
    await msg.waitFor({ state: 'visible', timeout });
  }

  async getLastMessage(): Promise<string> {
    const messages = this.messagesList.locator('[data-testid="message"], .message');
    const count = await messages.count();
    if (count === 0) return '';
    return messages.last().textContent().then((t) => t?.trim() ?? '');
  }

  async expectChatLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/chat/);
  }
}
