# Push Notifications Implementation Guide

## Overview

Complete push notification system with both **background browser notifications** (when tab is closed/unfocused) and **in-app toast popups** (when app is open).

## Features Implemented

### 1. **Service Worker (`public/sw.js`)**
- ✅ Handles incoming push notifications from backend
- ✅ Shows browser notifications when tab is unfocused/closed
- ✅ Posts messages to active tabs for in-app toasts
- ✅ Handles notification clicks with smart navigation
- ✅ Enhanced logging with emojis for debugging

### 2. **NotificationToast Component**
- ✅ Beautiful animated toast popups
- ✅ Auto-dismisses after 8 seconds
- ✅ Progress bar showing time remaining
- ✅ View and Dismiss action buttons
- ✅ Click to navigate to relevant page
- ✅ Smart icons based on notification type:
  - 🔵 Blue for session requests
  - 🟢 Green for study room joins
  - 🟠 Orange for reminders
  - 🟡 Yellow for review requests
  - 🔴 Red for cancellations

### 3. **PushNotificationListener Component**
- ✅ Listens for messages from service worker
- ✅ Displays toast notifications when push received
- ✅ Plays notification sound using Web Audio API
- ✅ Auto-refreshes notification dropdown
- ✅ Shows browser notification if tab is hidden
- ✅ Queues multiple notifications

### 4. **Enhanced NotificationContext**
- ✅ Real-time notification updates
- ✅ `addNotification()` method for instant UI updates
- ✅ Automatic unread count updates
- ✅ Prevents duplicate notifications

### 5. **Updated Layout**
- ✅ `PushNotificationListener` mounted globally
- ✅ Positioned in top-right corner (z-index 100)
- ✅ Doesn't interfere with other UI elements

## How It Works

### Flow Diagram

```
Backend Creates Notification
         ↓
Backend Sends Web Push
         ↓
Service Worker Receives Push
         ↓
    ┌────┴────┐
    ↓         ↓
Tab Open?  Tab Closed?
    ↓         ↓
In-App    Browser
Toast     Notification
    ↓         ↓
User Clicks → Navigate to Relevant Page
    ↓
Notification Context Refreshes
    ↓
Dropdown Shows New Notification
```

### User Experience

#### When App is Open (Tab Focused)
1. **Push arrives** → Service worker receives it
2. **Message sent** → Posts to active tab
3. **Toast appears** → Top-right corner, animated slide-in
4. **Sound plays** → Soft beep using Web Audio API
5. **Dropdown updates** → Red badge shows unread count
6. **Auto-dismiss** → Toast fades out after 8 seconds

#### When App is Closed/Unfocused
1. **Push arrives** → Service worker receives it
2. **Browser notification** → System notification appears
3. **User clicks** → Opens/focuses app tab
4. **Navigates** → Goes to relevant page automatically

## Notification Types & Navigation

| Action Type | Destination |
|------------|-------------|
| `SESSION_REQUEST` | `/sessions/{id}` |
| `SESSION_ACCEPTED` | `/sessions/{id}` |
| `SESSION_CANCELLED` | `/sessions/{id}` |
| `STUDYROOM_JOINED` | `/studyroom/{id}` |
| `SESSION_REMINDER_*` | `/sessions/{id}` or `/studyroom/{id}` |
| `SESSION_COMPLETE_REVIEW` | `/submit-review/{id}?type=peerSession` |
| `STUDYROOM_ENDED_REVIEW` | `/submit-review/{id}?type=studyRoom` |
| `REVIEW_RECEIVED` | `/profile?tab=reviews` |
| `PAYMENT_RELEASED` | `/profile?tab=earnings` |

## Testing Instructions

### Step 1: Enable Notifications
1. Open the app in your browser
2. Look for the "Enable Push Notifications" prompt
3. Click "Enable" and grant permission

### Step 2: Trigger Test Notifications

#### Option A: Via Backend API (Recommended)
```bash
# Send test notification
curl -X POST http://localhost:3000/api/notifications/test \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Notification",
    "body": "Someone joined your study room!",
    "actionType": "STUDYROOM_JOINED",
    "studyRoomId": "test-room-id"
  }'
```

#### Option B: Create Real Events
1. **Session Request**: Have another user request a peer session with you
2. **Study Room Join**: Have someone join your study room
3. **Session Reminder**: Wait for scheduled reminders (24h, 1h, 5min before session)

### Step 3: Verify Functionality

#### In-App Toast (Tab Open)
- [ ] Toast appears in top-right corner
- [ ] Shows correct icon based on type
- [ ] Plays notification sound
- [ ] Progress bar animates
- [ ] "View" button navigates correctly
- [ ] "Dismiss" button removes toast
- [ ] Auto-dismisses after 8 seconds
- [ ] Dropdown badge updates

