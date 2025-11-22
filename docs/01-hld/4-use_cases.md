# Use Cases

## Use Case 1: User Signs Up and Books a Session

### Actors
- **Primary**: New User (Learner)
- **Secondary**: Existing User (Teacher), System

### Preconditions
- User has access to the internet and a web browser
- User has a valid email address
- Teacher has an active account with skills listed

### Main Flow Steps

1. User navigates to the platform landing page
2. User clicks "Sign Up" and is redirected to Clerk authentication
3. User completes registration (email/password or OAuth)
4. System creates user account with 100 starting coins
5. User completes onboarding flow:
   - Adds profile information (name, bio, avatar)
   - Adds skills they HAVE (can teach)
   - Adds skills they WANT (want to learn)
6. User browses peers using the browse page
7. User filters peers by desired skill (e.g., "React")
8. User views a peer's profile showing their skills, rating, and bio
9. User clicks "Request Session"
10. User fills out session request form:
    - Topic/title
    - Description
    - Date and time
    - Duration
    - Skills to cover
11. User submits session request
12. System validates:
    - User has sufficient coins
    - Session date is in the future
    - Required fields are provided
13. System creates peer session with PENDING status
14. System creates payment record with ESCROW status
15. System deducts coins from user's balance
16. System sends notification to teacher about new request
17. Teacher receives notification and views request
18. Teacher accepts the session request
19. System updates session status to UPCOMING
20. System sends confirmation notification to learner
21. Both users receive session reminder notifications (24h, 1h, 5m before)
22. On session date, users join LiveKit room using provided link
23. Session takes place
24. After session, either user marks session as DONE
25. System releases payment to teacher
26. System sends review reminder notifications to both users

### Alternate Flows

**3a. User already has account**
- User clicks "Sign In" instead
- User enters credentials
- Flow continues from step 6

**12a. Insufficient coins**
- System displays error: "Insufficient coins. You need X coins for this session."
- User can either add coins (future feature) or cancel request
- Flow ends

**18a. Teacher declines request**
- System updates session status to CANCELLED
- System refunds coins to learner
- System sends notification to learner about decline
- Flow ends

**24a. Session cancelled before completion**
- User or teacher cancels session
- System updates session status to CANCELLED
- System refunds coins to learner
- System sends cancellation notification
- Flow ends

### Postconditions
- User account created and onboarded
- Session request sent and accepted
- Payment held in escrow
- Notifications sent to both parties
- Session scheduled for future date

---

## Use Case 2: Mentor Creates a Study Room

### Actors
- **Primary**: User (Mentor/Teacher)
- **Secondary**: Potential Participants, System

### Preconditions
- User has an active account
- User has completed onboarding
- User has at least one skill they can teach

### Main Flow Steps

1. User navigates to dashboard or browse page
2. User clicks "Create Study Room"
3. User fills out study room form:
   - Title
   - Description
   - Date and time
   - Duration (in minutes)
   - Maximum participants
   - Joining fee (in coins)
   - Skills to cover (multiple selection)
4. User submits the form
5. System validates:
   - All required fields provided
   - Date is in the future
   - Joining fee is non-negative
   - Maximum participants > 0
6. System creates study room with UPCOMING status
7. System sets creator as first participant
8. System creates notification for potential participants (optional: based on skills)
9. Study room appears in browse results
10. Other users discover the study room via browse/search
11. Users view study room details
12. Users click "Join Study Room"
13. System validates:
    - Room has available capacity
    - User has sufficient coins for joining fee
    - User is not already a participant
14. System deducts joining fee from user's balance
15. System adds user as participant
16. System creates payment record
17. System sends confirmation notification to user
18. System sends notification to room creator about new participant
19. As room fills up, system tracks participant count
20. When room reaches capacity, system marks room as full (optional status)
21. Before session date, users receive reminder notifications
22. On session date, creator shares Google Meet link (or LiveKit room)
23. Participants join the session
24. Session takes place
25. After session, creator marks room as DONE
26. System sends review reminder notifications to participants

### Alternate Flows

**13a. Room is full**
- System displays error: "This study room is full."
- User cannot join
- Flow ends

**13b. Insufficient coins**
- System displays error: "Insufficient coins. You need X coins to join."
- User cannot join
- Flow ends

**13c. User already joined**
- System displays error: "You are already a participant."
- Flow ends

**20a. Room cancelled**
- Creator cancels the room before session date
- System updates room status to CANCELLED
- System refunds joining fees to all participants
- System sends cancellation notifications
- Flow ends

### Postconditions
- Study room created and visible in browse
- Participants can join (up to capacity)
- Payments processed for joining fees
- Notifications sent to relevant users
- Session scheduled for future date

---

## Use Case 3: User Joins Live Call

