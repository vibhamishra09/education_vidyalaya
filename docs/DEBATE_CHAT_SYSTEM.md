# Debate Room Chat System

## Overview
The debate room chat system uses a database-backed approach with real-time Socket.io communication for persistent message history and role-based visibility control.

## Architecture

### Backend
- **Service**: `backend/src/debate-chat/debate-chat.service.ts`
  - `saveMessage()`: Saves messages to PostgreSQL with visibility rules
  - `getMessages()`: Retrieves filtered messages based on user role/team
  - `clearMessages()`: Moderators can clear chat history

- **Controller**: `backend/src/debate-chat/debate-chat.controller.ts`
  - `POST /debate-rooms/:roomId/messages`: Send a message
  - `GET /debate-rooms/:roomId/messages`: Get filtered messages
  - `DELETE /debate-rooms/:roomId/messages`: Clear history (moderators only)

- **Gateway**: `backend/src/debate-chat/debate-chat.gateway.ts`
  - Socket.io namespace: `/debate-chat`
  - Events:
    - `join-debate-room`: Join chat room
    - `leave-debate-room`: Leave chat room
    - `message-sent`: Broadcast new message
    - `messages-cleared`: Notify participants of cleared chat
    - `new-message`: Receive message (client listens)
    - `chat-cleared`: Chat cleared notification (client listens)

### Frontend
- **File**: `my-app/src/app/debate-rooms/[roomId]/debate-live-room.tsx`
- Socket.io connection to `/debate-chat` namespace
- Loads message history from API on mount
- Receives real-time messages via Socket.io
- Filters messages client-side as backup

### Database
- **Table**: `DebateChatMessage`
  - `id`: Unique message ID
  - `debateRoomId`: Foreign key to DebateRoom
  - `senderId`: Foreign key to User
  - `content`: Message text
  - `side`: FOR, AGAINST, or null
  - `visibility`: Message visibility enum
  - `createdAt`: Timestamp

- **Enum**: `MessageVisibility`
  - `ALL`: Everyone can see
  - `MODERATOR`: Broadcast from moderators to all
  - `MODERATOR_ONLY`: Private messages between moderators
  - `TEAM_FOR`: Team FOR + moderators only
  - `TEAM_AGAINST`: Team AGAINST + moderators only

## Message Visibility Rules

### Moderators (Host or Moderator)
- **Can See**: ALL messages (including private moderator messages)
- **Can Send**:
  - 📢 Broadcast to everyone (`MODERATOR`)
  - 🔒 Private to other moderators only (`MODERATOR_ONLY`)
- **Can Clear**: All chat history

### Team Members
- **Team FOR Can See**:
  - Messages with visibility: `ALL`, `MODERATOR`, `TEAM_FOR`
- **Team FOR Can Send**:
  - Messages to Team FOR + moderators (`TEAM_FOR`)

- **Team AGAINST Can See**:
  - Messages with visibility: `ALL`, `MODERATOR`, `TEAM_AGAINST`
- **Team AGAINST Can Send**:
  - Messages to Team AGAINST + moderators (`TEAM_AGAINST`)

### Spectators
- **Can See**: Messages with visibility `ALL` or `MODERATOR`
- **Can Send**: Messages to everyone (`ALL`)

## Features

### Moderator Controls
1. **Private Messaging**: Checkbox to send private messages to moderators only
2. **Clear History**: Button to delete all messages (with Socket.io broadcast)
3. **View All Teams**: Moderators see messages from both teams

### User Interface
- Message badges showing visibility:
  - 🔒 Moderators Only
  - 📢 Broadcast
  - 🟢 Team FOR
  - 🔴 Team AGAINST
- Color-coded sender names based on role/team
- Avatar display from user profiles
- Real-time message delivery
- Loading states for message history

### Security
- Server-side filtering in `getMessages()` service
- Client-side filtering as backup
- Authentication via ClerkAuthGuard
- Database constraints ensure data integrity

## Environment Variables

### Backend
```env
DATABASE_URL=postgresql://...
FRONTEND_URL=http://localhost:3000  # For CORS
```

### Frontend
```env
NEXT_PUBLIC_API_URL=http://localhost:4000  # Backend URL
```

## Usage

### Sending a Message
```typescript
// Regular message (team or broadcast based on role)
POST /debate-rooms/{roomId}/messages
{
  "content": "Hello everyone!",
  "userRole": "participant",
  "userSide": "FOR",
  "isModeratorOnly": false
}

// Moderator-only private message
POST /debate-rooms/{roomId}/messages
{
  "content": "Private note to moderators",
  "userRole": "moderator",
  "userSide": null,
  "isModeratorOnly": true
}
```

### Getting Messages
```
GET /debate-rooms/{roomId}/messages?userRole=participant&userSide=FOR
```

### Clearing Messages (Moderators Only)
```
DELETE /debate-rooms/{roomId}/messages
{
  "userRole": "moderator"
}
```

## Migration from localStorage

The previous implementation used:
- localStorage for persistence (24-hour retention)
- LiveKit data packets for real-time delivery
- Peer-to-peer history sync

The new implementation uses:
- PostgreSQL database (permanent storage)
- Socket.io for real-time delivery
- REST API for message history
- Server-side role-based filtering

## Benefits

1. **Permanent Storage**: Messages persist beyond 24 hours
2. **Server Validation**: All messages validated and filtered server-side
3. **Scalability**: Database queries handle large message volumes
4. **Security**: Role-based access control enforced in backend
5. **Audit Trail**: Complete message history with timestamps
6. **Moderator Tools**: Clear history and private messaging

## Testing

1. **As Team FOR Member**:
   - Send message → Only Team FOR + moderators see it
   - See Team FOR messages and moderator broadcasts

2. **As Team AGAINST Member**:
   - Send message → Only Team AGAINST + moderators see it
   - See Team AGAINST messages and moderator broadcasts

3. **As Moderator**:
   - See ALL team messages + private moderator messages
   - Send broadcast → Everyone sees it
   - Send private → Only moderators see it (checkbox)
   - Clear history → All participants notified

4. **As Spectator**:
   - Send message → Everyone sees it (`ALL`)
   - See only `ALL` and `MODERATOR` broadcast messages
