# 🧪 Debate Room Testing Guide

## Prerequisites

### 1. Environment Setup

Before testing, ensure all services are running:

```bash
# Terminal 1: Start PostgreSQL (if not using Docker)
# Ensure PostgreSQL is running on port 5432

# Terminal 2: Start Redis (if not using Docker)
# Ensure Redis is running on port 6379

# Terminal 3: Start Backend
cd backend
pnpm install  # If not already installed
pnpm start:dev
# Expected: Server running on http://localhost:3001

# Terminal 4: Start Frontend
cd my-app
pnpm install  # If not already installed
pnpm dev
# Expected: Frontend running on http://localhost:3000
```

### 2. Required Environment Variables

**Backend (.env):**
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `LIVEKIT_API_KEY` - LiveKit API key
- `LIVEKIT_API_SECRET` - LiveKit API secret
- `LIVEKIT_URL` - LiveKit server URL (e.g., `wss://your-livekit-server.com`)
- `CLERK_SECRET_KEY` - Clerk authentication secret

**Frontend (.env.local):**
- `NEXT_PUBLIC_API_URL` - Backend API URL (e.g., `http://localhost:3001`)
- `NEXT_PUBLIC_LIVEKIT_URL` - LiveKit WebSocket URL
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk publishable key

### 3. Test Accounts Setup

You'll need **multiple user accounts** to test different roles:
- **Host Account** (1 user)
- **Moderator Account** (1-2 users, optional)
- **Team FOR Members** (2-3 users)
- **Team AGAINST Members** (2-3 users)
- **Spectator Account** (1 user, optional)

**Tip:** Use different browsers or incognito windows for each account:
- Chrome (Host)
- Chrome Incognito (Moderator)
- Firefox (Team FOR Member 1)
- Firefox Private (Team FOR Member 2)
- Edge (Team AGAINST Member 1)
- Edge InPrivate (Team AGAINST Member 2)
- Safari (Spectator, optional)

---

## Step-by-Step Testing Instructions

### Phase 1: Create a Debate Room

#### Step 1.1: Login as Host
1. Open browser (Chrome recommended)
2. Navigate to `http://localhost:3000`
3. Sign in with your **Host account** (via Clerk)
4. Navigate to `/debate-rooms` page

#### Step 1.2: Create New Debate Room
1. Click **"+ Create Debate Room"** button
2. Fill in the form:
   - **Topic**: `"AI will replace most jobs in 10 years"`
   - **Description**: `"Debate about the future of employment and AI automation"`
   - **Max Participants**: `6` (default)
   - **Turn Duration**: `120` seconds (2 minutes)
   - **Prep Time**: `30` seconds
   - **Turn Order**: `FIFO` (First In, First Out)
   - **Schedule** (optional): Leave empty for immediate start
3. Click **"Create Debate Room"**
4. **Expected Result**: 
   - Success toast notification
   - Redirected to debate room page (`/debate-rooms/[roomId]`)
   - Room status shows "WAITING"
   - You are listed as **Host** 👑

#### Step 1.3: Verify Room Details
Check that the room displays:
- ✅ Topic and description
- ✅ Your name as Host with crown icon
- ✅ Status badge: "WAITING"
- ✅ "Start Prep Phase" button (only visible to host)
- ✅ Teams section showing FOR and AGAINST (empty initially)

---

### Phase 2: Join Participants

#### Step 2.1: Join as Team FOR Member 1
1. Open **Firefox** (or different browser)
2. Navigate to `http://localhost:3000`
3. Sign in with **Team FOR Member 1** account
4. Navigate to `/debate-rooms` page
5. Find your created debate room
6. Click **"Join Debate"** button
7. Select **"FOR"** side
8. Click **"Join Team FOR"**
9. **Expected Result**:
   - Success notification
   - Redirected to debate room page
   - You appear in **Team FOR** section
   - Status shows "WAITING"
   - No "Start Prep Phase" button (not host)

