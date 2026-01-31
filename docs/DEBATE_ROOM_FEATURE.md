# Debate Room Feature Documentation

## Overview

The **Debate Room** is a comprehensive platform for conducting structured, real-time debates with multiple participants. It combines video/audio communication via LiveKit, persistent database-backed chat, real-time messaging through Socket.io, and sophisticated moderator controls to create an immersive debate experience.

### Key Purpose
- Enable organized discussions between two teams (FOR and AGAINST) on a topic
- Provide real-time communication with video, audio, and chat capabilities
- Manage turn-taking and speaking order fairly
- Allow moderators to oversee and control the debate
- Store complete debate history and transcripts

---

## Core Features

### 1. **Video & Audio Communication**
- **Technology**: LiveKit WebRTC for peer-to-peer video/audio
- **Capabilities**:
  - HD video streaming with multiple participants
  - Crystal-clear audio with built-in noise handling
  - Screen sharing for presenting evidence/materials
  - Individual camera and microphone controls
  - Bandwidth optimization for better performance
- **Participant Limit**: Configurable (default 6 participants)
- **Default Thumbnails**: When a user disables their camera, a professional avatar placeholder is shown with their name

### 2. **Multi-View Display**

#### **Grid View** (All Participants Visible)
- Shows ALL participants simultaneously
- Includes both team members AND moderators
- Moderators distributed evenly between team panels (half on FOR side, half on AGAINST)
- Best for: Full awareness of all participants, following team discussions
- Grid automatically adjusts based on number of participants:
  - 1 participant: Single column
  - 2 participants: Single column on mobile, 2 columns on desktop
  - 3+ participants: 2-column grid

#### **Presenter View** (Active Speaker Only)
- Shows only the current speaker from each team panel
- Falls back to first participant if no one is speaking
- Clean, focused view on who is talking
- Best for: Following main arguments, reducing visual clutter
- Still shows both team sides with their active speakers

#### **Sidebar Chat & Teams**
- Can be toggled open/closed
- Contains:
  - **Teams Tab**: List of all moderators and team members with status indicators
  - **Chat Tab**: Debate room chat with role-based visibility
- When opened: Overlays on mobile, positioned on right on desktop
- When closed: Maximizes the debate area

### 3. **Turn-Based Speaking System**

#### **Prep Phase** (Before Debate Starts)
- Configurable prep time (default 30 seconds)
- Countdown timer visible to all participants
- Teams can strategize and prepare arguments
- Moderators can start debate when ready

#### **Live Debate Phase**
- **Turn Timer**: Shows remaining speaking time (default 120 seconds per turn)
- **Speaking Indicator**: Current speaker highlighted with "Speaking" badge and yellow border
- **Turn Management**:
  - Turns automatically cycle between teams based on turn order
  - Moderators can manually advance to next turn with "Next" button
  - Moderators can end debate at any time with "End" button
- **Turn Order Types**:
  - **FIFO**: First In, First Out - speak in order of team joining
  - **ALTERNATING**: Strictly alternate between teams
  - Custom scheduling possible

#### **Buzzer System**
- **Purpose**: Allows participants to signal they want to speak next
- **Features**:
  - Buzzer button (⚡ Zap icon) visible to team members during live debate
  - When pressed: User added to buzzer queue
  - Queue shows position (1st, 2nd, 3rd, etc.)
  - Users cannot buzz twice (unless dequeued)
  - Real-time queue updates via Socket.io
- **Moderator Visibility**: Can see full buzzer queue and manage order

### 4. **Role-Based Access Control**

#### **Host Role** 👑
- Full control over debate room
- Can promote/demote moderators
- Can start/end debate and manage turns
- Access to all chat visibility levels
- Can clear chat history
- Can ban participants
- Moderator duties + administrative control

#### **Moderator Role** 🛡️
- Oversees fair debate conduct
- Can send broadcasts to all participants
- Can send private messages to other moderators only (🔒)
- Can view messages from both teams
- Can clear chat history
- Cannot directly control turn flow (unless host)

#### **Team Member Role** 🟢/🔴
- Can see and hear their team and moderators
- Can send messages to their team + moderators
- Can press buzzer to indicate wanting to speak
- Cannot see other team's messages
- Cannot access moderator controls

#### **Spectator Role** 👁️
- Can watch debate live
- Can see public messages and moderator broadcasts only
- Cannot send team-specific messages
- Cannot press buzzer
- Read-only access

### 5. **Real-Time Chat System**

#### **Chat Channels by Visibility**
Messages have different visibility based on role and setting:

| Visibility | Who Can See | Created By |
|-----------|-----------|-----------|
| `ALL` | Everyone | Spectators, Moderators (broadcast) |
| `MODERATOR` | All Moderators + Teams | Moderators (broadcast) |
| `MODERATOR_ONLY` | Moderators only | Moderators (private) |
| `TEAM_FOR` | Team FOR + Moderators | Team FOR members |
| `TEAM_AGAINST` | Team AGAINST + Moderators | Team AGAINST members |

#### **Message Features**
- **Persistent Storage**: All messages stored in PostgreSQL
- **Real-Time Delivery**: Socket.io broadcasts new messages instantly
- **Message History**: Load previous messages from database on room load
- **Visibility Badges**: 
  - 🔒 Moderators Only
  - 📢 Broadcast
  - 🟢 Team FOR
  - 🔴 Team AGAINST
- **Author Information**:
  - User avatar from profile
  - Color-coded name (green for FOR, red for AGAINST, yellow for moderators)
  - Timestamp of message
- **Auto-Scroll**: Chat automatically scrolls to latest message

#### **Moderator Chat Controls**
- **Checkbox Toggle**: "🔒 Send to moderators only" for private messages
- **Clear History Button**: Remove all messages from debate (with broadcast notification)
- Can send to all teams at once for announcements

### 6. **Debate State Management**

#### **Real-Time State Updates**
Each debate has a persistent state stored in Redis + PostgreSQL:

```typescript
interface DebateState {
  status: 'PREP' | 'LIVE' | 'ENDED';
  currentTurnIndex: number;      // Which turn (0, 1, 2, ...)
  currentSpeakerId: string | null;  // User speaking now
  turnStartedAt: timestamp;       // When current turn began
  turnEndTime: timestamp;         // When current turn ends
  prepEndTime: timestamp;         // When prep phase ends
}
```

- **Auto-Updates**: Every participant sees state changes in real-time
- **Turn Progression**: Automatically calculated when time runs out
- **Speaker Change**: Broadcasts when new speaker takes turn

#### **Status Indicators**
- **Prep Phase Badge**: Blue badge showing "Prep Phase" with countdown
- **Live Badge**: Red "🔴 LIVE" badge during debate
- **Participant Count**: Shows "3 (2 videos)" - active participants and video feeds

### 7. **Transcription & Recording** 📝

#### **Live Transcript**
- Captures spoken words in real-time from each participant
- Attributed to speaker with timestamp
- Stored in Redis for quick access
- Persisted to database after debate ends

#### **Session Recording**
- LiveKit records video/audio (when enabled)
- Full debate history preserved
- Available for: Review, appeal, record keeping

### 8. **Debate Results & Analytics**

#### **Automatic Winner Determination**
- System analyzes speaking time, turns taken, buzzer activity
- Calculates overall performance metrics
- Winner determined by debate configuration rules

#### **Coin Rewards**
- Winning team receives 50 coins per member
- Stored in user profiles
- Motivates participation and winning

#### **Results Dashboard**
- Shows final results post-debate
- Displays statistics:
  - Total speaking time per team
  - Number of turns per team
  - Buzzer activity
  - Most active speaker

### 9. **Moderator Tools**

#### **Turn Management**
- **"Next" Button**: Skip current turn and advance to next speaker
- **"End" Button**: Immediately end debate regardless of timer
- **Manual Speaker Assignment**: Assign specific person to speak next (via buzzer queue)

#### **Participant Management**
- **Mute/Unmute**: Control participant audio (real-time)
- **Kick/Ban**: Remove disruptive participants
  - Kicked: Can rejoin (temporary removal)
  - Banned: Permanently blocked from this debate
- **Promote/Demote**: Add/remove moderator status

#### **Chat Management**
- **Clear History**: Delete all messages, notify all participants
- **Message Visibility Control**: Ensure proper filtering
- **Monitor**: See all team messages and private moderator chats

#### **Debate Control**
- **Start/End**: Control when debate begins and ends
- **Pause**: (Future feature) Pause debate temporarily
- **Extend Time**: Give team more speaking time if needed

### 10. **Notification System**

#### **Real-Time Notifications**
Participants notified of:
- Debate started / Debate ended
- Your turn to speak
- Buzzer called (for moderators)
- Participant joined/left
- Chat cleared
- You've been kicked/banned
- You've been promoted/demoted

#### **Notification Types**
- In-app: Socket.io events
- Web Push: For participants not currently in tab
- Email: (Future) For important events like debate end

---

## Technical Architecture

### Backend Stack

