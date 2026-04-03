import { test as setup, expect } from '@playwright/test';

setup('auth participant', async ({ page }) => {
  await page.goto('/', {waitUntil:'domcontentloaded'});
  await page.waitForTimeout(3000)

  await page.getByRole('button', { name: 'Sign In' }).click();
  await page.getByRole('textbox', { name: 'Email address' }).fill('learner1@gmail.com');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('textbox', { name: 'Password' }).fill('SAFESTpass');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.context().storageState({ path: 'storageState.participant.json' });
});