#### Step 2.2: Join as Team FOR Member 2
1. Open **Firefox Private** (or different browser)
2. Repeat Step 2.1 with **Team FOR Member 2** account
3. **Expected Result**: Two members in Team FOR

#### Step 2.3: Join as Team AGAINST Member 1
1. Open **Edge** (or different browser)
2. Sign in with **Team AGAINST Member 1** account
3. Navigate to debate room
4. Click **"Join Debate"**
5. Select **"AGAINST"** side
6. **Expected Result**: Member appears in Team AGAINST section

#### Step 2.4: Join as Team AGAINST Member 2
1. Open **Edge InPrivate** (or different browser)
2. Repeat with **Team AGAINST Member 2** account
3. **Expected Result**: Two members in each team

#### Step 2.5: Verify Team Distribution
**In Host's browser**, verify:
- ✅ Team FOR: 2 members
- ✅ Team AGAINST: 2 members
- ✅ All participants visible in Teams section
- ✅ Real-time updates (participants appear without refresh)

---

### Phase 3: Test Prep Phase

#### Step 3.1: Start Prep Phase (Host Only)
1. **In Host's browser**, click **"Start Prep Phase"** button
2. **Expected Result**:
   - Button changes to "Prep Phase Active"
   - Countdown timer appears showing 30 seconds
   - Status changes to "PREP"
   - All participants see the countdown

#### Step 3.2: Verify Prep Phase in All Browsers
**Check in each participant's browser:**
- ✅ Blue "Prep Phase" badge visible
- ✅ Countdown timer showing time remaining
- ✅ Timer decreases every second
- ✅ Chat sidebar available (can be opened)
- ✅ Teams sidebar shows all participants

#### Step 3.3: Test Chat During Prep Phase
1. **In Team FOR Member 1's browser**:
   - Open chat sidebar (click chat icon)
   - Send message: `"Let's focus on automation benefits"`
   - **Expected**: Message appears with 🟢 Team FOR badge
2. **In Team AGAINST Member 1's browser**:
   - Open chat sidebar
   - **Expected**: Cannot see Team FOR's message
   - Send message: `"We need to discuss job displacement"`
   - **Expected**: Message appears with 🔴 Team AGAINST badge
3. **In Host's browser**:
   - Open chat sidebar
   - **Expected**: Can see messages from BOTH teams
   - Send broadcast: `"Prep time ending soon!"`
   - Check "🔒 Send to moderators only" checkbox
   - Send: `"Private moderator note"`
   - **Expected**: Broadcast visible to all, private note only to moderators

#### Step 3.4: Wait for Prep Phase to End
- Let countdown reach 0:00
- **Expected Result**: 
  - Timer stops
  - Status may change (depending on implementation)
  - Host can start debate manually

---

### Phase 4: Test Live Debate Phase

#### Step 4.1: Start Live Debate (Host Only)
1. **In Host's browser**, click **"Start Debate"** button (or wait for auto-start)
2. **Expected Result**:
   - Status changes to "LIVE"
   - Red "🔴 LIVE" badge appears
   - Video/audio room connects (LiveKit)
   - All participants join video call
   - Turn timer appears

#### Step 4.2: Verify Video/Audio Connection
**In each participant's browser:**
- ✅ Video grid shows all participants
- ✅ Your own video feed visible
- ✅ Other participants' videos visible
- ✅ Audio working (can hear others)
- ✅ Camera/mic controls available
- ✅ Can toggle camera on/off
- ✅ Can toggle microphone on/off

#### Step 4.3: Test View Modes
1. **In any browser**, look for view toggle buttons:
   - **Grid View** (default): Shows all participants
   - **Presenter View**: Shows only active speaker
2. Toggle between views
3. **Expected**: View changes smoothly, layout adjusts

#### Step 4.4: Test Turn-Based Speaking System

**Turn 1 - Team FOR Member 1:**
1. **In Host's browser**: Verify first speaker is highlighted
2. **In Team FOR Member 1's browser**:
   - Verify "Speaking" badge appears
   - Yellow border around your video tile
   - Turn timer shows 120 seconds
   - Speak into microphone
   - **Expected**: Others can hear you
