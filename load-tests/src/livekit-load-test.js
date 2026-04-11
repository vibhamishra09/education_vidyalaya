import { AccessToken } from 'livekit-server-sdk';
import { Room, RoomEvent, VideoPresets, Track, ConnectionQuality } from 'livekit-client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekit.webyalaya.com';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

async function createToken(roomName, identity, isHost) {
  const at = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
    identity,
    ttl: '1h',
  });
  at.addGrant({
    roomJoin: true,
    room: roomName,
    canPublish: true,
    canSubscribe: true,
  });
  return at.toJwt();
}

async function simulateParticipant(roomName, identity, isHost) {
  const token = await createToken(roomName, identity, isHost);
  const room = new Room({
    adaptiveStream: true,
    dynacast: true,
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  });

  room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
    if (participant.isLocal && quality < ConnectionQuality.Excellent) {
       // Log quality issues for the load test report
    }
  });

  try {
    await room.connect(LIVEKIT_URL, token);
    console.log(`[${roomName}] Participant ${identity} connected (Host: ${isHost})`);

    if (isHost) {
      // Simulate video publishing if we were in a browser
      // In Node.js environment without WebRTC polyfills, we just maintain the connection
      console.log(`[${roomName}] Host ${identity} joined and is simulating 720p presence`);
    }

    // Keep connection alive for 60 seconds for the test
    await new Promise(resolve => setTimeout(resolve, 60000));
    await room.disconnect();
    console.log(`[${roomName}] Participant ${identity} disconnected`);
    return true;
  } catch (error) {
    console.error(`[${roomName}] Participant ${identity} failed:`, error.message);
    return false;
  }
}

async function runLoadTest(numRooms, participantsPerRoom) {
  console.log(`🚀 Starting LiveKit Load Test`);
  console.log(`Rooms: ${numRooms}, Participants per room: ${participantsPerRoom}`);
  console.log(`Total Target Participants: ${numRooms * participantsPerRoom}`);

  const startTime = Date.now();
  const tasks = [];

  for (let r = 0; r < numRooms; r++) {
    const roomName = `load-test-room-${r}`;
    for (let p = 0; p < participantsPerRoom; p++) {
      const isHost = p === 0;
      const identity = `user-${r}-${p}`;
      tasks.push(simulateParticipant(roomName, identity, isHost));
      // Ramp up
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  const results = await Promise.all(tasks);
  const successful = results.filter(r => r === true).length;
  const duration = (Date.now() - startTime) / 1000;

  console.log(`\n📊 Load Test Results`);
  console.log(`Successful Connections: ${successful}/${results.length}`);
  console.log(`Success Rate: ${((successful / results.length) * 100).toFixed(2)}%`);
  console.log(`Test Duration: ${duration.toFixed(2)}s`);
}

// Running a smaller scale locally first to verify script
// 15 rooms * 11 participants = 165 total
const NUM_ROOMS = 3; 
const PARTICIPANTS_PER_ROOM = 5;

runLoadTest(NUM_ROOMS, PARTICIPANTS_PER_ROOM).catch(console.error);
