import { PrismaClient } from '../src/generated/prisma/client';

// Source database (old)
const sourceDb = new PrismaClient({
  datasources: {
    db: {
      url: 'your_old_database_connection_string_here',
    },
  },
});

// Target database (new)
const targetDb = new PrismaClient({
  datasources: {
    db: {
      url: 'your_new_database_connection_string_here',
    },
  },
});

async function migrateData() {
  try {
    console.log('🚀 Starting database migration...\n');

    // Test connections
    console.log('📡 Testing source database connection...');
    await sourceDb.$connect();
    console.log('✅ Source database connected\n');

    console.log('📡 Testing target database connection...');
    await targetDb.$connect();
    console.log('✅ Target database connected\n');

    // Get counts from source
    const counts = {
      users: await sourceDb.user.count(),
      skills: await sourceDb.skill.count(),
      peerSessions: await sourceDb.peerSession.count(),
      studyRooms: await sourceDb.studyRoom.count(),
      achievements: await sourceDb.achievement.count(),
      notifications: await sourceDb.notification.count(),
    };

    console.log('📊 Source database statistics:');
    console.log(`   Users: ${counts.users}`);
    console.log(`   Skills: ${counts.skills}`);
    console.log(`   Peer Sessions: ${counts.peerSessions}`);
    console.log(`   Study Rooms: ${counts.studyRooms}`);
    console.log(`   Achievements: ${counts.achievements}`);
    console.log(`   Notifications: ${counts.notifications}\n`);

    // 1. Migrate Skills (independent table)
    console.log('📦 Migrating Skills...');
    const skills = await sourceDb.skill.findMany();
    if (skills.length > 0) {
      await targetDb.skill.createMany({
        data: skills,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${skills.length} skills\n`);
    } else {
      console.log('ℹ️  No skills to migrate\n');
    }

    // 2. Migrate Achievements (independent table)
    console.log('📦 Migrating Achievements...');
    const achievements = await sourceDb.achievement.findMany();
    if (achievements.length > 0) {
      await targetDb.achievement.createMany({
        data: achievements,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${achievements.length} achievements\n`);
    } else {
      console.log('ℹ️  No achievements to migrate\n');
    }

    // 3. Migrate Users
    console.log('📦 Migrating Users...');
    const users = await sourceDb.user.findMany();
    if (users.length > 0) {
      await targetDb.user.createMany({
        data: users.map((user: any) => ({
          ...user,
          socialLinks: user.socialLinks || null,
        })),
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${users.length} users\n`);
    } else {
      console.log('ℹ️  No users to migrate\n');
    }

    // 4. Migrate User Skills (junction table)
    console.log('📦 Migrating User Skills...');
    const userSkills = await sourceDb.userSkill.findMany();
    if (userSkills.length > 0) {
      await targetDb.userSkill.createMany({
        data: userSkills,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${userSkills.length} user-skill relationships\n`);
    } else {
      console.log('ℹ️  No user skills to migrate\n');
    }

    // 5. Migrate User Availability
    console.log('📦 Migrating User Availability...');
    const availability = await sourceDb.userAvailability.findMany();
    if (availability.length > 0) {
      await targetDb.userAvailability.createMany({
        data: availability,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${availability.length} availability records\n`);
    } else {
      console.log('ℹ️  No availability records to migrate\n');
    }

    // 6. Migrate Blocked Time Slots
    console.log('📦 Migrating Blocked Time Slots...');
    const blockedSlots = await sourceDb.blockedTimeSlot.findMany();
    if (blockedSlots.length > 0) {
      await targetDb.blockedTimeSlot.createMany({
        data: blockedSlots,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${blockedSlots.length} blocked time slots\n`);
    } else {
      console.log('ℹ️  No blocked time slots to migrate\n');
    }

    // 7. Migrate Peer Sessions
    console.log('📦 Migrating Peer Sessions...');
    const peerSessions = await sourceDb.peerSession.findMany();
    if (peerSessions.length > 0) {
      await targetDb.peerSession.createMany({
        data: peerSessions,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${peerSessions.length} peer sessions\n`);
    } else {
      console.log('ℹ️  No peer sessions to migrate\n');
    }

    // 8. Migrate Peer Session Skills (junction table)
    console.log('📦 Migrating Peer Session Skills...');
    const peerSessionSkills = await sourceDb.peerSessionSkill.findMany();
    if (peerSessionSkills.length > 0) {
      await targetDb.peerSessionSkill.createMany({
        data: peerSessionSkills,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${peerSessionSkills.length} peer session skills\n`);
    } else {
      console.log('ℹ️  No peer session skills to migrate\n');
    }

    // 9. Migrate Study Rooms
    console.log('📦 Migrating Study Rooms...');
    const studyRooms = await sourceDb.studyRoom.findMany();
    if (studyRooms.length > 0) {
      await targetDb.studyRoom.createMany({
        data: studyRooms,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${studyRooms.length} study rooms\n`);
    } else {
      console.log('ℹ️  No study rooms to migrate\n');
    }

    // 10. Migrate Study Room Participants
    console.log('📦 Migrating Study Room Participants...');
    const studyRoomParticipants = await sourceDb.studyRoomParticipant.findMany();
    if (studyRoomParticipants.length > 0) {
      await targetDb.studyRoomParticipant.createMany({
        data: studyRoomParticipants,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${studyRoomParticipants.length} study room participants\n`);
    } else {
      console.log('ℹ️  No study room participants to migrate\n');
    }

    // 11. Migrate Notifications
    console.log('📦 Migrating Notifications...');
    const notifications = await sourceDb.notification.findMany();
    if (notifications.length > 0) {
      await targetDb.notification.createMany({
        data: notifications,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${notifications.length} notifications\n`);
    } else {
      console.log('ℹ️  No notifications to migrate\n');
    }

    // 12. Migrate Push Subscriptions
    console.log('📦 Migrating Push Subscriptions...');
    const pushSubscriptions = await sourceDb.pushSubscription.findMany();
    if (pushSubscriptions.length > 0) {
      await targetDb.pushSubscription.createMany({
        data: pushSubscriptions,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${pushSubscriptions.length} push subscriptions\n`);
    } else {
      console.log('ℹ️  No push subscriptions to migrate\n');
    }

    // 13. Migrate Reviews
    console.log('📦 Migrating Reviews...');
    const reviews = await sourceDb.review.findMany();
    if (reviews.length > 0) {
      await targetDb.review.createMany({
        data: reviews,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${reviews.length} reviews\n`);
    } else {
      console.log('ℹ️  No reviews to migrate\n');
    }

    // 14. Migrate User Achievements
    console.log('📦 Migrating User Achievements...');
    const userAchievements = await sourceDb.userAchievement.findMany();
    if (userAchievements.length > 0) {
      await targetDb.userAchievement.createMany({
        data: userAchievements,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${userAchievements.length} user achievements\n`);
    } else {
      console.log('ℹ️  No user achievements to migrate\n');
    }

    // 14.5. Migrate Channels (before Messages)
    console.log('📦 Migrating Channels...');
    const channels = await sourceDb.channel.findMany();
    if (channels.length > 0) {
      await targetDb.channel.createMany({
        data: channels,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${channels.length} channels\n`);
    } else {
      console.log('ℹ️  No channels to migrate\n');
    }

    // 15. Migrate Messages
    console.log('📦 Migrating Messages...');
    const messages = await sourceDb.message.findMany();
    if (messages.length > 0) {
      await targetDb.message.createMany({
        data: messages,
        skipDuplicates: true,
      });
      console.log(`✅ Migrated ${messages.length} messages\n`);
    } else {
      console.log('ℹ️  No messages to migrate\n');
    }

    // 16. Migrate Transcripts (if table exists)
    try {
      console.log('📦 Migrating Transcripts...');
      const transcripts = await (sourceDb as any).transcript?.findMany();
      if (transcripts && transcripts.length > 0) {
        await (targetDb as any).transcript?.createMany({
          data: transcripts,
          skipDuplicates: true,
        });
        console.log(`✅ Migrated ${transcripts.length} transcripts\n`);
      } else {
        console.log('ℹ️  No transcripts to migrate\n');
      }
    } catch (error) {
      console.log('ℹ️  Transcript table not found or empty\n');
    }

    // 17. Migrate Streaks (if table exists)
    try {
      console.log('📦 Migrating Streaks...');
      const streaks = await (sourceDb as any).streak?.findMany();
      if (streaks && streaks.length > 0) {
        await (targetDb as any).streak?.createMany({
          data: streaks,
          skipDuplicates: true,
        });
        console.log(`✅ Migrated ${streaks.length} streaks\n`);
      } else {
        console.log('ℹ️  No streaks to migrate\n');
      }
    } catch (error) {
      console.log('ℹ️  Streak table not found or empty\n');
    }

    // Verify migration
    console.log('\n🔍 Verifying migration...');
    const targetCounts = {
      users: await targetDb.user.count(),
      skills: await targetDb.skill.count(),
      peerSessions: await targetDb.peerSession.count(),
      studyRooms: await targetDb.studyRoom.count(),
      achievements: await targetDb.achievement.count(),
      notifications: await targetDb.notification.count(),
    };

    console.log('📊 Target database statistics:');
    console.log(`   Users: ${targetCounts.users}`);
    console.log(`   Skills: ${targetCounts.skills}`);
    console.log(`   Peer Sessions: ${targetCounts.peerSessions}`);
    console.log(`   Study Rooms: ${targetCounts.studyRooms}`);
    console.log(`   Achievements: ${targetCounts.achievements}`);
    console.log(`   Notifications: ${targetCounts.notifications}\n`);

    console.log('✅ Migration completed successfully!\n');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await sourceDb.$disconnect();
    await targetDb.$disconnect();
  }
}

migrateData()
  .then(() => {
    console.log('🎉 All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
