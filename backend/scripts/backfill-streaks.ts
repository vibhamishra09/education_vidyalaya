import { PrismaClient, SessionStatus } from '@prisma/client';
import { DateTime } from 'luxon';

const prisma = new PrismaClient();

/**
 * Backfill script for historical streak data
 *
 * This script:
 * 1. Finds all completed sessions (DONE) from the last 7 days
 * 2. Creates DailyActivity records for each user's participation
 * 3. Updates user streak information
 *
 * Run with: pnpm ts-node scripts/backfill-streaks.ts
 */

async function backfillStreaks() {
  console.log('Starting streak backfill...\n');

  // Calculate date 7 days ago
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  console.log(`Looking for completed sessions since: ${sevenDaysAgo.toISOString()}\n`);

  // Get all completed peer sessions from last 7 days
  const completedPeerSessions = await prisma.peerSession.findMany({
    where: {
      sessionStatus: SessionStatus.DONE,
      date: { gte: sevenDaysAgo },
    },
    include: {
      payments: true,
    },
    orderBy: { date: 'asc' },
  });

  // Get all completed study rooms from last 7 days
  const completedStudyRooms = await prisma.studyRoom.findMany({
    where: {
      sessionStatus: SessionStatus.DONE,
      date: { gte: sevenDaysAgo },
    },
    include: {
      learners: true,
      payments: true,
    },
    orderBy: { date: 'asc' },
  });

  console.log(`Found ${completedPeerSessions.length} peer sessions and ${completedStudyRooms.length} study rooms\n`);

  let processedActivities = 0;

  // Process peer sessions
  for (const session of completedPeerSessions) {
    // Get user timezones
    const [learner, teacher] = await Promise.all([
      prisma.user.findUnique({
        where: { id: session.requestedById },
        select: { timezone: true },
      }),
      prisma.user.findUnique({
        where: { id: session.requestedToId },
        select: { timezone: true },
      }),
    ]);

    // Process learner activity
    const learnerTimezone = learner?.timezone || 'UTC';
    const learnerDate = DateTime.fromJSDate(session.date)
      .setZone(learnerTimezone)
      .startOf('day')
      .toJSDate();

    const learnerPayment = session.payments.find((p) => p.madeById === session.requestedById);
    const learnerCoins = Number(learnerPayment?.amountMade || 0);

    await prisma.dailyActivity.upsert({
      where: {
        userId_date: {
          userId: session.requestedById,
          date: learnerDate,
        },
      },
      update: {
        sessionCount: { increment: 1 },
        minutesLearned: { increment: session.duration },
        coinsEarned: { increment: learnerCoins },
      },
      create: {
        userId: session.requestedById,
        date: learnerDate,
        sessionCount: 1,
        minutesLearned: session.duration,
        minutesTaught: 0,
        coinsEarned: learnerCoins,
      },
    });

    // Process teacher activity
    const teacherTimezone = teacher?.timezone || 'UTC';
    const teacherDate = DateTime.fromJSDate(session.date)
      .setZone(teacherTimezone)
      .startOf('day')
      .toJSDate();

    const teacherPayment = session.payments.find((p) => p.receivedById === session.requestedToId);
    const teacherCoins = Number(teacherPayment?.amountReceived || 0);

    await prisma.dailyActivity.upsert({
      where: {
        userId_date: {
          userId: session.requestedToId,
          date: teacherDate,
        },
      },
      update: {
        sessionCount: { increment: 1 },
        minutesTaught: { increment: session.duration },
        coinsEarned: { increment: teacherCoins },
      },
      create: {
        userId: session.requestedToId,
        date: teacherDate,
        sessionCount: 1,
        minutesLearned: 0,
        minutesTaught: session.duration,
        coinsEarned: teacherCoins,
      },
    });

    processedActivities += 2;
  }

  // Process study rooms
  for (const room of completedStudyRooms) {
    // Get creator (teacher) timezone
    const creator = await prisma.user.findUnique({
      where: { id: room.createdById },
      select: { timezone: true },
    });

    const creatorTimezone = creator?.timezone || 'UTC';
    const creatorDate = DateTime.fromJSDate(room.date)
      .setZone(creatorTimezone)
      .startOf('day')
      .toJSDate();

    // Calculate total coins earned by creator
    const creatorCoins = room.payments.reduce(
      (sum, p) => sum + Number(p.amountReceived || 0),
      0,
    );

    // Process creator activity
    await prisma.dailyActivity.upsert({
      where: {
        userId_date: {
          userId: room.createdById,
          date: creatorDate,
        },
      },
      update: {
        sessionCount: { increment: 1 },
        minutesTaught: { increment: room.duration },
        coinsEarned: { increment: creatorCoins },
      },
      create: {
        userId: room.createdById,
        date: creatorDate,
        sessionCount: 1,
        minutesLearned: 0,
        minutesTaught: room.duration,
        coinsEarned: creatorCoins,
      },
    });

    processedActivities += 1;

    // Process learner activities
    for (const learner of room.learners) {
      const learnerUser = await prisma.user.findUnique({
        where: { id: learner.userId },
        select: { timezone: true },
      });

      const learnerTimezone = learnerUser?.timezone || 'UTC';
      const learnerDate = DateTime.fromJSDate(room.date)
        .setZone(learnerTimezone)
        .startOf('day')
        .toJSDate();

      await prisma.dailyActivity.upsert({
        where: {
          userId_date: {
            userId: learner.userId,
            date: learnerDate,
          },
        },
        update: {
          sessionCount: { increment: 1 },
          minutesLearned: { increment: room.duration },
        },
        create: {
          userId: learner.userId,
          date: learnerDate,
          sessionCount: 1,
          minutesLearned: room.duration,
          minutesTaught: 0,
          coinsEarned: 0,
        },
      });

      processedActivities += 1;
    }
  }

  console.log(`Processed ${processedActivities} activity records\n`);

  // Now update streaks for all users who have activities
  console.log('Updating user streaks...\n');

  const usersWithActivities = await prisma.dailyActivity.findMany({
    select: { userId: true },
    distinct: ['userId'],
  });

  for (const { userId } of usersWithActivities) {
    await updateUserStreak(userId);
  }

  console.log(`Updated streaks for ${usersWithActivities.length} users\n`);

  console.log('Backfill complete!');
}

