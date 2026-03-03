import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class BrowsePage extends BasePage {
  readonly searchInput = this.page.locator(
    'input[placeholder*="search"], input[type="search"], input[placeholder*="Search"]'
  ).first();
  readonly skillFilterButton = this.page.locator('button:has-text("Filter"), [data-testid="skill-filter"]').first();
  readonly peerCards = this.page.locator('[data-testid="peer-card"], .peer-card, [class*="peer-card"]');
  readonly studyRoomCards = this.page.locator(
    '[data-testid="study-room-card"], .study-room-card, [class*="room-card"]'
  );
  readonly tabPeers = this.page.locator('button[role="tab"]:has-text("Peers"), [role="tab"]:has-text("Peer")').first();
  readonly tabRooms = this.page.locator(
    'button[role="tab"]:has-text("Rooms"), button[role="tab"]:has-text("Study Room")'
  ).first();
  readonly loadMoreButton = this.page.locator('button:has-text("Load more"), button:has-text("Show more")').first();

  async goto(): Promise<void> {
    await this.navigate('/browse');
    await this.page.waitForLoadState('domcontentloaded');
  }

  async searchPeers(query: string): Promise<void> {
    await this.searchInput.waitFor({ state: 'visible', timeout: 10_000 });
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // debounce
  }

  async filterBySkill(skill: string): Promise<void> {
    // Open filter dropdown / select
    const filterEl = this.page.locator(
      'select[name*="skill"], [data-testid="skill-filter"], button:has-text("Skills")'
    ).first();
    if (await filterEl.isVisible()) {
      const tag = await filterEl.evaluate((el) => el.tagName);
      if (tag === 'SELECT') {
        await filterEl.selectOption({ label: skill });
      } else {
        await filterEl.click();
        await this.page.locator(`[role="option"]:has-text("${skill}")`).click();
      }
    }
  }

  async getPeerCardCount(): Promise<number> {
    await this.page.waitForLoadState('networkidle');
    return this.peerCards.count();
  }

  async clickPeerCard(index = 0): Promise<void> {
    await this.peerCards.nth(index).click();
  }

  async getStudyRoomCards(): Promise<number> {
    await this.page.waitForLoadState('networkidle');
    return this.studyRoomCards.count();
  }

  async joinStudyRoom(roomName: string): Promise<void> {
    const card = this.page.locator(`[data-testid="study-room-card"]:has-text("${roomName}")`).first();
    const joinBtn = card.locator('button:has-text("Join"), a:has-text("Join")').first();
    await joinBtn.click();
  }

  async switchToPeersTab(): Promise<void> {
    if (await this.tabPeers.isVisible()) {
      await this.tabPeers.click();
    }
  }

  async switchToRoomsTab(): Promise<void> {
    if (await this.tabRooms.isVisible()) {
      await this.tabRooms.click();
    }
  }

  async expectBrowsePageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/\/browse/);
  }
}
