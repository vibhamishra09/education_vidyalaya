import { test as setup, expect } from '@playwright/test';

setup('authenticate', async ({ page }) => {
    await page.goto('/', {waitUntil:'domcontentloaded'})
    await page.waitForTimeout(3000)

    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('saxenay117@gmail.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('WEBYALAYA123#');
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.context().storageState({ path: 'storageState.moderator.json' });
});