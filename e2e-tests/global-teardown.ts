/**
 * global-teardown.ts — Playwright globalTeardown function
 *
 * Runs once after ALL tests complete.
 * Add cleanup here (e.g. deleting ephemeral Clerk test users).
 *
 * Referenced in playwright.config.ts as `globalTeardown: './global-teardown'`.
 */

export default async function globalTeardown() {
  // Currently a no-op.
  // To clean up Clerk users created during sign-up tests:
  //   import { deleteClerkUser, findUserByEmail } from './helpers/clerk.helper';
  //   const user = await findUserByEmail('e2e+...@webyalaya.test');
  //   if (user) await deleteClerkUser(user.id);
  console.log('[teardown] Done.');
}
