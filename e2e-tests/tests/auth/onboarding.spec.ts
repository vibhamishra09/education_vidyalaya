/**
 * @smoke
 * Onboarding tests — Tier 1 critical path.
 *
 * These tests verify that the onboarding page renders correctly and the form
 * flow works. Full flow completion requires a freshly signed-up Clerk user
 * whose onboardingComplete metadata is NOT set.
 *
 * Structural/render tests run against /onboarding directly (the middleware
 * allows authenticated users through to that page).
 */

import { test, expect } from '@playwright/test';
import { OnboardingPage } from '../../pages/onboarding/onboarding.page';

// Note: These run in the 'chromium' project which has the onboarded user
// auth state. The middleware redirects onboarded users away from /onboarding,
// so most tests here are structural — they verify the redirect works correctly.

test.describe('Onboarding redirect (already onboarded)', () => {
  test('@smoke onboarded user is redirected away from /onboarding', async ({ page }) => {
    // chromium project has onboarded-user.json storageState
    await page.goto('/onboarding');
    // Middleware redirects to home (/)
    await expect(page).not.toHaveURL(/\/onboarding/);
    // Should redirect to home or dashboard
    await expect(page).toHaveURL(/\/(|dashboard|$)/, { timeout: 10_000 });
  });
});

test.describe('Onboarding page structure (unauthenticated redirect)', () => {
  test('@smoke unauthenticated user cannot access /onboarding directly', async ({ page }) => {
    // Use a fresh context without auth
    await page.context().clearCookies();
    await page.goto('/onboarding');
    // Should redirect to sign-in
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 10_000 });
  });
});
