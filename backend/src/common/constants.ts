import { Logger } from '@nestjs/common';

/**
 * Global infrastructure limits for the platform.
 * These are used to prevent resource exhaustion during peak load.
 */
export const INFRA_LIMITS = {
  // Maximum participants allowed in a standard study room
  STUDY_ROOM_MAX_PARTICIPANTS: parseInt(process.env.STUDY_ROOM_MAX_PARTICIPANTS || '12', 10),
  
  // Maximum participants allowed in a webinar
  WEBINAR_MAX_PARTICIPANTS: parseInt(process.env.WEBINAR_MAX_PARTICIPANTS || '100', 10),
  
  // Maximum total concurrent ongoing rooms on the infrastructure
  MAX_CONCURRENT_ROOMS: parseInt(process.env.MAX_CONCURRENT_ROOMS || '12', 10),
};

const logger = new Logger('InfraConfig');
logger.log(`Infrastructure limits loaded: StudyRoomMax=${INFRA_LIMITS.STUDY_ROOM_MAX_PARTICIPANTS}, WebinarMax=${INFRA_LIMITS.WEBINAR_MAX_PARTICIPANTS}, MaxRooms=${INFRA_LIMITS.MAX_CONCURRENT_ROOMS}`);