/**
 * Calculate and update a user's streak
 */
async function updateUserStreak(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { timezone: true, longestStreak: true },
  });

  const timezone = user?.timezone || 'UTC';
  const today = DateTime.now().setZone(timezone).startOf('day');

  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    select: { date: true },
  });

  if (activities.length === 0) {
    return;
  }

  const activityDates = activities.map((a) =>
    DateTime.fromJSDate(a.date).setZone(timezone).startOf('day'),
  );

  const lastActivityDate = activityDates[0].toJSDate();

  // Check if streak is broken (last activity > 1 day ago)
  const daysSinceLastActivity = Math.floor(
    today.diff(activityDates[0], 'days').days,
  );

  if (daysSinceLastActivity > 1) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: 0,
        lastActivityDate,
      },
    });
    return;
  }

  // Count consecutive days
  let currentStreak = 1;
  let checkDate = activityDates[0];

  for (let i = 1; i < activityDates.length; i++) {
    const prevDate = activityDates[i];
    const daysDiff = Math.floor(checkDate.diff(prevDate, 'days').days);

    if (daysDiff === 1) {
      currentStreak++;
      checkDate = prevDate;
    } else {
      break;
    }
  }

  // Calculate longest streak
  const longestStreak = Math.max(currentStreak, user?.longestStreak || 0);

  // Update user streak
  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak,
      longestStreak,
      lastActivityDate,
    },
  });
}

// Run the backfill
backfillStreaks()
  .catch((e) => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
