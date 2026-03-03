import { Page } from '@playwright/test';
import { ChatPage } from './chat.page';

/** Represents a specific channel within the chat. Extends ChatPage. */
export class ChannelPage extends ChatPage {
  readonly channelHeader = this.page.locator('[data-testid="channel-header"], [class*="channel-header"]').first();
  readonly typingIndicator = this.page.locator('[data-testid="typing-indicator"], [class*="typing"]').first();

  async getChannelName(): Promise<string> {
    await this.channelHeader.waitFor({ state: 'visible', timeout: 5_000 });
    return this.channelHeader.textContent().then((t) => t?.trim() ?? '');
  }

  async waitForTypingIndicator(timeout = 5_000): Promise<void> {
    await this.typingIndicator.waitFor({ state: 'visible', timeout });
  }
}
