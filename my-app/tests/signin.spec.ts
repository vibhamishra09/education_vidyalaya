import { test, expect, Page } from '@playwright/test';
import {  } from '@playwright/test';
import { describe } from 'node:test';

const loginAsParticipant = async (page: Page) => {
    await page.goto('http://localhost:3000');
    await page.waitForLoadState('networkidle')
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('learner1@gmail.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('SAFESTpass');
    await page.getByRole('button', { name: 'Continue' }).click();
}
test.describe.configure({ timeout: 40000})

test.beforeEach('Login to test account', async ({ page }, testInfo) => {
    console.log(testInfo?.annotations?.at(0)?.type);
    
    if(testInfo?.annotations?.at(0)?.type === 'participant'){
       await loginAsParticipant(page)
       return
    }
    await page.goto('http://localhost:3000', {
        waitUntil: 'networkidle'
    });
    await page.getByRole('button', { name: 'Sign In' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).click();
    await page.getByRole('textbox', { name: 'Email address' }).fill('test@gmail.com');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill('WEBYALAYA123#');
    await page.getByRole('button', { name: 'Continue' }).click();
});

async function handlePopups(page: Page) {
    let isRunning = true;

    page.on('close', () => {
        isRunning = false;
    });
    while (isRunning) {
        try {
        const btn = page.getByRole('button', { name: /not now/i });
        if (await btn.isVisible({ timeout: 1000 })) {
            await btn.click();
        }
        } catch {
        }
    }
}

test("Check Profile and Edit feature test" ,async ({page})=> {
    const userMenu = page.getByRole('button', { name: 'User menu' });
    await expect(userMenu).toBeVisible();
    await page.goto('http://localhost:3000/profile', {
        waitUntil: 'domcontentloaded'
    })

    await expect(page.getByRole('heading').first()).toContainText('PlayWright')
    await page.getByRole('button', {name :'Edit Profile'}).click()
    await page.getByRole('textbox', {name :'Display Name'}).click()
    await page.getByRole('textbox', {name :'Display Name'}).fill('EditedName')
    await page.getByRole('button', {name :'Save Changes'}).click()

    await page.getByRole('button', {name :'Edit Profile'}).click()
    await page.getByRole('textbox', {name :'Display Name'}).click()
    await page.getByRole('textbox', {name :'Display Name'}).fill('PlayWright')
    await page.getByRole('button', {name :'Save Changes'}).click()
})

test("Check existing study rooms, peers,webinars", async ({page}) => {
    handlePopups(page)
    await page.goto('http://localhost:3000/profile', {
        waitUntil: 'domcontentloaded'
    })

    await page.getByRole('link', { name: 'Browse' }).click();
    await page.getByRole('button', { name: 'Peers' }).click();
    const peer = page.getByText("View Profile").first()
    await expect(peer).toBeVisible()
    
    await page.getByRole('button', { name: 'Study Rooms' }).click();
    const room = page.getByRole('button', {name: 'Join Room'}).first()
    await expect(room).toBeVisible()

    await page.getByRole('button', { name: 'Webinars' }).click();
    const webinar = page.getByRole('button', {name: 'Register'}).first()
    await expect(webinar).toBeVisible()
})

test("Attempt to create a room, join it and chat", async ({page}) => {
    handlePopups(page)
    page.on('dialog', async (dialog) => {
        console.log(dialog.message()); 
        await dialog.accept(); 
    });
    await page.getByText('Create a Study Room').click();
    await page.getByRole('textbox', { name: 'Room Name' }).fill('auto-generated-room');
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).click();
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).fill('newskill');
    await page.getByText('newskill').click();
    await page.getByRole('switch', { name: 'Instant Session' }).click()
    const launchBtn = page.getByText('Launch Session')
    await launchBtn.scrollIntoViewIfNeeded();

    await launchBtn.click();

    await page.getByRole('button', { name: 'Enter Room' }).click();
    await page.getByRole('button', { name: 'Enter Classroom' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).fill('Test Message');
    await page.locator('.inline-flex.items-center.justify-center.gap-2').click();
    await expect(page.getByText('Test Message')).toBeVisible()

    //cleanup the room
    await page.locator('.inline-flex').first().click();
    await page.getByRole('button', { name: 'End', exact: true }).click();
    await page.getByRole('button', { name: 'Leave Room' }).click();
    await page.getByRole('button', { name: 'Cancel Session' }).click();  
});

test("Attempt to create a recurring room, test chat and remove rooms", async ({page}) => {
    handlePopups(page)
    page.on('dialog', async (dialog) => {
        console.log(dialog.message()); 
        await dialog.accept(); 
    });

    await page.getByText('Create a Study Room').click();
    await page.getByRole('textbox', { name: 'Room Name' }).fill('recurring-auto-generated');
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).click();
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).fill('newskill');
    await page.getByText('newskill').click();

    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);

    await page.locator('input[type="date"]').fill(date);
    await page.locator('input[type="time"]').fill(time);
    await page.getByRole('switch').nth(1).click()

    const launchBtn = page.getByText('Launch Session')
    await launchBtn.scrollIntoViewIfNeeded();

    await launchBtn.click();

    await page.getByRole('button', { name: 'Enter Room' }).click();
    await page.getByRole('button', { name: 'Enter Classroom' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).fill('Test Message');
    await page.locator('.inline-flex.items-center.justify-center.gap-2').click();
    await expect(page.getByText('Test Message')).toBeVisible()

    //cleanup the room
    await page.locator('.inline-flex').first().click();
    await page.getByRole('button', { name: 'End', exact: true }).click();
    await page.getByRole('button', { name: 'Leave Room' }).click();
    await page.getByRole('button', { name: 'Cancel Session' }).click();  
})

describe("Debate room creation and chat testing", () => {
    test.describe.configure({mode: 'default'})
    test("Debate room creation by moderator", async ({page}) => {
        handlePopups(page)
        await page.getByRole('link', { name: 'Browse' }).click();
        await page.getByRole('button', { name: 'Debate Rooms' }).click();
        await page.getByRole('button', { name: 'Create Debate' }).click();
        await page.getByRole('textbox', { name: 'Topic *' }).fill('Social media ban below 16');
        await page.getByRole('button', { name: 'Create now' }).click();
        await page.getByRole('button', { name: 'Enter Debate Room' }).click();
        await page.getByRole('button', { name: 'Chat' }).click();
        
        await page.getByRole('textbox', { name: 'Type a message...' }).click();
        await page.getByRole('textbox', { name: 'Type a message...' }).fill('Message from Moderator');
        await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click()
    })

    test("Joining as For and confirm chats", { annotation: { type: 'participant' } }, async ({page}) => {
        handlePopups(page)
        await page.getByRole('link', { name: 'Browse' }).click();
        await page.getByRole('button', { name: 'Debate Rooms' }).click();
        await page.getByText('Social media ban below 16').first().click()
        await page.getByRole('button', {name: 'Auto-assign me to a team'}).click()
        await page.getByRole('button', { name : 'Enter Debate Room'}).click()
        await page.getByRole('button', { name: 'Chat' }).click();

        await expect(page.getByText('Message from Moderator')).toBeVisible()
    })
})
