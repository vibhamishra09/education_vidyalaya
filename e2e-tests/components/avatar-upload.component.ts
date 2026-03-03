import { Page } from '@playwright/test';
import * as path from 'path';

export class AvatarUploadComponent {
  constructor(
    private page: Page,
    private container: ReturnType<Page['locator']>
  ) {}

  async uploadAvatar(filePath: string): Promise<void> {
    const input = this.container.locator('input[type="file"]').first();
    await input.setInputFiles(filePath);
    // Wait for upload to complete (spinner disappears)
    await this.container.locator('[data-testid="upload-spinner"], .animate-spin').waitFor({
      state: 'hidden',
      timeout: 30_000,
    });
  }

  async clickRandomAvatar(): Promise<void> {
    const btn = this.container.locator('button:has-text("Random"), [data-testid="random-avatar"]').first();
    await btn.click();
  }

  async getCurrentAvatarSrc(): Promise<string | null> {
    const img = this.container.locator('img').first();
    return img.getAttribute('src');
  }
}
