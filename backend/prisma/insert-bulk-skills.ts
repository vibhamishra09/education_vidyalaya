import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function insertBulkSkills() {
  console.log('🚀 Starting bulk skills insertion...');

  const skillData = [
    { name: 'JavaScript', description: 'Programming language for web development' },
    { name: 'TypeScript', description: 'Typed superset of JavaScript' },
    { name: 'React', description: 'JavaScript library for building user interfaces' },
    { name: 'Node.js', description: 'JavaScript runtime for server-side development' },
    { name: 'Python', description: 'General-purpose programming language' },
    { name: 'Java', description: 'Object-oriented programming language' },
    { name: 'C++', description: 'General-purpose programming language' },
    { name: 'Go', description: 'Programming language developed by Google' },
    { name: 'Rust', description: 'Systems programming language' },
    { name: 'Swift', description: 'Programming language for iOS development' },
    { name: 'Kotlin', description: 'Programming language for Android development' },
    { name: 'Ruby', description: 'Dynamic programming language' },
    { name: 'PHP', description: 'Server-side scripting language' },
    { name: 'SQL', description: 'Structured Query Language for databases' },
    { name: 'MongoDB', description: 'NoSQL document database' },
    { name: 'PostgreSQL', description: 'Open source relational database' },
    { name: 'Docker', description: 'Containerization platform' },
    { name: 'Kubernetes', description: 'Container orchestration platform' },
    { name: 'AWS', description: 'Amazon Web Services cloud platform' },
    { name: 'Azure', description: 'Microsoft cloud platform' },
    { name: 'GCP', description: 'Google Cloud Platform' },
    { name: 'Machine Learning', description: 'AI technique for pattern recognition' },
    { name: 'Data Science', description: 'Interdisciplinary field for data analysis' },
    { name: 'Web Development', description: 'Building websites and web applications' },
    { name: 'Mobile Development', description: 'Creating mobile applications' },
    { name: 'DevOps', description: 'Software development and operations practices' },
    { name: 'UI/UX Design', description: 'User interface and user experience design' },
    { name: 'Cybersecurity', description: 'Protecting systems from digital attacks' },
    { name: 'Blockchain', description: 'Distributed ledger technology' },
    { name: 'Game Development', description: 'Creating video games' },
    { name: 'System Design', description: 'Designing large-scale systems' },
    { name: 'Algorithms', description: 'Step-by-step procedures for solving problems' },
    { name: 'Data Structures', description: 'Ways of organizing data in computer memory' },
  ];

  try {
    console.log(`📝 Inserting ${skillData.length} skills...`);
    
    const skills = await Promise.all(
      skillData.map(skill => 
        prisma.skill.upsert({
          where: { name: skill.name },
          update: { description: skill.description }, // Update description if skill exists
          create: skill,
        })
      )
    );

    console.log(`✅ Successfully processed ${skills.length} skills`);
    
    // Display summary
    console.log('\n📊 Skills Summary:');
    skills.forEach((skill, index) => {
      console.log(`${index + 1}. ${skill.name} - ${skill.description}`);
    });

    console.log('\n🎉 Bulk skills insertion completed successfully!');
  } catch (error) {
    console.error('❌ Bulk skills insertion failed:');
    console.error(error);
    throw error;
  }
}

insertBulkSkills()
  .catch((e) => {
    console.error('❌ Script failed:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