#### Browser Notification (Tab Closed)
- [ ] System notification appears
- [ ] Shows app icon and message
- [ ] Clicking opens app and navigates
- [ ] Multiple notifications stack properly

#### Notification Dropdown
- [ ] Red badge shows unread count
- [ ] New notification appears at top
- [ ] Clicking marks as read
- [ ] "View All" link works

## Debugging

### Enable Verbose Logs
Service worker logs are already enabled with emoji tags:
- 🔔 Push notification received
- 📨 Push data
- 📤 Sending to clients
- 🖱️ Notification clicked
- 🔍 Finding open clients
- ✅ Focus and navigate
- 🆕 Opening new window

### Check Service Worker Status
```javascript
// In browser console
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('Service Worker:', reg);
  console.log('Active:', reg.active);
  console.log('Waiting:', reg.waiting);
});
```

### Check Push Subscription
```javascript
// In browser console
navigator.serviceWorker.ready.then(reg => {
  reg.pushManager.getSubscription().then(sub => {
    console.log('Subscription:', sub);
    console.log('Endpoint:', sub?.endpoint);
  });
});
```

### Manual Test Message
```javascript
// In browser console - simulate service worker message
window.postMessage({
  type: 'PUSH_NOTIFICATION',
  notification: {
    title: 'Test Toast',
    body: 'This is a test notification',
    data: {
      actionType: 'SESSION_REQUEST',
      peerSessionId: 'test-123'
    }
  }
}, '*');
```

## Common Issues & Solutions

### Issue: No Toast Appearing
**Cause**: Service worker not active or message listener not registered
**Solution**: 
1. Check browser console for errors
2. Verify service worker is active: `chrome://serviceworker-internals/`
3. Force reload (Ctrl+Shift+R) to re-register service worker

### Issue: Sound Not Playing
**Cause**: Browser autoplay policy or audio context suspended
**Solution**:
1. User must interact with page first (click anywhere)
2. Check browser console for audio errors
3. Try in different browser (Chrome/Edge work best)

### Issue: Browser Notification Not Showing
**Cause**: Permission denied or notification settings
**Solution**:
1. Check permission: `Notification.permission` should be "granted"
2. Check browser settings: Allow notifications for your domain
3. On Windows: Check system notification settings

### Issue: Multiple Toasts Stacking Weirdly
**Cause**: CSS z-index or positioning conflicts
**Solution**: 
1. Verify `pointer-events-none` on container
2. Check for z-index conflicts with other components
3. Toast container uses z-index 100 (should be highest)

### Issue: Notification Not Navigating Correctly
**Cause**: Missing or incorrect actionType/IDs
**Solution**:
1. Check backend is sending correct `data` object
2. Verify `peerSessionId` or `studyRoomId` is present
3. Check service worker logs for URL being opened

## Performance Notes

- **Toast Queue**: Unlimited but auto-dismisses after 8s each
- **Sound**: Uses Web Audio API (lightweight, no file needed)
- **Memory**: Cleans up dismissed toasts immediately
- **Network**: Only fetches notifications when push received (no polling)
- **Service Worker**: Minimal overhead, event-driven only

## Browser Compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| Service Worker | ✅ | ✅ | ✅ | ✅ |
| Push API | ✅ | ✅ | ✅ | ✅ |
| Web Audio | ✅ | ✅ | ✅ | ✅ |
| Notifications | ✅ | ✅ | ⚠️ (limited) | ✅ |

**Note**: Safari on iOS does not fully support Web Push Notifications (requires iOS 16.4+)

## Production Checklist

- [ ] VAPID keys configured in backend env
- [ ] Service worker registered at `/sw.js`
- [ ] SSL certificate (HTTPS required for push)
- [ ] Icons created: `/icon-192x192.png`, `/badge-72x72.png`
- [ ] Notification permission prompt shown after onboarding
- [ ] Backend sends pushes via web-push library
- [ ] Error handling for failed pushes
- [ ] Notification cleanup job (delete old notifications)
- [ ] Analytics tracking for notification clicks
- [ ] A/B test different notification messages

## Next Steps (Optional Enhancements)

1. **Notification Preferences**: Let users choose which notifications to receive
2. **Do Not Disturb**: Quiet hours setting (no sound/toast)
3. **Notification History**: View past 30 days of notifications
4. **Rich Notifications**: Add images, action buttons to browser notifications
5. **Notification Sounds**: Upload custom sound or choose from library
6. **Desktop App**: Electron wrapper for better native notifications
7. **Mobile App**: React Native with FCM for iOS/Android

## Support

For issues or questions:
1. Check browser console logs
2. Review service worker logs
3. Test with curl command first
4. Verify backend is sending correct payload
5. Check GitHub issues for similar problems
