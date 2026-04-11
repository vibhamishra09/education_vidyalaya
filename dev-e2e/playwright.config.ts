import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,       
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI    
    ? [['github'], ['json', { outputFile: 'test-results.json' }], ['html', { open: 'never' }]]
    : [['list'], ['json', { outputFile: 'test-results.json' }], ['html', { open: 'on-failure' }]],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    actionTimeout: 30000,   
    navigationTimeout: 80000,
  },
  expect: {
    timeout: 30000,       
  },

  projects: [
    {
      name: 'setup-moderator',
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: 'setup-participant',
      testMatch: /auth\.participant\.ts/,
    },
    {
      name: 'chromium',
      testIgnore: [/auth\.setup\.ts/, /auth\.participant\.ts/],
      dependencies: ['setup-moderator', 'setup-participant'],
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'storageState.moderator.json', 
      },
    },
  ]
});