#### **Framework**: NestJS
- Microservice-ready architecture
- Dependency injection for clean code
- Guards and interceptors for security

#### **Real-Time Communication**
- **Socket.io Gateway** (`debate.gateway.ts`):
  - Namespace: `/debate`
  - Handles connections, disconnections
  - Broadcasts state changes and events
  - Manages room-specific socket groups
  
- **Chat Gateway** (`debate-chat.gateway.ts`):
  - Namespace: `/debate-chat`
  - Real-time message delivery
  - Handles join/leave room events

#### **Database** (PostgreSQL via Prisma ORM)

**Core Tables**:
- `DebateRoom`: Room metadata, configuration, status
- `DebateTeam`: FOR and AGAINST teams
- `DebateParticipant`: Team membership
- `DebateModerator`: Moderator assignments
- `DebateChatMessage`: Chat persistence
- `DebateTranscript`: Speech transcription
- `BuzzerQueue`: Turn order and buzzer state
- `User`: User profiles, roles, stats

#### **External Services**
- **LiveKit**: Video/audio infrastructure
  - Room creation and management
  - Token generation for participants
  - Screen sharing
  - Recording (optional)
  
- **Redis**: Caching and temporary state
  - Current debate state
  - Buzzer queue
  - Team chat messages (24-hour retention)
  - Session timers
  
- **Clerk**: Authentication
  - User sign-up/login
  - JWT token validation
  - User management

#### **Services**

**DebateRoomsService** (`debate-rooms.service.ts`):
```typescript
- createDebateRoom()          // Create new debate
- joinDebateRoom()            // Add participant
- leaveDebateRoom()           // Remove participant
- startDebate()               // Begin live debate
- advanceTurn()               // Next speaker
- endDebate()                 // Finish debate
- getDebateRoom()             // Fetch room details
- promoteModerator()          // Upgrade participant
- banParticipant()            // Remove + block user
- getDebateResults()          // Final results
```

**DebateChatService** (`debate-chat.service.ts`):
```typescript
- saveMessage()               // Store chat message
- getMessages()               // Retrieve with filtering
- clearMessages()             // Delete all messages
```

**DebateAiService** (`debate-ai.service.ts`):
- Determines debate winner
- Calculates performance metrics
- Generates debate summary

### Frontend Stack

#### **Framework**: Next.js 15 (React)
- Server-side rendering for initial load
- Client-side interactivity for real-time features
- TypeScript for type safety

#### **Real-Time Communication**
- **socket.io-client**: Connect to `/debate` and `/debate-chat` namespaces
- **Event Listeners**:
  - State updates
  - New messages
  - Participant join/leave
  - Buzzer events
  - Timer updates

#### **Key Components**

**DebateLiveRoom** (`debate-live-room.tsx`):
- Main debate interface
- Manages video grid, chat, teams sidebar
- Handles view mode switching (Grid vs Presenter)
- Coordinates Socket.io connections
- Integrates LiveKit camera/mic controls

**TeamVideoGrid** (`debate-live-room.tsx`):
- Renders video tiles for participants
- Shows avatar placeholders when video off
- Displays current speaker highlights
- Shows "Speaking" indicator with animation

**Chat Sidebar** (`debate-live-room.tsx`):
- Teams tab: List of participants
- Chat tab: Message history + input
- Role-based visibility control
- Moderator-only toggle checkbox

**DebateTeamChat** (`debate-team-chat.tsx`):
- Renders message list
- Auto-scrolls to latest
- Message input field
- Color-coded by team

**DebateTurnTimer** (`debate-turn-timer.tsx`):
- Countdown timer display
- Time warning at 10 seconds
- Auto-updates every 100ms

**DebateBuzzer** (`debate-buzzer.tsx`):
- Large buzzer button
- Shows queue position
- Ripple animation on press
- Disabled when in queue

#### **State Management**
- **React Hooks**: useState, useCallback, useMemo, useEffect
- **Local State**: 
  - View mode (Grid vs Presenter)
  - Sidebar open/closed
  - Chat input text
  - Audio/video status
- **Server State** (via Socket.io):
  - Debate state
  - Participants
  - Messages
  - Buzzer queue

#### **Authentication**
- **Clerk useAuth Hook**: Get JWT token for API calls
- **Bearer Token**: Passed in all API requests
- **Guards**: ClerkAuthGuard validates requests server-side

---

## Data Flow

### Creating a Debate Room

