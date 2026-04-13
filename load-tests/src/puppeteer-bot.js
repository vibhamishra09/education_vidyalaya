import puppeteer from 'puppeteer';
import { AccessToken } from 'livekit-server-sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../backend/.env') });

const LIVEKIT_URL = process.env.LIVEKIT_URL || 'wss://livekit.webyalaya.com';
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY;
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET;

const livekitClientPath = path.join(__dirname, '../node_modules/livekit-client/dist/livekit-client.umd.min.js');
const livekitClientJs = fs.readFileSync(livekitClientPath, 'utf8');

async function createToken(roomName, identity) {
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

async function runParticipant(roomName, identity) {
  const token = await createToken(roomName, identity);
  console.log(`[${identity}] Starting Puppeteer for room ${roomName}...`);
  
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream',
      '--use-fake-device-for-media-stream',
      '--no-sandbox',
    ],
  });

  const page = await browser.newPage();
  
  page.on('console', msg => console.log(`[BROWSER ${identity}] ${msg.text()}`));
  page.on('pageerror', err => console.error(`[BROWSER ERROR ${identity}] ${err.message}`));

  await page.setContent(`
    <html>
      <head>
        <title>LiveKit Bot</title>
      </head>
      <body>
        <h1>LiveKit Bot: ${identity}</h1>
        <div id="status">Connecting...</div>
        <script>
          // Injected LiveKit Client
          ${livekitClientJs}
        </script>
        <script>
          console.log('LiveKit Client injected. Checking globals...');
          // LiveKit Client UMD exports to LiveKit global
          const LiveKitNamespace = window.LiveKit || window.LivekitClient;
          console.log('Global Namespace:', !!LiveKitNamespace);
          
          if (!LiveKitNamespace) {
            console.error('FAILED: LiveKit namespace not found');
          } else {
            const room = new LiveKitNamespace.Room();
            room.on('connected', () => {
              console.log('CONNECTED_EVENT_FIRED');
              document.getElementById('status').innerText = 'Connected';
            });
            
            room.connect('${LIVEKIT_URL}', '${token}', {
               autoSubscribe: true,
            })
              .then(() => {
                console.log('JOINED_PROMISE_RESOLVED');
                return room.localParticipant.setCameraEnabled(true);
              })
              .then(() => {
                console.log('CAMERA_PUBLISHED');
              })
              .catch(err => {
                console.error('CONNECTION_FAILED:', err.message);
                document.getElementById('status').innerText = 'Failed: ' + err.message;
              });
          }
        </script>
      </body>
    </html>
  `);

  // Wait for success
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Connection Timeout after 45s')), 45000);
      page.on('console', msg => {
        if (msg.text().includes('CAMERA_PUBLISHED') || msg.text().includes('JOINED_PROMISE_RESOLVED')) {
          clearTimeout(timeout);
          resolve();
        }
      });
    });
    console.log(`[${roomName}] Participant ${identity} session active`);
    await new Promise(resolve => setTimeout(resolve, 5000));
  } catch (err) {
    console.error(`[${roomName}] Participant ${identity} workflow FAILED:`, err.message);
  } finally {
    await browser.close();
  }
}

const ROOM = 'load-test-verification';
const ID = 'bot-' + Math.random().toString(36).substring(7);

runParticipant(ROOM, ID).catch(console.error);
