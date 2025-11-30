# 🎤 Transcript WebSocket Testing Guide

## Overview
We've implemented a comprehensive "Text-First Real-Time Architecture" for meeting/call summaries with the following components:

## Backend Components ✅

### 1. TranscriptsGateway (`/backend/src/transcripts/transcripts.gateway.ts`)
- **WebSocket Endpoint**: `ws://localhost:3001`
- **Authentication**: Clerk JWT token validation
- **Event Handler**: `@SubscribeMessage('transcript-chunk')`
- **Enhanced Logging**: Connection, authentication, and transcript processing logs

### 2. TranscriptsService (`/backend/src/transcripts/transcripts.service.ts`)
- **Redis Storage**: Stores transcript chunks with 2-hour TTL
- **AI Summarization**: Uses Gemini 1.5 Flash for meeting summaries
- **Methods**: `storeTranscriptChunk()`, `compileAndSummarize()`

### 3. Database Schema Updates
- Added `summary` field to `StudyRoom` and `PeerSession` models
- Migration applied: `20251128053454_add_meeting_summary`

## Frontend Components ✅

### 1. EnhancedVideoRoom (`/my-app/src/components/livekit/EnhancedVideoRoom.tsx`)
- **Socket.io Connection**: Connects to backend WebSocket
- **Enhanced Logging**: Connection status, session details, speech recognition state
- **Event Listeners**: `transcript-received`, `transcript-error`

### 2. Speech Recognition Hook (`/my-app/src/hooks/use-speech-recognition.ts`)
- **Web Speech API**: Uses `webkitSpeechRecognition`
- **Continuous Listening**: Auto-restart functionality
- **Real-time Emission**: Sends both interim and final results

## Testing Instructions

### 1. Start Backend
```bash
cd backend
pnpm run start:dev
```
**Expected logs:**
- `🚀 Application is running on: http://localhost:3001`
- `🌐 CORS enabled for origins: [...]`

### 2. Start Frontend
```bash
cd my-app
pnpm run dev
```
**Expected:** Frontend running on `http://localhost:3000`

### 3. Test WebSocket Connection

#### Option A: Use Test HTML File
1. Open `test-transcript.html` in browser
2. Enter your Clerk JWT token (get from browser dev tools)
3. Click "🔌 Connect WebSocket"
4. Look for "✅ WebSocket connected successfully!"

#### Option B: Use Live Video Room
1. Navigate to a video room in the app
2. Open browser dev tools → Console
3. Look for these logs:
   ```
   🔌 [Transcripts] Connecting to WebSocket endpoint: http://localhost:3001
   🔌 [Transcripts] Session ID: <session-id>
   🔌 [Transcripts] User ID: <user-id>
   ✅ [Transcripts] Socket connected successfully!
   🎤 [Transcripts] Speech recognition will now start
   ```

### 4. Test Speech Recognition
1. Allow microphone permissions
2. Start speaking
3. Check console for:
   ```
   🎤 [SpeechRecognition] Started listening
   🎤 [SpeechRecognition] Sent interim transcript: "hello world"
   📝 [Transcripts] Server acknowledged transcript: hello world
   ```

### 5. Backend Verification
Check backend logs for:
```
🔌 Transcript WebSocket connected successfully - User: <user-id>, Client: <client-id>
✅ Stored transcript chunk for call <call-id> from user <user-id>: "hello world"
```

### 6. Redis Verification
```bash
redis-cli
> KEYS call:*:transcripts
> LRANGE call:<call-id>:transcripts 0 -1
```

## Common Issues & Solutions

### ❌ "Socket connection failed"
- **Check**: Backend is running on port 3001
- **Check**: Clerk JWT token is valid
- **Check**: CORS settings include your frontend URL

### ❌ "Speech recognition not supported"
- **Solution**: Use Chrome/Edge browser
- **Check**: HTTPS connection (required for speech recognition)

### ❌ "Not authenticated" 
- **Check**: Valid Clerk JWT token in WebSocket auth
- **Check**: User is logged in to the app

### ❌ No transcript chunks stored
- **Check**: Redis is running and connected
- **Check**: Microphone permissions granted
- **Check**: Speech recognition is actually starting

## WebSocket Event Flow

```
Frontend                    Backend
   |                          |
   |--- connect -------------->|  (JWT validation)
   |<-- connect_success -------|
   |                          |
   |--- transcript-chunk ----->|  (store in Redis)
   |<-- transcript-received ---|
   |                          |
   |--- (session ends) ------->|  (AI summarization)
   |                          |
```

## Environment Variables

### Backend (`.env`)
```
CLERK_SECRET_KEY=sk_...
CLERK_PUBLISHABLE_KEY=pk_...
GEMINI_API_KEY=...
REDIS_URL=redis://localhost:6379
```

### Frontend (`.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
```

## Next Steps
1. Test end-to-end with real video sessions
2. Verify AI summary generation on session completion
3. Test with multiple participants
4. Monitor performance with longer transcripts