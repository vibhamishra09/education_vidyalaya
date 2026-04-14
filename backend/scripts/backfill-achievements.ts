import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient();

async function mintAchievementIfEligible(params: {
  userId: string;
  achievementId: string;
  progress: number;
  title: string;
}) {
  const achievement = await prisma.achievement.findUnique({
    where: { id: params.achievementId },
  });

  if (!achievement) {
    return false;
  }

  const existing = await prisma.userAchievement.findUnique({
    where: {
      userId_achievementId: {
        userId: params.userId,
        achievementId: params.achievementId,
      },
    },
  });

  if (existing?.unlockedAt) {
    console.log(`    Already minted: ${params.title}`);
    return false;
  }

  await prisma.userAchievement.upsert({
    where: {
      userId_achievementId: {
        userId: params.userId,
        achievementId: params.achievementId,
      },
    },
    create: {
      userId: params.userId,
      achievementId: params.achievementId,
      progress: params.progress,
      unlockedAt: new Date(),
    },
    update: {
      progress: params.progress,
      unlockedAt: new Date(),
    },
  });

  console.log(
    `    Minted: ${params.title} NFT (+${achievement.coinReward} points)`,
  );

  return true;
}

async function backfillAchievements() {
  console.log('Starting achievement backfill...\n');

  const users = await prisma.user.findMany({
    select: { id: true, name: true, clerkId: true },
  });

  console.log(`Found ${users.length} users\n`);

  for (const user of users) {
    console.log(`\nProcessing user: ${user.name} (${user.id})`);

    const peerSessionsAsLearner = await prisma.peerSession.count({
      where: {
        requestedById: user.id,
        sessionStatus: 'DONE',
      },
    });

    const peerSessionsAsTeacher = await prisma.peerSession.count({
      where: {
        requestedToId: user.id,
        sessionStatus: 'DONE',
      },
    });

    const studyRoomsAsParticipant = await prisma.studyRoomParticipant.count({
      where: {
        userId: user.id,
        studyRoom: {
          sessionStatus: 'DONE',
        },
      },
    });

    const studyRoomsAsHost = await prisma.studyRoom.count({
      where: {
        createdById: user.id,
        sessionStatus: 'DONE',
      },
    });

    const totalLearnerSessions = peerSessionsAsLearner + studyRoomsAsParticipant;
    const totalTeacherSessions = peerSessionsAsTeacher + studyRoomsAsHost;
    const totalSessions = totalLearnerSessions + totalTeacherSessions;

    console.log(
      `  Sessions: ${totalSessions} total (${totalLearnerSessions} as learner, ${totalTeacherSessions} as teacher)`,
    );

    if (totalSessions === 0) {
      console.log('  Skipping user with no completed sessions');
      continue;
    }

    const sessionMilestones = [
      { id: 'achievement_first_session', count: 1, title: 'First Session' },
      { id: 'achievement_getting_started', count: 5, title: 'Getting Started' },
      { id: 'achievement_regular', count: 25, title: 'Regular' },
      { id: 'achievement_dedicated', count: 50, title: 'Dedicated' },
      { id: 'achievement_master', count: 100, title: 'Master' },
    ];

    const teachingMilestones = [
      { id: 'achievement_first_teach', count: 1, title: 'First Teach' },
      { id: 'achievement_helpful_tutor', count: 10, title: 'Helpful Tutor' },
    ];

    let mintedCount = 0;

    for (const milestone of sessionMilestones) {
      if (totalSessions >= milestone.count) {
        const minted = await mintAchievementIfEligible({
          userId: user.id,
          achievementId: milestone.id,
          progress: totalSessions,
          title: milestone.title,
        });

        if (minted) {
          mintedCount++;
        }
      }
    }

    for (const milestone of teachingMilestones) {
      if (totalTeacherSessions >= milestone.count) {
        const minted = await mintAchievementIfEligible({
          userId: user.id,
          achievementId: milestone.id,
          progress: totalTeacherSessions,
          title: milestone.title,
        });

        if (minted) {
          mintedCount++;
        }
      }
    }

    const fiveStarRatings = await prisma.review.count({
      where: {
        revieweeId: user.id,
        rating: 5,
      },
    });

    if (fiveStarRatings >= 50) {
      const minted = await mintAchievementIfEligible({
        userId: user.id,
        achievementId: 'achievement_master_educator',
        progress: fiveStarRatings,
        title: 'Master Educator',
      });

      if (minted) {
        mintedCount++;
      }
    }

    if (mintedCount > 0) {
      console.log(`  Minted ${mintedCount} new achievement NFTs for ${user.name}`);
    } else {
      console.log('  No new achievement NFTs to mint');
    }
  }

  console.log('\nAchievement backfill complete!\n');
}

backfillAchievements()
  .catch((error) => {
    console.error('Error during backfill:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
