/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set in backend/.env');
}

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting achievements seed...');

  // Seed achievements only
  console.log('Creating/updating achievements...');
  const achievements = await Promise.all([
    // Streak-based achievements
    prisma.achievement.upsert({
      where: { id: 'achievement_first_step' },
      update: {},
      create: {
        id: 'achievement_first_step',
        title: 'First Step',
        description: 'Complete your first day of learning',
        icon: '🎯',
        category: 'STREAK',
        rarity: 'COMMON',
        maxProgress: 1,
        coinReward: 5,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_building_momentum' },
      update: {},
      create: {
        id: 'achievement_building_momentum',
        title: 'Building Momentum',
        description: 'Maintain a 3-day learning streak',
        icon: '🔥',
        category: 'STREAK',
        rarity: 'COMMON',
        maxProgress: 3,
        coinReward: 15,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_week_warrior' },
      update: {},
      create: {
        id: 'achievement_week_warrior',
        title: 'Week Warrior',
        description: 'Achieve a 7-day learning streak',
        icon: '⚡',
        category: 'STREAK',
        rarity: 'RARE',
        maxProgress: 7,
        coinReward: 50,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_dedicated_learner' },
      update: {},
      create: {
        id: 'achievement_dedicated_learner',
        title: 'Dedicated Learner',
        description: 'Maintain a 14-day learning streak',
        icon: '💎',
        category: 'STREAK',
        rarity: 'RARE',
        maxProgress: 14,
        coinReward: 100,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_month_master' },
      update: {},
      create: {
        id: 'achievement_month_master',
        title: 'Month Master',
        description: 'Achieve a 30-day learning streak',
        icon: '🏆',
        category: 'STREAK',
        rarity: 'EPIC',
        maxProgress: 30,
        coinReward: 250,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_unstoppable' },
      update: {},
      create: {
        id: 'achievement_unstoppable',
        title: 'Unstoppable',
        description: 'Maintain a 60-day learning streak',
        icon: '🌟',
        category: 'STREAK',
        rarity: 'EPIC',
        maxProgress: 60,
        coinReward: 500,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_legend' },
      update: {},
      create: {
        id: 'achievement_legend',
        title: 'Legend',
        description: 'Achieve a legendary 100-day streak',
        icon: '👑',
        category: 'STREAK',
        rarity: 'LEGENDARY',
        maxProgress: 100,
        coinReward: 1000,
      },
    }),

    // Session count achievements
    prisma.achievement.upsert({
      where: { id: 'achievement_first_session' },
      update: {},
      create: {
        id: 'achievement_first_session',
        title: 'First Session',
        description: 'Complete your first learning session',
        icon: '🎓',
        category: 'MILESTONE',
        rarity: 'COMMON',
        maxProgress: 1,
        coinReward: 10,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_getting_started' },
      update: {},
      create: {
        id: 'achievement_getting_started',
        title: 'Getting Started',
        description: 'Complete 5 learning sessions',
        icon: '📚',
        category: 'LEARNING',
        rarity: 'COMMON',
        maxProgress: 5,
        coinReward: 25,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_regular' },
      update: {},
      create: {
        id: 'achievement_regular',
        title: 'Regular',
        description: 'Complete 25 learning sessions',
        icon: '📖',
        category: 'LEARNING',
        rarity: 'RARE',
        maxProgress: 25,
        coinReward: 100,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_dedicated' },
      update: {},
      create: {
        id: 'achievement_dedicated',
        title: 'Dedicated',
        description: 'Complete 50 learning sessions',
        icon: '🎯',
        category: 'LEARNING',
        rarity: 'EPIC',
        maxProgress: 50,
        coinReward: 250,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_master' },
      update: {},
      create: {
        id: 'achievement_master',
        title: 'Master',
        description: 'Complete 100 learning sessions',
        icon: '🏅',
        category: 'LEARNING',
        rarity: 'LEGENDARY',
        maxProgress: 100,
        coinReward: 500,
      },
    }),

    // Teaching achievements
    prisma.achievement.upsert({
      where: { id: 'achievement_first_teach' },
      update: {},
      create: {
        id: 'achievement_first_teach',
        title: 'First Teach',
        description: 'Teach your first session',
        icon: '👨‍🏫',
        category: 'TEACHING',
        rarity: 'COMMON',
        maxProgress: 1,
        coinReward: 15,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_helpful_tutor' },
      update: {},
      create: {
        id: 'achievement_helpful_tutor',
        title: 'Helpful Tutor',
        description: 'Teach 10 sessions',
        icon: '🎓',
        category: 'TEACHING',
        rarity: 'RARE',
        maxProgress: 10,
        coinReward: 50,
      },
    }),
    prisma.achievement.upsert({
      where: { id: 'achievement_master_educator' },
      update: {},
      create: {
        id: 'achievement_master_educator',
        title: 'Master Educator',
        description: 'Receive 50 five-star ratings',
        icon: '⭐',
        category: 'TEACHING',
        rarity: 'LEGENDARY',
        maxProgress: 50,
        coinReward: 500,
      },
    }),

    // Social achievements
    prisma.achievement.upsert({
      where: { id: 'achievement_social_butterfly' },
      update: {},
      create: {
        id: 'achievement_social_butterfly',
        title: 'Social Butterfly',
        description: 'Connect with 20 different learners',
        icon: '🦋',
        category: 'SOCIAL',
        rarity: 'RARE',
        maxProgress: 20,
        coinReward: 75,
      },
    }),
  ]);

  console.log(`✅ Created/updated ${achievements.length} achievements`);

  // Display summary
  console.log('\n📊 Summary:');
  console.log(`- Created/updated ${achievements.length} achievements`);
  console.log('\n🎯 Achievement Categories:');
  console.log(`  STREAK: 7 achievements`);
  console.log(`  LEARNING: 4 achievements`);
  console.log(`  MILESTONE: 1 achievement`);
  console.log(`  TEACHING: 3 achievements`);
  console.log(`  SOCIAL: 1 achievement`);

  console.log('\n🎉 Achievements seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
