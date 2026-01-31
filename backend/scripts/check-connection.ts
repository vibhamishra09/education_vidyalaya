import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not defined');
    return;
  }
  
  // Sanitized logging
  const maskedUrl = url.replace(/:([^:@]+)@/, ':****@');
  console.log('DATABASE_URL:', maskedUrl);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: url,
      },
    },
    log: ['info', 'query', 'error', 'warn'],
  });

  try {
    console.log('Connecting...');
    await prisma.$connect();
    console.log('Connected successfully!');
    const count = await prisma.user.count();
    console.log('User count:', count);
  } catch (e) {
    console.error('Connection failed:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