3. **In other browsers**: Verify speaker is highlighted

**Turn 2 - Team AGAINST Member 1:**
1. Wait for timer to reach 0:00 OR
2. **In Host's browser**: Click **"Next Turn"** button
3. **Expected Result**:
   - Turn automatically switches to Team AGAINST
   - Team AGAINST Member 1 highlighted
   - Timer resets to 120 seconds
   - Previous speaker muted (if auto-mute enabled)

**Continue testing turns:**
- Verify turns alternate between teams
- Verify timer counts down correctly
- Verify "Next Turn" button works
- Verify auto-advance when timer expires

---

### Phase 5: Test Buzzer System

#### Step 5.1: Press Buzzer (Team Members)
1. **In Team FOR Member 2's browser**:
   - Look for **⚡ Zap** (buzzer) button
   - Click buzzer button
   - **Expected Result**:
     - Button shows "1st in queue" or similar
     - Button disabled (cannot press again)
     - Ripple animation on press

#### Step 5.2: Verify Buzzer Queue
**In Host/Moderator's browser:**
- ✅ Buzzer queue visible in sidebar
- ✅ Shows Team FOR Member 2 as "1st"
- ✅ Queue updates in real-time

#### Step 5.3: Multiple Buzzer Presses
1. **In Team AGAINST Member 2's browser**: Press buzzer
2. **Expected**: Shows "1st" (for their team) or "2nd" (if cross-team queue)
3. **In Team FOR Member 1's browser**: Press buzzer
4. **Expected**: Added to queue

#### Step 5.4: Verify Buzzer Queue Management
**In Host's browser:**
- ✅ Can see full buzzer queue
- ✅ Can manually assign next speaker from queue
- ✅ Queue updates when turns advance

---

### Phase 6: Test Chat System During Live Debate

#### Step 6.1: Team-Specific Chat
1. **In Team FOR Member 1's browser**:
   - Open chat sidebar
   - Send: `"Remember to mention retraining programs"`
   - **Expected**: 
     - Message appears with 🟢 Team FOR badge
     - Only Team FOR members and moderators see it
2. **In Team AGAINST Member 1's browser**:
   - Open chat sidebar
   - **Expected**: Cannot see Team FOR's message
   - Send: `"Focus on economic disruption"`
   - **Expected**: Message with 🔴 Team AGAINST badge

#### Step 6.2: Moderator Broadcast
1. **In Host's browser**:
   - Open chat sidebar
   - Send: `"5 minutes remaining"`
   - **Expected**: 
     - Message appears with 📢 Broadcast badge
     - ALL participants see it
2. **In all participant browsers**: Verify broadcast message visible

#### Step 6.3: Moderator-Only Chat
1. **In Host's browser**:
   - Open chat sidebar
   - Check **"🔒 Send to moderators only"** checkbox
   - Send: `"Let's wrap up soon"`
   - **Expected**: 
     - Message appears with 🔒 badge
     - Only moderators see it
2. **In Team Member browsers**: Verify they CANNOT see moderator-only message

#### Step 6.4: Clear Chat History (Moderator Only)
1. **In Host's browser**:
   - Look for "Clear Chat" button (in chat sidebar)
   - Click "Clear Chat"
   - Confirm action
   - **Expected**:
     - All messages deleted
     - Broadcast notification sent to all participants
     - Chat history cleared for everyone

---

### Phase 7: Test Moderator Controls

#### Step 7.1: Mute/Unmute Participants
1. **In Host's browser**:
   - Find participant controls (may be in sidebar or participant list)
   - Click mute button next to a participant
   - **Expected**: Participant's microphone muted
2. **In muted participant's browser**: Verify microphone is muted
3. **In Host's browser**: Click unmute
   - **Expected**: Participant can speak again