```
User (Frontend)
    ↓
POST /api/debate-rooms (with JWT)
    ↓
ClerkAuthGuard (validates token)
    ↓
DebateRoomsController → Service
    ↓
1. Create DebateRoom record
2. Create FOR and AGAINST teams
3. Generate LiveKit room name
4. Create LiveKit room via API
5. Return room data + LiveKit token
    ↓
Frontend receives room details
    ↓
Redirect to room → LiveKit connection
```

### Joining a Debate Room

```
Participant clicks "Join"
    ↓
POST /api/debate-rooms/:roomId/join (with side selection)
    ↓
DebateRoomsService:
  - Get user from Clerk ID
  - Add to selected team
  - Generate LiveKit token
  - Store in database
    ↓
Socket.io emits "debate:user_joined"
    ↓
All participants notified
DebateGateway broadcasts state update
```

### Sending a Chat Message

```
User types message
    ↓
POST /api/debate-rooms/:roomId/messages
  {
    content: "...",
    userRole: "participant",
    userSide: "FOR",
    isModeratorOnly: false
  }
    ↓
DebateChatController:
  - Look up user by clerkId
  - Determine visibility based on role
  - Save to PostgreSQL
    ↓
Socket.io emits "message-sent" event
    ↓
DebateChatGateway:
  - Filter recipients based on visibility
  - Broadcast "new-message" to room
    ↓
Frontend:
  - Receives in Socket listener
  - Adds to messages state
  - Auto-scrolls chat
```

### Turn Advancement

```
Moderator clicks "Next Turn" OR timer expires
    ↓
PUT /api/debate-rooms/:roomId/advance-turn
    ↓
DebateRoomsService:
  - Calculate next speaker
  - Update Redis state
  - Store in database
    ↓
DebateGateway broadcasts "debate:turn_started"
  - Current speaker ID
  - Turn index
  - Time started
    ↓
All participants:
  - Highlight new speaker
  - Start timer countdown
  - Update turn number
```

---

## Configuration

### Room Settings (CreateDebateRoomDto)

```typescript
{
  topic: string;                          // Debate topic
  description?: string;                    // Additional context
  maxParticipants?: number;               // Default: 6
  turnDurationSeconds?: number;           // Default: 120
  prepTimeSeconds?: number;               // Default: 30
  turnOrder?: 'FIFO' | 'ALTERNATING';    // Default: FIFO
  scheduledAt?: Date;                     // Schedule for later
}
```

### API Endpoints

#### **Debate Room Management**
```
GET    /api/debate-rooms                 List all rooms
GET    /api/debate-rooms?status=LIVE     Filter by status
GET    /api/debate-rooms/:roomId         Get room details
POST   /api/debate-rooms                 Create room
PATCH  /api/debate-rooms/:roomId         Update room
DELETE /api/debate-rooms/:roomId         Delete room
```

#### **Participation**
```
POST   /api/debate-rooms/:roomId/join              Join as participant
POST   /api/debate-rooms/:roomId/leave             Leave debate
POST   /api/debate-rooms/:roomId/promote-moderator Promote to moderator
POST   /api/debate-rooms/:roomId/ban               Ban participant
```

#### **Debate Control**
```
POST   /api/debate-rooms/:roomId/start             Start live debate
POST   /api/debate-rooms/:roomId/advance-turn      Next turn
POST   /api/debate-rooms/:roomId/end               End debate
GET    /api/debate-rooms/:roomId/results           Get results
```

#### **Chat**
```
POST   /api/debate-rooms/:roomId/messages          Send message
GET    /api/debate-rooms/:roomId/messages          Get history
DELETE /api/debate-rooms/:roomId/messages          Clear chat
```

#### **Buzzer**
```
POST   /api/debate-rooms/:roomId/buzzer            Press buzzer
GET    /api/debate-rooms/:roomId/buzzer            Get queue
```

### Socket.io Events

#### **Client → Server**
```
debate:join_room              Join WebSocket room
debate:leave_room             Leave WebSocket room
debate:team_chat              Send team message
debate:transcript             Submit transcript
debate:buzzer                 Press buzzer
debate:moderator_action       Mute/kick/unmute participant
debate:start_prep             Begin prep phase
```

#### **Server → Client**
```
debate:user_joined            Participant connected
debate:user_left              Participant disconnected
debate:team_message           New team message (deprecated)
debate:prep_started           Prep phase beginning
debate:prep_countdown         Prep time remaining
debate:debate_started         Live debate starting
debate:turn_started           New turn with speaker
debate:turn_countdown         Time remaining on turn
debate:turn_ended             Current turn finished
debate:debate_ended           Entire debate finished
debate:participant_banned     Someone was kicked
debate:speaker_change         New speaker (same turn)
debate:state_update           Full state refresh
debate:error                  Error occurred
```

