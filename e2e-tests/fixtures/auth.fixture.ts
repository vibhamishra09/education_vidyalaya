import { test as base, BrowserContext } from '@playwright/test';
import * as path from 'path';

export type AuthFixtures = {
  /** A context authenticated as the onboarded test user. */
  authedContext: BrowserContext;
};

export const test = base.extend<AuthFixtures>({
  authedContext: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: path.join(__dirname, 'auth-state/onboarded-user.json'),
    });
    await use(context);
    await context.close();
  },
});

export { expect } from '@playwright/test';
