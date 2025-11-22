# Database Tables

## User

Core user profile and authentication data.

**Columns**:
- `id` (String, PK, CUID): Unique user identifier
- `name` (String, Required): User's full name
- `username` (String, Unique, Nullable): Unique username
- `email` (String, Unique, Required, Indexed): User's email address
- `avatar` (String, Nullable): Profile picture URL
- `bio` (String, Nullable): User biography
- `location` (String, Nullable): User location
- `school` (String, Nullable): User's school/institution
- `coins` (Decimal(36,16), Default: 0): Virtual currency balance
- `wallet` (String, Nullable): Hedera wallet address (future)
- `hourlyRate` (Decimal(36,16), Nullable): User's hourly rate
- `clerkId` (String, Unique, Required, Indexed): Clerk authentication ID
- `onboarded` (Boolean, Default: false): Onboarding completion status
- `createdAt` (DateTime, Default: now()): Account creation timestamp
- `updatedAt` (DateTime, Auto-update): Last update timestamp

**Relationships**:
- One-to-one: Metrics
- One-to-many: StudyRooms (createdBy)
- One-to-many: PeerSessions (requestedBy, requestedTo)
- One-to-many: Payments (madeBy, receivedBy)
- One-to-many: Reviews (reviewer, reviewee)
- One-to-many: Notifications
- One-to-many: UserSkills
- Many-to-many: StudyRoomParticipants
- Many-to-many: ChannelMembers
- One-to-many: Messages (sender)

**Indexes**:
- Primary key on `id`
- Unique index on `email`
- Unique index on `clerkId`
- Unique index on `username` (nullable)

---

## Skill

Master list of all skills available on the platform.

**Columns**:
- `id` (String, PK, CUID): Unique skill identifier
- `name` (String, Unique, Required): Skill name
- `description` (String, Nullable): Skill description

**Relationships**:
- One-to-many: UserSkills
- One-to-many: StudyRoomSkills
- One-to-many: PeerSessionSkills

**Indexes**:
- Primary key on `id`
- Unique index on `name`

---

## UserSkill

Junction table linking users to skills (HAS/WANTS).

**Columns**:
- `id` (String, PK, CUID): Unique identifier
- `type` (String, Required): "HAS" or "WANTS"
- `userId` (String, FK → User.id): User reference
- `skillId` (String, FK → Skill.id): Skill reference

**Relationships**:
- Many-to-one: User
- Many-to-one: Skill

**Indexes**:
- Primary key on `id`
- Unique composite index on `[userId, skillId, type]` (prevents duplicates)
- Foreign key indexes on `userId` and `skillId`

**Constraints**:
- Unique constraint: User cannot have same skill with same type twice

---

## StudyRoom

Group learning sessions.

**Columns**:
- `id` (String, PK, CUID): Unique room identifier
- `title` (String, Required): Room title
- `description` (String, Nullable): Room description
- `sessionStatus` (SessionStatus, Required): UPCOMING, ONGOING, DONE, CANCELLED
- `date` (DateTime, Required): Session date and time
- `duration` (Int, Required): Duration in minutes
- `maxParticipants` (Int, Required): Maximum participants
- `createdById` (String, FK → User.id, Required): Room creator
- `joiningFee` (Decimal(36,16), Default: 0): Cost to join in coins
- `reviewReminded` (Boolean, Default: false): Review reminder sent flag
- `reminder24hSent` (Boolean, Default: false): 24h reminder sent
- `reminder1hSent` (Boolean, Default: false): 1h reminder sent
- `reminder5mSent` (Boolean, Default: false): 5m reminder sent
- `gmeetLink` (String, Nullable): Google Meet link

**Relationships**:
- Many-to-one: User (createdBy)
- One-to-many: StudyRoomParticipants
- One-to-many: StudyRoomSkills
- One-to-many: Payments
- One-to-many: Reviews
- One-to-many: Notifications

**Indexes**:
- Primary key on `id`
- Foreign key index on `createdById`
- Index on `sessionStatus` (for filtering)
- Index on `date` (for date range queries)

**Constraints**:
- `maxParticipants` must be > 0
- `duration` must be > 0
- `joiningFee` must be >= 0

---

## StudyRoomParticipant

Junction table for study room participants.

**Columns**:
- `id` (String, PK, CUID): Unique identifier
- `userId` (String, FK → User.id, Required): Participant user
- `studyRoomId` (String, FK → StudyRoom.id, Required): Study room

**Relationships**:
- Many-to-one: User
- Many-to-one: StudyRoom

**Indexes**:
- Primary key on `id`
- Unique composite index on `[userId, studyRoomId]` (prevents duplicate joins)
- Foreign key indexes on `userId` and `studyRoomId`

**Constraints**:
- User cannot join same room twice

---

## StudyRoomSkill

Junction table linking study rooms to skills.

**Columns**:
- `id` (String, PK, CUID): Unique identifier
- `studyRoomId` (String, FK → StudyRoom.id, Required): Study room
- `skillId` (String, FK → Skill.id, Required): Skill

**Relationships**:
- Many-to-one: StudyRoom
- Many-to-one: Skill