#### Step 7.2: Promote to Moderator
1. **In Host's browser**:
   - Find "Promote to Moderator" option for a participant
   - Click promote
   - **Expected**: 
     - Participant gains moderator privileges
     - Shield icon appears next to their name
     - They can see all team messages
2. **In promoted user's browser**: Verify moderator controls available

#### Step 7.3: Kick Participant (Optional)
1. **In Host's browser**:
   - Find "Kick" or "Remove" option
   - Click kick for a participant
   - **Expected**: 
     - Participant removed from debate
     - Notification sent to kicked user
     - They can rejoin (if not banned)

#### Step 7.4: Ban Participant (Optional)
1. **In Host's browser**:
   - Find "Ban" option
   - Click ban for a participant
   - **Expected**: 
     - Participant permanently blocked
     - Cannot rejoin debate
     - Notification sent

---

### Phase 8: Test Turn Management

#### Step 8.1: Manual Turn Advancement
1. **In Host's browser**:
   - Wait for current speaker to finish OR
   - Click **"Next Turn"** button
   - **Expected**:
     - Turn advances to next speaker
     - Timer resets
     - New speaker highlighted
     - Previous speaker muted (if auto-mute enabled)

#### Step 8.2: Auto-Advance on Timer Expiry
1. Let timer countdown reach 0:00
2. **Expected**:
   - Turn automatically advances
   - Next speaker gets microphone token
   - Timer resets
   - All participants see turn change

#### Step 8.3: Buzzer Interruption
1. **In current speaker's browser**:
   - Look for "Pass" or "Finish Early" button
   - Click button
   - **Expected**:
     - Turn immediately switches
     - Next speaker (from buzzer queue) gets turn
     - Time saved

---

### Phase 9: Test End Debate & Results

#### Step 9.1: End Debate (Host Only)
1. **In Host's browser**:
   - Click **"End Debate"** button
   - Confirm action
   - **Expected Result**:
     - Status changes to "ENDED"
     - Video room disconnected for all participants
     - All participants see "Debate Ended" message
     - Redirected to results page (or results shown)

#### Step 9.2: Generate Results (Host Only)
1. **In Host's browser**:
   - Look for **"Generate Results"** button
   - Click button
   - **Expected**:
     - Loading state shown
     - AI analysis runs (may take 30-60 seconds)
     - Results page appears

#### Step 9.3: Verify Results Display
**In all browsers**, verify results show:
- ✅ Winner team (FOR or AGAINST)
- ✅ Individual scores for each participant
- ✅ Team average scores
- ✅ Speaking time statistics
- ✅ Turn count statistics
- ✅ Buzzer activity
- ✅ Personalized feedback for each participant
- ✅ Strengths and weaknesses for each participant

#### Step 9.4: Verify Coin Rewards
1. **In winning team members' browsers**:
   - Check wallet/balance
   - **Expected**: 50 coins added to balance
2. **In losing team members' browsers**:
   - Check wallet/balance
   - **Expected**: No coins added (or consolation reward if implemented)

---

### Phase 10: Test Edge Cases & Error Handling

#### Step 10.1: Participant Leaves During Debate
1. **In Team FOR Member 1's browser**:
   - Click "Leave Debate" button
   - **Expected**:
     - Removed from video room
     - Removed from team list
     - Other participants notified
     - Turn order adjusts if they were next speaker

#### Step 10.2: Network Disconnection
1. **In any participant's browser**:
   - Disconnect internet (disable WiFi/Ethernet)
   - Wait 10 seconds
   - Reconnect internet
   - **Expected**:
     - Reconnection attempt shown
     - Rejoins debate room
     - State syncs with server
     - Video/audio reconnects

#### Step 10.3: Browser Refresh
1. **In any participant's browser**:
   - Refresh page (F5)
   - **Expected**:
     - Rejoins debate room
     - State restored from server
     - Video/audio reconnects
     - Chat history loaded

#### Step 10.4: Maximum Participants
1. Try to join as 7th participant (if max is 6)
2. **Expected**: Error message "Room is full" or similar

