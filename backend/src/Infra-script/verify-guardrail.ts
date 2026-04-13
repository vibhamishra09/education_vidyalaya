import { PrismaClient, SessionStatus } from '../generated/prisma';
import { Logger } from '@nestjs/common';
import { INFRA_LIMITS } from '../common/constants';

async function verifyGuardrail() {
  const prisma = new PrismaClient();
  const logger = new Logger('GuardrailVerifier');

  console.log('--- WEBYALAYA GUARDRAIL VERIFICATION ---');
  
  // 1. Check current ONGOING rooms
  const ongoingRoomsCount = await prisma.studyRoom.count({
    where: { sessionStatus: SessionStatus.ONGOING },
  });
  
  console.log(`Current Ongoing Rooms: ${ongoingRoomsCount}`);

  if (ongoingRoomsCount >= INFRA_LIMITS.MAX_CONCURRENT_ROOMS) {
    console.log(`✅ Hard limit of ${INFRA_LIMITS.MAX_CONCURRENT_ROOMS} rooms is met or exceeded in the database.`);
    console.log('Any attempt to create a NEW room via StudyRoomsService should now fail.');
  } else {
    console.log(`⚠️ Under the limit (${ongoingRoomsCount}/${INFRA_LIMITS.MAX_CONCURRENT_ROOMS}). Launching more rooms via lk load-test might be needed to test the block.`);
  }

  await prisma.$disconnect();
}

verifyGuardrail().catch(console.error);
