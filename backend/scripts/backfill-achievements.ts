import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function backfillAchievements() {
  console.log('🔄 Starting achievement backfill...\n');

  // Get all users
  const users = await prisma.user.findMany({
    select: { id: true, name: true, clerkId: true },
  });

  console.log(`Found ${users.length} users\n`);

  for (const user of users) {
    console.log(`\n👤 Processing user: ${user.name} (${user.id})`);

    // Count completed sessions
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

    console.log(`  📊 Sessions: ${totalSessions} total (${totalLearnerSessions} as learner, ${totalTeacherSessions} as teacher)`);

    if (totalSessions === 0) {
      console.log(`  ⏭️  Skipping user with no completed sessions`);
      continue;
    }

    // Session milestone achievements
    const sessionMilestones = [
      { id: 'achievement_first_session', count: 1, title: 'First Session' },
      { id: 'achievement_getting_started', count: 5, title: 'Getting Started' },
      { id: 'achievement_regular', count: 25, title: 'Regular' },
      { id: 'achievement_dedicated', count: 50, title: 'Dedicated' },
      { id: 'achievement_master', count: 100, title: 'Master' },
    ];

    let unlockedCount = 0;

    for (const milestone of sessionMilestones) {
      if (totalSessions >= milestone.count) {
        const achievement = await prisma.achievement.findUnique({
          where: { id: milestone.id },
        });

        if (!achievement) continue;

        // Check if already unlocked
        const existing = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId: user.id,
              achievementId: milestone.id,
            },
          },
        });

        if (existing?.unlockedAt) {
          console.log(`    ✅ Already unlocked: ${milestone.title}`);
        } else {
          // Create or update user achievement
          await prisma.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId: user.id,
                achievementId: milestone.id,
              },
            },
            create: {
              userId: user.id,
              achievementId: milestone.id,
              progress: totalSessions,
              unlockedAt: new Date(),
            },
            update: {
              progress: totalSessions,
              unlockedAt: new Date(),
            },
          });

          // Award coins
          await prisma.user.update({
            where: { id: user.id },
            data: {
              coins: {
                increment: achievement.coinReward,
              },
            },
          });

          console.log(`    🎉 Unlocked: ${milestone.title} (+${achievement.coinReward} coins)`);
          unlockedCount++;
        }
      }
    }

    // Teaching achievements
    const teachingMilestones = [
      { id: 'achievement_first_teach', count: 1, title: 'First Teach' },
      { id: 'achievement_helpful_tutor', count: 10, title: 'Helpful Tutor' },
    ];

    for (const milestone of teachingMilestones) {
      if (totalTeacherSessions >= milestone.count) {
        const achievement = await prisma.achievement.findUnique({
          where: { id: milestone.id },
        });

        if (!achievement) continue;

        const existing = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId: user.id,
              achievementId: milestone.id,
            },
          },
        });

        if (existing?.unlockedAt) {
          console.log(`    ✅ Already unlocked: ${milestone.title}`);
        } else {
          await prisma.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId: user.id,
                achievementId: milestone.id,
              },
            },
            create: {
              userId: user.id,
              achievementId: milestone.id,
              progress: totalTeacherSessions,
              unlockedAt: new Date(),
            },
            update: {
              progress: totalTeacherSessions,
              unlockedAt: new Date(),
            },
          });

          await prisma.user.update({
            where: { id: user.id },
            data: {
              coins: {
                increment: achievement.coinReward,
              },
            },
          });

          console.log(`    🎉 Unlocked: ${milestone.title} (+${achievement.coinReward} coins)`);
          unlockedCount++;
        }
      }
    }

    // Check 5-star ratings
    const fiveStarRatings = await prisma.review.count({
      where: {
        revieweeId: user.id,
        rating: 5,
      },
    });

    if (fiveStarRatings >= 50) {
      const achievement = await prisma.achievement.findUnique({
        where: { id: 'achievement_master_educator' },
      });

      if (achievement) {
        const existing = await prisma.userAchievement.findUnique({
          where: {
            userId_achievementId: {
              userId: user.id,
              achievementId: 'achievement_master_educator',
            },
          },
        });

        if (!existing?.unlockedAt) {
          await prisma.userAchievement.upsert({
            where: {
              userId_achievementId: {
                userId: user.id,
                achievementId: 'achievement_master_educator',
              },
            },
            create: {
              userId: user.id,
              achievementId: 'achievement_master_educator',
              progress: fiveStarRatings,
              unlockedAt: new Date(),
            },
            update: {
              progress: fiveStarRatings,
              unlockedAt: new Date(),
            },
          });

          await prisma.user.update({
            where: { id: user.id },
            data: {
              coins: {
                increment: achievement.coinReward,
              },
            },
          });

          console.log(`    🎉 Unlocked: Master Educator (+${achievement.coinReward} coins)`);
          unlockedCount++;
        }
      }
    }

    if (unlockedCount > 0) {
      console.log(`  ✨ Unlocked ${unlockedCount} new achievements for ${user.name}`);
    } else {
      console.log(`  ℹ️  No new achievements to unlock`);
    }
  }

  console.log('\n✅ Achievement backfill complete!\n');
}

backfillAchievements()
  .catch((error) => {
    console.error('❌ Error during backfill:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
