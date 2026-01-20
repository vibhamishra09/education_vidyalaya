import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Verify that all required achievements exist in the database
 * This script helps diagnose missing achievement issues
 */
async function verifyAchievements() {
  console.log('🔍 Verifying achievements in database...\n');

  const requiredAchievements = [
    // Session achievements
    { id: 'achievement_first_session', title: 'First Session', category: 'MILESTONE' },
    { id: 'achievement_getting_started', title: 'Getting Started', category: 'LEARNING' },
    { id: 'achievement_regular', title: 'Regular', category: 'LEARNING' },
    { id: 'achievement_dedicated', title: 'Dedicated', category: 'LEARNING' },
    { id: 'achievement_master', title: 'Master', category: 'LEARNING' },
    
    // Teaching achievements
    { id: 'achievement_first_teach', title: 'First Teach', category: 'TEACHING' },
    { id: 'achievement_helpful_tutor', title: 'Helpful Tutor', category: 'TEACHING' },
    { id: 'achievement_master_educator', title: 'Master Educator', category: 'TEACHING' },
    
    // Streak achievements
    { id: 'achievement_first_step', title: 'First Step', category: 'STREAK' },
    { id: 'achievement_building_momentum', title: 'Building Momentum', category: 'STREAK' },
    { id: 'achievement_week_warrior', title: 'Week Warrior', category: 'STREAK' },
    { id: 'achievement_dedicated_learner', title: 'Dedicated Learner', category: 'STREAK' },
    { id: 'achievement_month_master', title: 'Month Master', category: 'STREAK' },
    { id: 'achievement_unstoppable', title: 'Unstoppable', category: 'STREAK' },
    { id: 'achievement_legend', title: 'Legend', category: 'STREAK' },
    
    // Social achievements
    { id: 'achievement_social_butterfly', title: 'Social Butterfly', category: 'SOCIAL' },
  ];

  let allExist = true;
  const missing: string[] = [];
  const existing: string[] = [];

  // Fetch all achievements in a single query to avoid connection pool issues
  const allAchievements = await prisma.achievement.findMany({
    where: {
      id: {
        in: requiredAchievements.map(a => a.id),
      },
    },
    select: {
      id: true,
      title: true,
      category: true,
    },
  });

  // Create a map for quick lookup
  const achievementMap = new Map(allAchievements.map(a => [a.id, a]));

  for (const required of requiredAchievements) {
    const achievement = achievementMap.get(required.id);

    if (!achievement) {
      allExist = false;
      missing.push(required.id);
      console.log(`❌ MISSING: ${required.id} (${required.title} - ${required.category})`);
    } else {
      existing.push(required.id);
      console.log(`✅ EXISTS:  ${required.id} (${achievement.title} - ${achievement.category})`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total required: ${requiredAchievements.length}`);
  console.log(`   ✅ Existing: ${existing.length}`);
  console.log(`   ❌ Missing: ${missing.length}`);

  if (!allExist) {
    console.log('\n⚠️  WARNING: Some achievements are missing!');
    console.log('   Run: npx prisma db seed');
    console.log('   To populate missing achievements.\n');
    console.log('Missing achievements:');
    missing.forEach(id => console.log(`   - ${id}`));
    process.exit(1);
  } else {
    console.log('\n✅ All required achievements exist!');
    process.exit(0);
  }
}

verifyAchievements()
  .catch((e) => {
    console.error('❌ Error verifying achievements:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
