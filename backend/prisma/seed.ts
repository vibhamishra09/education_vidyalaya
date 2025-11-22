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

  // Display summary
  console.log('\n📊 Summary:');
  console.log(`- Created/updated ${skills.length} skills: ${skills.map(s => s.name).join(', ')}`);
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