#### Step 10.5: Join After Debate Started
1. Create new account
2. Try to join debate that's already LIVE
3. **Expected**: 
   - Can join as spectator (read-only)
   - OR error message "Debate already started"
   - OR can join but with limited permissions

---

## Testing Checklist

### ✅ Core Features
- [ ] Create debate room
- [ ] Join as different team members
- [ ] Start prep phase
- [ ] Start live debate
- [ ] Video/audio connection works
- [ ] Turn-based speaking system
- [ ] Timer countdown
- [ ] Buzzer system
- [ ] Chat system (team-specific, broadcast, moderator-only)
- [ ] End debate
- [ ] Generate results
- [ ] View results
- [ ] Coin rewards distributed

### ✅ Moderator Controls
- [ ] Mute/unmute participants
- [ ] Promote to moderator
- [ ] Kick participant
- [ ] Ban participant
- [ ] Clear chat history
- [ ] Manual turn advancement
- [ ] View buzzer queue

### ✅ Real-Time Updates
- [ ] Participant join/leave notifications
- [ ] Turn changes broadcast
- [ ] Chat messages appear instantly
- [ ] Buzzer queue updates
- [ ] Timer sync across all browsers
- [ ] State changes propagate

### ✅ UI/UX
- [ ] Grid view works
- [ ] Presenter view works
- [ ] Sidebar toggle works
- [ ] Mobile responsive
- [ ] Loading states shown
- [ ] Error messages displayed
- [ ] Success notifications shown

### ✅ Security & Permissions
- [ ] Only host can start/end debate
- [ ] Only moderators see all messages
- [ ] Team members only see their team's messages
- [ ] Spectators have read-only access
- [ ] Authentication required for all actions

---

## Troubleshooting

### Issue: Video/Audio Not Working
**Solutions:**
1. Check browser permissions (camera/microphone)
2. Verify LiveKit server is running
3. Check network connection
4. Try refreshing page
5. Check browser console for errors

### Issue: Chat Messages Not Appearing
**Solutions:**
1. Verify Socket.io connection (check browser console)
2. Check authentication token
3. Verify user role/team assignment
4. Check server logs for errors
5. Try sending message again

### Issue: Turn Not Advancing
**Solutions:**
1. Verify you're moderator/host
2. Check debate status (should be LIVE)
3. Ensure at least 2 teams with members
4. Check server logs
5. Try manual "Next Turn" button

### Issue: Buzzer Not Working
**Solutions:**
1. Verify debate is LIVE status
2. Check if already in queue
3. Verify team membership
4. Check Socket.io connection
5. Refresh page

### Issue: Results Not Generating
**Solutions:**
1. Verify debate is ENDED
2. Check AI service is running
3. Verify transcript was captured
4. Check server logs for errors
5. Wait longer (may take 60+ seconds)

---

## Performance Testing

### Load Testing
1. **Test with maximum participants** (6+ users)
2. **Monitor**:
   - Video quality/bandwidth usage
   - Chat message delivery speed
   - Turn advancement latency
   - Socket.io connection stability

### Stress Testing
1. **Rapid actions**:
   - Send multiple chat messages quickly
   - Press buzzer multiple times
   - Advance turns rapidly
2. **Expected**: System handles gracefully

### Long-Running Debate
1. **Run debate for 30+ minutes**
2. **Monitor**:
   - Memory usage
   - Connection stability
   - State synchronization
   - Chat history performance

---

## Notes

- **Test in different browsers** to catch browser-specific issues
- **Use incognito/private windows** for multiple accounts
- **Monitor browser console** for errors
- **Check server logs** for backend issues
- **Test on mobile devices** for responsive design
- **Test with poor network** to verify reconnection logic

---

## Next Steps After Testing

1. **Document bugs** found during testing
2. **Create GitHub issues** for critical bugs
3. **Test fixes** after bug resolution
4. **Performance optimization** if needed
5. **User acceptance testing** with real users

---

**Last Updated**: Based on current implementation as of documentation review
**Version**: 1.0
