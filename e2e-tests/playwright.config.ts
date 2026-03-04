import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: './tests',
  globalSetup: './global-setup',
  globalTeardown: './global-teardown',

  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    // Main chromium project — uses saved auth from globalSetup.
    // Excludes auth specs that need a fresh (unauthenticated) browser.
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: './fixtures/auth-state/onboarded-user.json',
      },
      testIgnore: /tests\/auth\/(sign-in|sign-up)\.spec\.ts/,
    },

    // New user flows — fresh browser (no pre-existing session).
    // Runs sign-in, sign-up, and onboarding specs only.
    {
      name: 'chromium-new-user',
      use: {
        ...devices['Desktop Chrome'],
      },
      testMatch: /tests\/auth\/(sign-in|sign-up|onboarding)\.spec\.ts/,
    },

    // Mobile viewport
    {
      name: 'mobile',
      use: {
        ...devices['Pixel 5'],
        storageState: './fixtures/auth-state/onboarded-user.json',
      },
    },
  ],

  webServer: process.env.CI
    ? {
        command: 'pnpm --filter my-app dev',
        url: BASE_URL,
        reuseExistingServer: false,
        timeout: 120_000,
        cwd: '..',
      }
    : undefined,
});
