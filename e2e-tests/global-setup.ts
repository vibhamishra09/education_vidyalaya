/**
 * global-setup.ts — Playwright globalSetup function
 *
 * Runs once before ALL tests, regardless of --grep filters.
 * Signs in the test user via the Clerk UI and saves browser storage state
 * so tests can skip the login flow.
 *
 * Referenced in playwright.config.ts as `globalSetup: './global-setup'`.
 */

import { chromium, FullConfig } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env.test') });

const AUTH_STATE_DIR = path.join(__dirname, 'fixtures/auth-state');
const ONBOARDED_USER_FILE = path.join(AUTH_STATE_DIR, 'onboarded-user.json');

export default async function globalSetup(config: FullConfig) {
  // Create auth-state dir if it doesn't exist
  if (!fs.existsSync(AUTH_STATE_DIR)) {
    fs.mkdirSync(AUTH_STATE_DIR, { recursive: true });
  }

  // Skip if valid auth state already exists (speed up re-runs)
  if (fs.existsSync(ONBOARDED_USER_FILE)) {
    const stat = fs.statSync(ONBOARDED_USER_FILE);
    const ageMs = Date.now() - stat.mtimeMs;
    if (ageMs < 30 * 60 * 1000) {
      console.log('[setup] Reusing existing auth state (< 30 min old)');
      return;
    }
  }

  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      '[setup] TEST_USER_EMAIL and TEST_USER_PASSWORD must be set in .env.test\n' +
        'Copy .env.test.example to .env.test and fill in your values.'
    );
  }

  // Derive baseURL from the first project that has one set
  const baseURL =
    process.env.BASE_URL ??
    (config.projects.find((p) => p.use?.baseURL)?.use?.baseURL as string | undefined) ??
    'http://localhost:3000';

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log(`[setup] Signing in as ${email} on ${baseURL}`);
    await page.goto(`${baseURL}/sign-in`);

    // Clerk embedded sign-in — email step
    const emailInput = page.locator('input[name="identifier"], input[type="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 20_000 });
    await emailInput.fill(email);
    // Press Enter to submit the email step (avoids hidden aria-hidden submit buttons)
    await emailInput.press('Enter');

    // Password step
    const passwordInput = page.locator('input[type="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 15_000 });
    await passwordInput.fill(password);
    // Press Enter to submit (most reliable across Clerk form layouts)
    await passwordInput.press('Enter');

    // Wait for redirect away from sign-in
    await page.waitForURL((url) => !url.pathname.startsWith('/sign-in'), {
      timeout: 30_000,
    });

    // Save storage state (cookies + localStorage)
    await context.storageState({ path: ONBOARDED_USER_FILE });
    console.log(`[setup] Auth state saved → ${ONBOARDED_USER_FILE}`);
  } finally {
    await browser.close();
  }
}
