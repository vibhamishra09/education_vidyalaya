import { PrismaClient } from '../src/generated/prisma/client';

/**
 * Standalone script to check database connectivity
 * Run with: pnpm tsx scripts/check-db-health.ts
 */

async function checkDatabaseHealth() {
  const prisma = new PrismaClient();
  
  console.log('🔍 Checking database connection...\n');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not Set ✗');
  
  try {
    // Test connection with a simple query
    await prisma.$queryRaw`SELECT 1`;
    
    console.log('\n✅ Database Status: HEALTHY');
    console.log('✓ Connection successful');
    console.log('✓ Query executed successfully');
    
    // Get database version info
    const result: any = await prisma.$queryRaw`SELECT version()`;
    console.log('\nDatabase Info:');
    console.log(result[0].version);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.log('\n❌ Database Status: UNHEALTHY');
    console.log('✗ Connection failed\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    
    await prisma.$disconnect();
    process.exit(1);
  }
}

checkDatabaseHealth();