**Indexes**:
- Primary key on `id`
- Unique composite index on `[studyRoomId, skillId]` (prevents duplicates)
- Foreign key indexes on `studyRoomId` and `skillId`

---

## PeerSession

One-on-one tutoring sessions.

**Columns**:
- `id` (String, PK, CUID): Unique session identifier
- `title` (String, Required): Session title
- `description` (String, Nullable): Session description
- `sessionStatus` (SessionStatus, Required): PENDING, UPCOMING, ONGOING, DONE, CANCELLED
- `date` (DateTime, Required): Session date and time
- `duration` (Int, Required): Duration in minutes
- `requestedById` (String, FK → User.id, Required): User requesting session
- `requestedToId` (String, FK → User.id, Required): User receiving request
- `reviewReminded` (Boolean, Default: false): Review reminder sent flag
- `reminder24hSent` (Boolean, Default: false): 24h reminder sent
- `reminder1hSent` (Boolean, Default: false): 1h reminder sent
- `reminder5mSent` (Boolean, Default: false): 5m reminder sent
- `gmeetLink` (String, Nullable): Google Meet link

**Relationships**:
- Many-to-one: User (requestedBy)
- Many-to-one: User (requestedTo)
- One-to-many: PeerSessionSkills
- One-to-many: Payments
- One-to-many: Reviews
- One-to-many: Notifications

