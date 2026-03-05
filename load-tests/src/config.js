import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../.env') });

export const config = {
  wsUrl: process.env.WS_URL || 'http://localhost:3001',
  totalUsers: parseInt(process.env.TOTAL_USERS || '100', 10),
  rampUpTime: parseInt(process.env.RAMP_UP_TIME || '10', 10), // seconds
  testDuration: parseInt(process.env.TEST_DURATION || '60', 10), // seconds
  studyRoomId: process.env.STUDY_ROOM_ID,
  sessionType: process.env.SESSION_TYPE || 'studyRoom',
  chatChannelId: process.env.CHAT_CHANNEL_ID,
  
  // Clerk config (if generating tokens)
  clerkSecretKey: process.env.CLERK_SECRET_KEY,
  clerkPublishableKey: process.env.CLERK_PUBLISHABLE_KEY,
  
  // Test user IDs (comma-separated, or will be generated)
  testUserIds: process.env.TEST_USER_IDS
    ? process.env.TEST_USER_IDS.split(',').map(id => id.trim())
    : null,

  // A real Clerk session JWT copied from browser devtools.
  // Required for backends that validate tokens with Clerk.
  testAuthToken: process.env.TEST_AUTH_TOKEN || null,
};

// Validate required config
if (!config.studyRoomId) {
  console.warn('⚠️  STUDY_ROOM_ID not set. Some tests may fail.');
}

export default config;