---

## Security Features

### Authentication
- **Clerk JWT**: Required for all protected endpoints
- **User Lookup**: All server operations verify user exists in database
- **Token Validation**: ClerkAuthGuard on all protected routes

### Authorization
- **Role-Based Access**: Host > Moderator > Team Member > Spectator
- **Team-Based Visibility**: Teams only see their messages + broadcasts
- **Server-Side Filtering**: Chat filtering enforced server-side, not just client
- **Database Constraints**: Foreign keys ensure referential integrity

### Data Protection
- **Encrypted Communication**: HTTPS/WSS for all connections
- **Password Hashing**: Clerk handles user auth
- **CORS**: Restricted to trusted frontend URLs
- **Rate Limiting**: (Can add) Prevent spam/abuse
- **IP Blocking**: Can ban specific participants

### Audit Trail
- **Message Timestamps**: All messages have creation date
- **User Actions**: Join/leave events logged
- **State Changes**: Turn progression recorded
- **Results Stored**: Final debate outcomes persisted

---

## Common Use Cases

### 1. **Classroom Debate**
- Teacher creates room
- Two student teams debate topic
- Teacher moderates and grades
- Transcript used for assessment

### 2. **Competitive Debate Tournament**
- Organizer schedules multiple debates
- Official moderators oversee
- Automated scoring and winner determination
- Results published to leaderboard

### 3. **Public Forum**
- Anyone can join as spectator
- Multiple debates running simultaneously
- Live audience participation (chat)
- Results visible to all

### 4. **Team Decision Making**
- Internal debate on company decision
- FOR/AGAINST teams present options
- Leadership votes after debate
- Records decision rationale

---

## Performance Considerations

### Scalability
- **LiveKit**: Handles up to 100s of participants
- **Redis**: Caches frequent queries
- **Database**: Indexed queries for fast retrieval
- **Socket.io**: Rooms isolate traffic by debate

### Optimization
- **Message History**: Paginate old messages
- **Video Quality**: Adaptive bitrate based on bandwidth
- **State Caching**: Redis reduces database hits
- **Lazy Loading**: Load participants on demand

### Limitations
- **Max Participants**: 6 (configurable) in debate area
- **Max Messages**: No hard limit, but paginate in UI
- **Video Grid**: 4+ participants use 2-column grid
- **Bandwidth**: 1-2 Mbps per video stream

---

## Troubleshooting

### Common Issues

**No Video Feed**
- Check camera permissions in browser
- Verify LiveKit connectivity
- Check network/bandwidth
- Try refreshing page

**Chat Not Appearing**
- Verify authentication token valid
- Check Socket.io connection
- Ensure proper role/team assignment
- Check browser console for errors

**Audio Issues**
- Check microphone permissions
- Verify not muted in OS settings
- Check browser volume settings
- Restart audio devices

**Buzzer Not Working**
- Ensure debate is in LIVE status
- Check if already in queue
- Verify your team membership
- Restart Socket.io connection

**Turn Not Advancing**
- Verify you're moderator/host
- Check debate status (should be LIVE)
- Ensure at least 2 teams with members
- Check server logs for errors

---

## Future Enhancements

### Planned Features
- [ ] Debate pausing and resuming
- [ ] Time extension requests
- [ ] Reaction emojis on messages
- [ ] Message editing/deletion
- [ ] @mentions for moderators
- [ ] Debate scheduling with calendar
- [ ] Audience polling during debate
- [ ] AI-powered debate summary
- [ ] Evidence document sharing
- [ ] Replay and highlights
- [ ] Team chat history archiving
- [ ] Multi-language support
- [ ] Debate templates by topic
- [ ] Custom scoring rules
- [ ] Analytics dashboard for hosts

### Performance Improvements
- [ ] Message pagination
- [ ] Video lazy loading
- [ ] WebRTC stats monitoring
- [ ] Automatic quality adjustment
- [ ] Connection retry logic

---

## Related Documentation

- [Chat System Details](./DEBATE_CHAT_SYSTEM.md)
- [LiveKit Integration](./LIVEKIT_SETUP.md)
- [Database Schema](../backend/prisma/schema.prisma)
- [API Documentation](../docs/02-backend/04-api/)
- [Deployment Guide](./05-deployment/3-deployment-commands.md)

---

## Support & Contact

For issues, feature requests, or questions:
1. Check this documentation
2. Review error logs in backend/frontend
3. Check Socket.io console for connection issues
4. Contact development team with error details and reproduction steps
