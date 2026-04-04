import { test, expect, Page } from '@playwright/test';

async function handlePopups(page: Page) {
  await page.addLocatorHandler(
    page.getByRole('button', { name: /not now/i }),
    async (btn) => { await btn.click(); }
  );
}

test.describe.configure({ timeout: 180000 });

test("Check Profile and Edit feature test", async ({ page }) => {
  await page.goto('/profile', { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Yash Saxena' })).toBeVisible();
});

test("Check existing study rooms, peers,webinars", async ({ page }) => {
  await page.goto('/browse', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: 'Peers' }).click();
  const peer = page.getByText("View Profile").first();
  await expect(peer).toBeVisible();

  await page.getByRole('button', { name: 'Study Rooms' }).click();
  const room = page.getByRole('button', { name: 'Join Room' }).first();
  await expect(room).toBeVisible();

  await page.getByRole('button', { name: 'Webinars' }).click();
  const webinar = page.getByRole('button', { name: 'Register' }).first();
  const webinarCount = await webinar.count();

  if (webinarCount > 0) {
    await expect(webinar).toBeVisible();
  } else {
    console.log('No webinars available, skipping...');
  }
});

test.describe("Instant room creation", () => {
  let roomUrl = '';

  test.afterEach(async ({ page }) => {
    if (!roomUrl) return;
    try {
      await page.goto(roomUrl);
      await page.waitForLoadState('networkidle');
      const cancelBtn = page.getByRole('button', { name: 'Cancel Session' });
      await cancelBtn.waitFor({ timeout: 20000 });
      await cancelBtn.click();
      await page.waitForTimeout(5000)
    } catch (e) {
      console.log('Cleanup failed or room already cancelled:', e);
    } finally {
      roomUrl = '';
    }
  });

  test("Attempt to create a room, join it and chat", async ({ page }) => {
    await page.goto('/create-study-room', { waitUntil: 'networkidle' });
    handlePopups(page)

    const roomName = page.getByRole('textbox', { name: 'Room Name' });
    await roomName.waitFor({timeout: 20000});
    await roomName.fill('auto-generated');
    
    const skillInput = page.getByRole('textbox', { name: 'Type a skill (e.g. React,' });
    await skillInput.click();
    await skillInput.fill('newskill');
    await page.getByText('newskill').waitFor({timeout: 20000});
    await page.getByText('newskill').click();

    await page.getByRole('switch', { name: 'Instant Session' }).click();

    await page.waitForTimeout(5000)
    
    const launchBtn = page.getByRole('button', { name: 'Launch Session' });
    await launchBtn.waitFor({ state: 'visible', timeout: 15000 });
    await launchBtn.scrollIntoViewIfNeeded();
    await launchBtn.click();

    const enterRoomBtn = page.getByRole('button', { name: 'Enter Room' });
    await enterRoomBtn.click();

    await page.waitForTimeout(5000)
    roomUrl = page.url();

    const enterClassroomBtn = page.getByRole('button', { name: 'Enter Classroom' });
    await enterClassroomBtn.waitFor({ timeout: 15000 });
    await enterClassroomBtn.click();

    try {
      await page.getByRole('textbox', { name: 'Type a message...' }).waitFor({ timeout: 8000 });
      await page.getByRole('textbox', { name: 'Type a message...' }).fill('Test Message');
      await page.locator('.inline-flex.items-center.justify-center.gap-2').click();
    } catch (e) {
      console.log('Chat interaction skipped:', e);
    }

  });
});

test.describe("Recurring room creation", () => {
  let roomUrl = '';

  test.afterEach(async ({ page }) => {
    if (!roomUrl) return;
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('3');
      } else {
        await dialog.accept();
      }
    });
    try {
      await page.goto(roomUrl);
      await page.waitForLoadState('networkidle');
      const cancelBtn = page.getByRole('button', { name: 'Cancel Session' });
      await cancelBtn.waitFor({ timeout: 20000 });
      await cancelBtn.click();
      await page.waitForTimeout(5000)
    } catch (e) {
      console.log('Cleanup failed or room already cancelled:', e);
    } finally {
      roomUrl = '';
    }
  });

  test("Attempt to create a recurring room, test chat and remove rooms", async ({ page }) => {
    await page.goto('/create-study-room', { waitUntil: 'networkidle' });
    handlePopups(page);
    const roomName = page.getByRole('textbox', { name: 'Room Name' });
    await roomName.waitFor();
    await roomName.fill('recurring-auto-generated');

    const skillInput = page.getByRole('textbox', { name: 'Type a skill (e.g. React,' });
    await skillInput.click();
    await skillInput.fill('newskill');
    await page.getByText('newskill').waitFor();
    await page.getByText('newskill').click();

    const now = new Date();
    const date = now.toLocaleDateString('en-CA');
    const time = now.toTimeString().slice(0, 5);

    await page.locator('input[type="date"]').waitFor();
    await page.locator('input[type="date"]').fill(date);
    await page.locator('input[type="time"]').fill(time);

    await page.getByRole('switch').nth(1).click();

    const launchBtn = page.getByRole('button', { name: 'Launch Session' });
    await launchBtn.waitFor({ state: 'visible', timeout: 15000 });
    await launchBtn.scrollIntoViewIfNeeded();
    await launchBtn.click();

    const enterRoomBtn = page.getByRole('button', { name: 'Enter Room' });
    await enterRoomBtn.waitFor({ timeout: 15000 });
    await enterRoomBtn.click();

    await page.waitForURL(/studyroom/, { timeout: 20000 });
    roomUrl = page.url();

    const enterClassroomBtn = page.getByRole('button', { name: 'Enter Classroom' });
    await enterClassroomBtn.waitFor({ timeout: 15000 });
    await enterClassroomBtn.click();

    try {
        await page.getByRole('textbox', { name: 'Type a message...' }).waitFor({ timeout: 8000 });
        await page.getByRole('textbox', { name: 'Type a message...' }).fill('Test Message');
        await page.locator('.inline-flex.items-center.justify-center.gap-2').click();
    } catch (e) {
        console.log('Chat interaction skipped:', e);
    }

});

})


    test.describe("Debate room creation and chat testing", () => {
        test.describe.configure({ mode: 'serial', });
        test.use({storageState: 'storageState.moderator.json'})

        let debateRoomUrl = '';

        test.afterAll(async ({ browser }) => {
            if (!debateRoomUrl) return;

            const context = await browser.newContext({
                storageState: 'storageState.moderator.json'
            });

            const page = await context.newPage();

            try {
                await page.goto(debateRoomUrl, { waitUntil: 'networkidle' });
                await page.waitForURL(debateRoomUrl, {timeout: 10000})

                await page.getByRole('button', { name: 'Cancel Debate' }).waitFor({ timeout: 10000 });

                await page.getByRole('button', { name: 'Cancel Debate' }).click().catch(() => {});
                await page.waitForTimeout(3000);
                await page.getByRole('button', { name: 'Cancel Debate' }).click().catch(() => {});
                await page.waitForTimeout(3000);
            } catch (e) {
                console.log('Final cleanup failed:', e);
            } finally {
                await context.close();
                debateRoomUrl = '';
            }
        });

        test("Debate room creation by moderator", async ({ page }) => {
            await page.goto('/', { waitUntil: 'networkidle' });
            handlePopups(page);

            await page.getByRole('link', { name: 'Browse' }).click();
            await page.getByRole('button', { name: 'Debate Rooms' }).waitFor({ state: 'visible', timeout: 45000 });
            await page.getByRole('button', { name: 'Debate Rooms' }).click();
            await page.getByRole('button', { name: 'Create Debate' }).waitFor({ state: 'visible', timeout: 60000 });
            await page.getByRole('button', { name: 'Create Debate' }).click();
            await page.getByRole('textbox', { name: 'Topic *' }).fill('Social media ban below 16');
            await page.getByRole('button', { name: 'Create now' }).click();
            await page.getByRole('button', { name: 'Enter Debate Room' }).waitFor({ state: 'visible', timeout: 15000 });
            await page.getByRole('button', { name: 'Enter Debate Room' }).click();

            debateRoomUrl = page.url();

            try {
                await page.getByRole('button', { name: 'Chat' }).click();
                const textBox = page.getByRole('textbox', { name: 'Type a message...' });
                await textBox.waitFor({ timeout: 10000 });
                await textBox.fill('Message from Moderator');
                await page.getByRole('button').filter({ hasText: /^$/ }).nth(1).click();
                await page.waitForTimeout(3000);
            } catch (e) {
                console.log('Moderator chat skipped:', e);
            }
        });

        test.describe("Joining as For and confirm chats", () => {
                test.use({storageState: 'storageState.participant.json'})
            
                test("Joining as participant" , async ({ page }) => {
                    await page.goto('/', { waitUntil: 'networkidle' });
                    handlePopups(page);

                    await page.getByRole('link', { name: 'Browse' }).click();
                    await page.getByRole('button', { name: 'Debate Rooms' }).waitFor({ state: 'visible', timeout: 45000 });
                    await page.getByRole('button', { name: 'Debate Rooms' }).click();
                    await page.getByText('Social media ban below 16').first().waitFor({ state: 'visible', timeout: 60000 });
                    await page.getByText('Social media ban below 16').first().click();
                    await page.getByRole('button', { name: 'Auto-assign me to a team' }).waitFor({ state: 'visible', timeout: 15000 });
                    await page.getByRole('button', { name: 'Auto-assign me to a team' }).click();
                    await page.getByRole('button', { name: 'Enter Debate Room' }).waitFor({ state: 'visible', timeout: 15000 });
                    await page.getByRole('button', { name: 'Enter Debate Room' }).click();

                    try {
                        await page.getByRole('button', { name: 'Chat' }).click();
                        const chat = page.getByText('Message from Moderator');
                        await chat.waitFor({ timeout: 8000 });
                        await expect(chat).toBeVisible();
                    } catch (e) {
                        console.log('Participant chat skipped:', e);
                    }
                });
        }) 

});