import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Create or update the 3 specified skills
  console.log('Creating/updating skills...');
  const skills = await Promise.all([
    prisma.skill.upsert({
      where: { name: 'JavaScript' },
      update: {},
      create: {
        name: 'JavaScript',
        description: 'Programming language for web development',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Python' },
      update: {},
      create: {
        name: 'Python',
        description: 'General-purpose programming language',
      },
    }),
    prisma.skill.upsert({
      where: { name: 'Java' },
      update: {},
      create: {
        name: 'Java',
        description: 'Object-oriented programming language',
      },
    }),
  ]);

  console.log(`✅ Created/updated ${skills.length} skills`);

  // Get existing users (assuming 5 users exist)
  console.log('Fetching existing users...');
  const users = await prisma.user.findMany({
    take: 5,
    orderBy: { createdAt: 'asc' }
  });

  if (users.length < 5) {
    console.log(`⚠️  Found only ${users.length} users. Creating additional users...`);
    
    // Create additional users if needed
    const additionalUsers: any[] = [];
    for (let i = users.length; i < 5; i++) {
      const userNumber = i + 1;
      const newUser = await prisma.user.create({
        data: {
          clerkId: `user_seed_${userNumber}`,
          name: `User ${userNumber}`,
          email: `user${userNumber}@example.com`,
          avatar: `https://i.pravatar.cc/150?img=${userNumber}`,
          bio: `This is user ${userNumber} created by seed script`,
          coins: 100,
          onboarded: true,
        },
      });
      additionalUsers.push(newUser);
    }
    users.push(...additionalUsers);
  }

  console.log(`✅ Working with ${users.length} users`);

  // Assign skills to users
  console.log('Assigning skills to users...');

  // User 1: HAS JavaScript, Python | WANTS Java
  await Promise.all([
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[0].id, 
          skillId: skills[0].id, // JavaScript
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[0].id, 
        skillId: skills[0].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[0].id, 
          skillId: skills[1].id, // Python
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[0].id, 
        skillId: skills[1].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[0].id, 
          skillId: skills[2].id, // Java
          type: 'WANTS' 
        } 
      },
      update: {},
      create: { 
        userId: users[0].id, 
        skillId: skills[2].id, 
        type: 'WANTS' 
      },
    }),
  ]);

  // User 2: HAS Java, JavaScript | WANTS Python
  await Promise.all([
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[1].id, 
          skillId: skills[2].id, // Java
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[1].id, 
        skillId: skills[2].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[1].id, 
          skillId: skills[0].id, // JavaScript
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[1].id, 
        skillId: skills[0].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[1].id, 
          skillId: skills[1].id, // Python
          type: 'WANTS' 
        } 
      },
      update: {},
      create: { 
        userId: users[1].id, 
        skillId: skills[1].id, 
        type: 'WANTS' 
      },
    }),
  ]);

  // User 3: HAS Python, Java | WANTS JavaScript
  await Promise.all([
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[2].id, 
          skillId: skills[1].id, // Python
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[2].id, 
        skillId: skills[1].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[2].id, 
          skillId: skills[2].id, // Java
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[2].id, 
        skillId: skills[2].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[2].id, 
          skillId: skills[0].id, // JavaScript
          type: 'WANTS' 
        } 
      },
      update: {},
      create: { 
        userId: users[2].id, 
        skillId: skills[0].id, 
        type: 'WANTS' 
      },
    }),
  ]);

  // User 4: HAS JavaScript | WANTS Python, Java
  await Promise.all([
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[3].id, 
          skillId: skills[0].id, // JavaScript
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[3].id, 
        skillId: skills[0].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[3].id, 
          skillId: skills[1].id, // Python
          type: 'WANTS' 
        } 
      },
      update: {},
      create: { 
        userId: users[3].id, 
        skillId: skills[1].id, 
        type: 'WANTS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[3].id, 
          skillId: skills[2].id, // Java
          type: 'WANTS' 
        } 
      },
      update: {},
      create: { 
        userId: users[3].id, 
        skillId: skills[2].id, 
        type: 'WANTS' 
      },
    }),
  ]);

  // User 5: HAS Python | WANTS JavaScript, Java
  await Promise.all([
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[4].id, 
          skillId: skills[1].id, // Python
          type: 'HAS' 
        } 
      },
      update: {},
      create: { 
        userId: users[4].id, 
        skillId: skills[1].id, 
        type: 'HAS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[4].id, 
          skillId: skills[0].id, // JavaScript
          type: 'WANTS' 
        } 
      },
      update: {},
      create: { 
        userId: users[4].id, 
        skillId: skills[0].id, 
        type: 'WANTS' 
      },
    }),
    prisma.userSkill.upsert({
      where: { 
        userId_skillId_type: { 
          userId: users[4].id, 
          skillId: skills[2].id, // Java
          type: 'WANTS' 
        } 
      },
      update: {},
      create: { 
        userId: users[4].id, 
        skillId: skills[2].id, 
        type: 'WANTS' 
      },
    }),
  ]);

  console.log('✅ Assigned skills to all users');

  // Seed achievements
  console.log('Creating achievements...');
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
  console.log(`- Created/updated ${skills.length} skills: ${skills.map(s => s.name).join(', ')}`);
  console.log(`- Created/updated ${achievements.length} achievements`);
  console.log(`- Assigned skills to ${users.length} users`);
  console.log('\n👥 User Skill Assignments:');
  
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const userSkills = await prisma.userSkill.findMany({
      where: { userId: user.id },
      include: { skill: true }
    });
    
    const hasSkills = userSkills.filter(us => us.type === 'HAS').map(us => us.skill.name);
    const wantsSkills = userSkills.filter(us => us.type === 'WANTS').map(us => us.skill.name);
    
    console.log(`  User ${i + 1} (${user.name}):`);
    console.log(`    HAS: ${hasSkills.join(', ')}`);
    console.log(`    WANTS: ${wantsSkills.join(', ')}`);
  }

  console.log('\n🎉 Seed completed successfully!');
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