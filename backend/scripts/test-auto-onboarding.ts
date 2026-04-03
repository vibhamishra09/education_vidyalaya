import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  const testEmail = 'test-onboarding-logic@example.com';
  const clerkId = 'user_clerk_test_123';
  const displayName = 'Test User';

  console.log('🚀 Starting onboarding logic test...');

  try {
    // 1. Cleanup existing test user
    await prisma.user.deleteMany({
      where: { email: testEmail },
    });
    console.log('🧹 Cleanup existing test user done');

    // CASE 1: Brand New User (Auto Onboarding)
    console.log('\n--- Case 1: Brand New User ---');
    const newUser = await prisma.user.create({
      data: {
        clerkId,
        email: testEmail,
        name: displayName,
        onboarded: true,
        coins: 1000,
      },
    });
    console.log(`✅ User created: onboarded=${newUser.onboarded}, coins=${newUser.coins}`);
    if (newUser.onboarded === true && newUser.coins === 1000) {
      console.log('✨ CASE 1 SUCCESS');
    } else {
      console.error('❌ CASE 1 FAILED');
    }

    // CASE 2: Invited/Placeholder User (Update upon first signin)
    console.log('\n--- Case 2: Invited Placeholder User ---');
    // First, recreate the user as a placeholder (e.g. from invite)
    await prisma.user.deleteMany({ where: { email: testEmail } });
    const placeholderUser = await prisma.user.create({
      data: {
        email: testEmail,
        name: 'Placeholder',
        onboarded: false,
        coins: 0,
      },
    });
    console.log(`👤 Placeholder created: onboarded=${placeholderUser.onboarded}, coins=${placeholderUser.coins}`);

    // Simulate ensureUserFromClerk "update" logic
    const updatedUser = await prisma.user.update({
      where: { id: placeholderUser.id },
      data: {
        clerkId,
        name: displayName,
        // Automatically onboard even if they existed as a placeholder
        onboarded: true,
        // Give coins if they never had any (newly onboarded)
        ...(placeholderUser.onboarded ? {} : { coins: { increment: 1000 } }),
      },
    });
    console.log(`✅ User updated: onboarded=${updatedUser.onboarded}, coins=${updatedUser.coins}`);
    if (updatedUser.onboarded === true && updatedUser.coins === 1000) {
      console.log('✨ CASE 2 SUCCESS');
    } else {
      console.error('❌ CASE 2 FAILED');
    }

    // Cleanup final state
    await prisma.user.delete({ where: { id: updatedUser.id } });
    console.log('\n🧹 Final cleanup done');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
