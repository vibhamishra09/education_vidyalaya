/**
 * @smoke
 * Sign-in tests — Tier 1 critical path.
 *
 * These tests run in the 'chromium-new-user' project (no pre-saved auth state)
 * so they exercise the real Clerk sign-in flow.
 */

import { test, expect } from '@playwright/test';
import { SignInPage } from '../../pages/auth/sign-in.page';

test.describe('Sign In', () => {
  let signInPage: SignInPage;

  test.beforeEach(async ({ page }) => {
    signInPage = new SignInPage(page);
    await signInPage.goto();
  });

  test('@smoke renders the sign-in form', async ({ page }) => {
    await expect(page).toHaveURL(/\/sign-in/);
    await expect(signInPage.emailInput).toBeVisible();
  });

  test('@smoke sign in with valid credentials redirects to app', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;

    if (!email || !password) {
      test.skip(true, 'TEST_USER_EMAIL / TEST_USER_PASSWORD not set');
      return;
    }

    await signInPage.signIn(email, password);
    await signInPage.waitForRedirectToDashboard();

    // Should land on dashboard or home — not sign-in
    await expect(page).not.toHaveURL(/\/sign-in/);
  });

  test('@smoke invalid credentials shows error', async ({ page }) => {
    await signInPage.fillEmail('nobody@nowhere.test');
    await signInPage.clickContinue();
    await signInPage.fillPassword('wrongpassword');
    await signInPage.submit();

    // Clerk shows an inline error message
    const errorMsg = page.locator('[class*="error"], [data-testid*="error"], .cl-formFieldErrorText').first();
    await errorMsg.waitFor({ state: 'visible', timeout: 10_000 });
    expect(await errorMsg.textContent()).toBeTruthy();
  });

  test('sign-in page has correct title', async ({ page }) => {
    await expect(page).toHaveTitle(/Sign In|Webyalaya/i);
  });

  test('sign-in page has link to sign-up', async ({ page }) => {
    const signUpLink = page.locator('a[href*="/sign-up"]').first();
    await expect(signUpLink).toBeVisible();
  });
});

test.describe('Auth redirects (unauthenticated)', () => {
  test('protected route redirects to sign-in', async ({ page }) => {
    // Ensure no auth state
    await page.context().clearCookies();
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test('protected sessions route redirects to sign-in', async ({ page }) => {
    await page.context().clearCookies();
    await page.goto('/sessions');
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
