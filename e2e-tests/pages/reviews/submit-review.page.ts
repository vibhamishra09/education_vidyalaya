import { Page, expect } from '@playwright/test';
import { BasePage } from '../base.page';

export class SubmitReviewPage extends BasePage {
  readonly ratingStars = this.page.locator('[data-testid="rating-star"], button[aria-label*="star"], [class*="star"]');
  readonly commentTextarea = this.page.locator('textarea[name="comment"], textarea[placeholder*="review"], textarea').first();
  readonly submitButton = this.page.locator('button[type="submit"], button:has-text("Submit Review"), button:has-text("Submit")').first();

  async goto(sessionId: string): Promise<void> {
    await this.navigate(`/submit-review?sessionId=${sessionId}`);
    await this.page.waitForLoadState('domcontentloaded');
  }

  async setRating(stars: number): Promise<void> {
    const star = this.ratingStars.nth(stars - 1);
    await star.waitFor({ state: 'visible', timeout: 10_000 });
    await star.click();
  }

  async fillComment(comment: string): Promise<void> {
    await this.commentTextarea.waitFor({ state: 'visible', timeout: 10_000 });
    await this.commentTextarea.fill(comment);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  async submitReview(rating: number, comment: string): Promise<void> {
    await this.setRating(rating);
    await this.fillComment(comment);
    await this.submit();
  }

  async expectOnReviewPage(): Promise<void> {
    await expect(this.page).toHaveURL(/\/submit-review/);
  }
}