**Indexes**:
- Primary key on `id`
- Foreign key indexes on `requestedById` and `requestedToId`
- Index on `sessionStatus` (for filtering)
- Index on `date` (for date range queries)
- Composite index on `[requestedById, sessionStatus]` (for user's sessions)
- Composite index on `[requestedToId, sessionStatus]` (for received sessions)

**Constraints**:
- `requestedById` cannot equal `requestedToId` (self-requests not allowed)
- `duration` must be > 0

---

## PeerSessionSkill

Junction table linking peer sessions to skills.

**Columns**:
- `id` (String, PK, CUID): Unique identifier
- `peerSessionId` (String, FK → PeerSession.id, Required): Peer session
- `skillId` (String, FK → Skill.id, Required): Skill

**Relationships**:
- Many-to-one: PeerSession
- Many-to-one: Skill

**Indexes**:
- Primary key on `id`
- Unique composite index on `[peerSessionId, skillId]` (prevents duplicates)
- Foreign key indexes on `peerSessionId` and `skillId`

---

## Payment

Transaction records with escrow system.

**Columns**:
- `id` (String, PK, CUID): Unique payment identifier
- `paymentStatus` (PaymentStatus, Required): ESCROW, REFUNDED, RECEIVED
- `madeById` (String, FK → User.id, Required): User making payment
- `receivedById` (String, FK → User.id, Required): User receiving payment
- `studyRoomId` (String, FK → StudyRoom.id, Nullable): Related study room
- `peerSessionId` (String, FK → PeerSession.id, Nullable): Related peer session
- `amountMade` (Decimal(36,16), Required): Amount paid
- `amountReceived` (Decimal(36,16), Nullable): Amount received (after fees, etc.)
- `amountRefunded` (Decimal(36,16), Nullable): Amount refunded
- `createdAt` (DateTime, Default: now()): Payment creation timestamp
- `transactionHash` (String, Nullable): Blockchain transaction hash (future)
- `network` (String, Nullable): Blockchain network (future)

**Relationships**:
- Many-to-one: User (madeBy)
- Many-to-one: User (receivedBy)
- Many-to-one: StudyRoom (optional)
- Many-to-one: PeerSession (optional)

**Indexes**:
- Primary key on `id`
- Foreign key indexes on `madeById`, `receivedById`, `studyRoomId`, `peerSessionId`
- Index on `paymentStatus` (for filtering)
- Index on `createdAt` (for date range queries)
- Composite index on `[madeById, paymentStatus]` (for user's payments)
- Composite index on `[receivedById, paymentStatus]` (for received payments)

**Constraints**:
- Either `studyRoomId` or `peerSessionId` must be set (not both)
- `amountMade` must be > 0
- `amountReceived` must be >= 0 if set
- `amountRefunded` must be >= 0 if set

---

## Review

Rating and review system.

**Columns**:
- `id` (String, PK, CUID): Unique review identifier
- `rating` (Int, Required): Rating (1-5 stars)
- `review` (String, Required): Review text
- `reviewerId` (String, FK → User.id, Required): User writing review
- `revieweeId` (String, FK → User.id, Required): User being reviewed
- `peerSessionId` (String, FK → PeerSession.id, Nullable): Related peer session
- `studyRoomId` (String, FK → StudyRoom.id, Nullable): Related study room

**Relationships**:
- Many-to-one: User (reviewer)
- Many-to-one: User (reviewee)
- Many-to-one: PeerSession (optional)
- Many-to-one: StudyRoom (optional)

**Indexes**:
- Primary key on `id`
- Foreign key indexes on `reviewerId`, `revieweeId`, `peerSessionId`, `studyRoomId`
- Index on `rating` (for filtering)
- Composite index on `[revieweeId, rating]` (for user's average rating calculation)
- Composite index on `[peerSessionId, reviewerId]` (prevents duplicate reviews)
- Composite index on `[studyRoomId, reviewerId]` (prevents duplicate reviews)

**Constraints**:
- `rating` must be between 1 and 5
- `reviewerId` cannot equal `revieweeId` (cannot review self)
- Either `peerSessionId` or `studyRoomId` must be set (not both)
- Unique constraint: User cannot review same session twice

---

## Notification

User notifications.

**Columns**:
- `id` (String, PK, CUID): Unique notification identifier
- `notifType` (NotifType, Required): URGENT, NORMAL
- `message` (String, Required): Notification message
- `createdAt` (DateTime, Required): Notification creation timestamp
- `viewed` (Boolean, Default: false): Read status
- `userId` (String, FK → User.id, Required): User receiving notification
- `actionType` (String, Nullable): Action type (e.g., "SESSION_REQUEST")
- `actionData` (String, Nullable): JSON string with action data
- `peerSessionId` (String, FK → PeerSession.id, Nullable): Related peer session
- `studyRoomId` (String, FK → StudyRoom.id, Nullable): Related study room

**Relationships**:
- Many-to-one: User
- Many-to-one: PeerSession (optional)
- Many-to-one: StudyRoom (optional)

**Indexes**:
- Primary key on `id`
- Foreign key indexes on `userId`, `peerSessionId`, `studyRoomId`
- Composite index on `[userId, viewed]` (for unread notifications query)
- Index on `createdAt` (for sorting)
- Composite index on `[userId, createdAt]` (for user's notification list)

**Constraints**:
- `message` cannot be empty

---

## PushSubscription

Browser push notification subscriptions.

**Columns**:
- `id` (String, PK, CUID): Unique subscription identifier
- `userId` (String, FK → User.id, Required): User owning subscription
- `endpoint` (String, Required): Push service endpoint URL
- `p256dh` (String, Required): Public key for encryption
- `auth` (String, Required): Authentication secret
- `createdAt` (DateTime, Default: now()): Subscription creation timestamp
- `updatedAt` (DateTime, Auto-update): Last update timestamp

**Relationships**:
- Many-to-one: User

**Indexes**:
- Primary key on `id`
- Foreign key index on `userId`
- Unique composite index on `[userId, endpoint]` (prevents duplicates)

**Constraints**:
- User can have multiple subscriptions (different devices)

---

## Metrics

User statistics and metrics.

**Columns**:
- `id` (String, PK, CUID): Unique metric identifier
- `name` (String, Required): Metric name
- `value` (Float, Required): Metric value
- `description` (String, Nullable): Metric description
- `userId` (String, FK → User.id, Unique, Required): User owning metric

**Relationships**:
- One-to-one: User

**Indexes**:
- Primary key on `id`
- Foreign key index on `userId`
- Unique index on `userId` (one metric record per user)

---

## Channel

Chat channels (direct messages or group chats).

**Columns**:
- `id` (String, PK, CUID): Unique channel identifier
- `name` (String, Required): Channel name
- `isDirect` (Boolean, Default: false): Is direct message channel
- `createdAt` (DateTime, Default: now()): Channel creation timestamp
- `externalType` (String, Nullable): External type (e.g., "PEER_SESSION")
- `externalId` (String, Nullable): External entity ID

**Relationships**:
- One-to-many: ChannelMembers
- One-to-many: Messages

**Indexes**:
- Primary key on `id`
- Unique composite index on `[externalType, externalId]` (for external channels)

---

## ChannelMember

Channel membership.

**Columns**:
- `id` (String, PK, CUID): Unique identifier
- `channelId` (String, FK → Channel.id, Required): Channel
- `userId` (String, FK → User.id, Required): User

**Relationships**:
- Many-to-one: Channel
- Many-to-one: User

**Indexes**:
- Primary key on `id`
- Unique composite index on `[channelId, userId]` (prevents duplicate memberships)
- Foreign key indexes on `channelId` and `userId`

---

## Message

Chat messages.

**Columns**:
- `id` (String, PK, CUID): Unique message identifier
- `channelId` (String, FK → Channel.id, Required): Channel
- `senderId` (String, FK → User.id, Required): Message sender
- `content` (String, Required): Message content
- `createdAt` (DateTime, Default: now()): Message creation timestamp

**Relationships**:
- Many-to-one: Channel
- Many-to-one: User (sender)

**Indexes**:
- Primary key on `id`
- Foreign key indexes on `channelId` and `senderId`
- Composite index on `[channelId, createdAt]` (for message history)

**Constraints**:
- `content` cannot be empty

---

## Enums

### SessionStatus
- `UPCOMING`: Session scheduled for future
- `ONGOING`: Session currently in progress
- `CANCELLED`: Session cancelled
- `DONE`: Session completed
- `PENDING`: Session request pending approval (peer sessions only)

### PaymentStatus
- `ESCROW`: Payment held in escrow
- `REFUNDED`: Payment refunded to payer
- `RECEIVED`: Payment released to recipient

### NotifType
- `URGENT`: Urgent notification
- `NORMAL`: Normal notification