### Actors
- **Primary**: User (Participant)
- **Secondary**: Other Participants, System, LiveKit Service

### Preconditions
- User has an accepted peer session or joined study room
- Session/room status is UPCOMING or ONGOING
- Session date/time has arrived or is approaching
- LiveKit room has been created (or Google Meet link provided)

### Main Flow Steps

1. User receives session reminder notification (5 minutes before)
2. User navigates to session details page or dashboard
3. User views session information:
   - Other participant(s) name(s)
   - Session topic
   - Date and time
   - Duration
   - Skills to cover
   - Meeting link (LiveKit or Google Meet)
4. User clicks "Join Session" or meeting link
5. If LiveKit:
   - Frontend requests LiveKit token from backend
   - Backend generates LiveKit token with user permissions
   - Frontend initializes LiveKit client with token
   - User's browser requests camera/microphone permissions
   - User grants permissions
   - User joins LiveKit room
6. If Google Meet:
   - User is redirected to Google Meet
   - User joins Google Meet call
7. User sees other participants in the call
8. User can:
   - Enable/disable camera
   - Enable/disable microphone
   - Share screen (if supported)
   - Send text messages in chat
   - View participant list
9. Session takes place (video/audio communication)
10. Users interact, share knowledge, ask questions
11. After session completion, users leave the call
12. User marks session as DONE (or system auto-marks after duration)
13. System updates session status to DONE
14. If peer session, system releases payment to teacher
15. System sends review reminder notifications

### Alternate Flows

**5a. Camera/microphone permission denied**
- Browser blocks access
- User can still join with audio/video disabled
- User can enable later from browser settings
- Flow continues

**5b. LiveKit token generation fails**
- System displays error: "Unable to join session. Please try again."
- User can retry or use alternative method (Google Meet)
- Flow continues with alternate method

**7a. Other participant hasn't joined yet**
- User waits in the room
- System shows "Waiting for other participants"
- When other participant joins, session begins
- Flow continues

**11a. User leaves early**
- User can leave the call at any time
- Other participants continue
- Session status remains ONGOING until all leave or time expires
- Flow continues

**12a. Session timeout**
- System automatically marks session as DONE after duration expires
- Users are notified session has ended
- Flow continues to step 13

### Postconditions
- Users successfully joined the call
- Session communication established
- Session completed
- Payment released (if applicable)
- Review reminders sent

---

## Use Case 4: User Writes a Review

### Actors
- **Primary**: User (Reviewer)
- **Secondary**: Reviewed User (Reviewee), System

### Preconditions
- User has completed a session (status is DONE)
- User has not already reviewed this session
- User is not reviewing their own session

### Main Flow Steps

1. User receives review reminder notification
2. User navigates to "Submit Review" page or dashboard
3. User views session details:
   - Session type (peer session or study room)
   - Other participant(s)
   - Session topic
   - Date completed
4. User selects rating (1-5 stars)
5. User writes optional text review
6. User submits the review
7. System validates:
   - Rating is between 1-5
   - User has not already reviewed this session
   - Session status is DONE
   - User participated in the session
8. System creates review record
9. System updates reviewee's average rating
10. System updates reviewee's review count
11. System marks review reminder as sent (prevents duplicate reminders)
12. System sends notification to reviewee about new review
13. Review appears on reviewee's profile
14. Review appears in session details

### Alternate Flows

**7a. User already reviewed**
- System displays error: "You have already reviewed this session."
- User cannot submit another review
- Flow ends

**7b. Session not completed**
- System displays error: "You can only review completed sessions."
- User cannot submit review
- Flow ends

**7c. Invalid rating**
- System displays validation error
- User corrects and resubmits
- Flow continues

### Postconditions
- Review created and saved
- Reviewee's rating updated
- Review visible on profile and session
- Notification sent to reviewee

---

## Use Case 5: User Manages Notifications

### Actors
- **Primary**: User
- **Secondary**: System

### Preconditions
- User has an active account
- User has received notifications

### Main Flow Steps

1. User navigates to dashboard or notifications page
2. User views list of notifications:
   - Unread notifications highlighted
   - Notification type (URGENT, NORMAL)
   - Notification message
   - Timestamp
   - Action buttons (if applicable)
3. User clicks on a notification
4. System marks notification as read
5. System redirects user to relevant page (if action available)
6. User can mark individual notifications as read
7. User can mark all notifications as read
8. User can filter notifications by type
9. User can view notification history with pagination

### Alternate Flows

**3a. Notification has no action**
- User views notification details
- No redirect occurs
- Flow continues

**6a. Bulk mark as read**
- User clicks "Mark All as Read"
- System marks all user's notifications as read
- Unread count resets to 0
- Flow continues

### Postconditions
- Notifications displayed to user
- Read status updated
- User can take actions based on notifications

