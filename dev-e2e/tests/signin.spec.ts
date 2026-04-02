import { test, expect, Page } from '@playwright/test';

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

test.describe.configure({timeout: 60000,})

test("Check Profile and Edit feature test" ,async ({page})=> {
    await page.goto('http://localhost:3000/profile', {
        waitUntil: 'networkidle'
    })

    await expect(page.getByRole('heading', { name: 'PlayWright' })).toBeVisible()
    // await page.getByRole('button', {name :'Edit Profile'}).click()
    // await page.getByRole('textbox', {name :'Display Name'}).click()
    // await page.getByRole('textbox', {name :'Display Name'}).fill('EditedName')
    // await page.getByRole('button', {name :'Save Changes'}).click()

    // await page.getByRole('button', {name :'Edit Profile'}).click()
    // await page.getByRole('textbox', {name :'Display Name'}).click()
    // await page.getByRole('textbox', {name :'Display Name'}).fill('PlayWright')
    // await page.getByRole('button', {name :'Save Changes'}).click()
})

test("Check existing study rooms, peers,webinars", async ({page}) => {
    await page.goto('http://localhost:3000/profile', {
        waitUntil: 'networkidle'
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
    const webinarCount = await webinar.count();

    if (webinarCount > 0) {
        await expect(webinar).toBeVisible();
    } else {
        console.log('No webinars available, skipping...');
    }

})

test("Attempt to create a room, join it and chat", async ({page}) => {
    handlePopups(page)
    await page.goto('http://localhost:3000/create-study-room', {
        waitUntil: 'networkidle'
    })
    await page.getByRole('textbox', { name: 'Room Name' }).fill('auto-generated-room');
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).click();
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).fill('newskill');
    await page.getByText('newskill').click();
    await page.getByRole('switch', { name: 'Instant Session' }).click()

  
    const launchBtn = page.getByRole('button', {name: 'Launch Session'})
    await launchBtn.scrollIntoViewIfNeeded();

    await launchBtn.click();

    await page.getByRole('button', { name: 'Enter Room' }).click();
    await expect(page.getByRole('button', { name: 'Enter Classroom' })).toBeVisible()

    const roomUrl= page.url()
    console.log(roomUrl);
    
    await page.getByRole('button', { name: 'Enter Classroom' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).fill('Test Message');
    await page.locator('.inline-flex.items-center.justify-center.gap-2').click();
    await expect(page.getByText('Test Message')).toBeVisible()

    //cleanup the room
    await page.locator('.inline-flex').first().click();
    await page.getByRole('button', { name: 'End', exact: true }).click();
    await page.goto(roomUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Cancel Session' }).click()
});

test("Attempt to create a recurring room, test chat and remove rooms", async ({page}) => {
    handlePopups(page)
    page.on('dialog', async (dialog) => {
    console.log("dialog : ", dialog.type());
    
        
    if (dialog.type() === 'prompt') {
        await dialog.accept('3'); 
    } 
    else {
        await dialog.accept();
    }
    });
    await page.goto('http://localhost:3000/create-study-room', {
        waitUntil: 'networkidle'
    })
    await page.getByRole('textbox', { name: 'Room Name' }).fill('recurring-auto-generated');
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).click();
    await page.getByRole('textbox', { name: 'Type a skill (e.g. React,' }).fill('newskill');
    await page.getByText('newskill').click();

    const now = new Date();
    const date = now.toLocaleDateString('en-CA');
    const time = now.toTimeString().slice(0, 5);

    await page.locator('input[type="date"]').fill(date);
    await page.locator('input[type="time"]').fill(time);
    await page.getByRole('switch').nth(1).click()

   
    const launchBtn = page.getByRole('button', {name: 'Launch Session'})
    await launchBtn.scrollIntoViewIfNeeded();

    await launchBtn.click();

    await page.getByRole('button', { name: 'Enter Room' }).click();
    await expect(page.getByRole('button', { name: 'Enter Classroom' })).toBeVisible()

    const roomUrl= page.url()
    console.log(roomUrl);
    await page.getByRole('button', { name: 'Enter Classroom' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).click();
    await page.getByRole('textbox', { name: 'Type a message...' }).fill('Test Message');
    await page.locator('.inline-flex.items-center.justify-center.gap-2').click();
    await expect(page.getByText('Test Message')).toBeVisible()

    //cleanup the room
    await page.locator('.inline-flex').first().click();
    await page.getByRole('button', { name: 'End', exact: true }).click()
    await page.goto(roomUrl);
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Cancel Session' }).click()
})

test.describe("Debate room creation and chat testing", () => {
    test.describe.configure({mode: 'serial'})
    test("Debate room creation by moderator", async ({page}) => {
        await page.goto('http://localhost:3000/', {
            waitUntil: 'networkidle'
        })
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

    test.describe("participant tests", () => {
        test.use({ storageState: 'storageState.participant.json' });

        test("Joining as For and confirm chats", async ({ page }) => {
            await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
            handlePopups(page)
            await page.getByRole('link', { name: 'Browse' }).click();
            await page.getByRole('button', { name: 'Debate Rooms' }).click();
            await page.getByText('Social media ban below 16').first().click()
            await page.getByRole('button', { name: 'Auto-assign me to a team' }).click()
            await page.getByRole('button', { name: 'Enter Debate Room' }).click()
            await page.getByRole('button', { name: 'Chat' }).click();
            await expect(page.getByText('Message from Moderator')).toBeVisible()
        })
    })

})

    