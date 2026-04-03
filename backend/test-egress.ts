import { EgressClient } from 'livekit-server-sdk';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load env from both locations to be safe
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const key = process.env.LIVEKIT_API_KEY;
const secret = process.env.LIVEKIT_API_SECRET;
const url = process.env.LIVEKIT_URL;

if (!key || !secret || !url) {
    console.error('Missing LiveKit environment variables');
    process.exit(1);
}

const host = url.replace('wss://', 'https://').replace('ws://', 'http://');
const client = new EgressClient(host, key, secret);

const testRoom = 'studyroom-cmng0zr5o0005reo8mdav27wc'; // Should be an active room from logs
const bucket = process.env.AWS_S3_BUCKET_NAME;
const region = process.env.AWS_REGION || 'us-west-2';
const accessKey = process.env.AWS_ACCESS_KEY_ID;
const secretKey = process.env.AWS_SECRET_ACCESS_KEY;

async function testEgress() {
    console.log(`Testing Egress for room: ${testRoom} on ${host}`);
    
    const s3Config = {
        bucket,
        region,
        accessKey,
        secret: secretKey,
    };

    // Attempt 1: The structure I'm currently using (Nested Protobuf case/value)
    console.log('Attempt 1: Nested Protobuf structure...');
    try {
        const info = await client.startRoomCompositeEgress(testRoom, {
            filepath: `diagnostics/test-1-${Date.now()}.mp4`,
            output: {
                case: 's3',
                value: s3Config,
            },
        } as any);
        console.log('Attempt 1 Success! EgressID:', info.egressId);
        return;
    } catch (e) {
        console.error('Attempt 1 Failed:', e.message);
    }

    // Attempt 2: Flat structure (Old SDK style)
    console.log('Attempt 2: Flat S3 structure...');
    try {
        const info = await client.startRoomCompositeEgress(testRoom, {
            filepath: `diagnostics/test-2-${Date.now()}.mp4`,
            s3: s3Config,
        } as any);
        console.log('Attempt 2 Success! EgressID:', info.egressId);
        return;
    } catch (e) {
        console.error('Attempt 2 Failed:', e.message);
    }
    
    // Attempt 3: Wrapped file structure (LiveKit 1.6+)
    console.log('Attempt 3: Wrapped file structure...');
    try {
        const info = await client.startRoomCompositeEgress(testRoom, {
          file: {
            filepath: `diagnostics/test-3-${Date.now()}.mp4`,
            s3: s3Config
          }
        } as any);
        console.log('Attempt 3 Success! EgressID:', info.egressId);
        return;
    } catch (e) {
        console.error('Attempt 3 Failed:', e.message);
    }
}

testEgress().catch(console.error);
