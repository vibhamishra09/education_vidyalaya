# Database Schema Overview

## Database Technology

- **Primary Database**: PostgreSQL 14+
- **ORM**: Prisma
- **Connection**: Connection pooling via Prisma
- **Migrations**: Prisma Migrate

## Why PostgreSQL?

- **Reliability**: ACID compliance for transactional integrity
- **Performance**: Excellent for complex queries and relationships
- **JSON Support**: Native JSON types for flexible data storage
- **Full-Text Search**: Built-in search capabilities
- **Mature Ecosystem**: Extensive tooling and community support
- **Scalability**: Supports read replicas and horizontal scaling

## High-Level Schema Breakdown

### User Management
- **User**: Core user profiles and authentication data
- **UserSkill**: Many-to-many relationship between users and skills (HAS/WANTS)
- **Metrics**: User statistics and metrics

### Skills
- **Skill**: Master list of all skills available on the platform
- **UserSkill**: Links users to skills (with type: HAS or WANTS)
- **StudyRoomSkill**: Links study rooms to skills
- **PeerSessionSkill**: Links peer sessions to skills

### Sessions
- **StudyRoom**: Group learning sessions
- **StudyRoomParticipant**: Many-to-many relationship for room participants
- **PeerSession**: One-on-one tutoring sessions

### Payments
- **Payment**: Transaction records with escrow system
- Tracks payments made, received, and refunded
- Links to both study rooms and peer sessions

### Reviews
- **Review**: Rating and review system
- Links reviewers and reviewees
- Can be for peer sessions or study rooms

### Notifications
- **Notification**: User notifications
- **PushSubscription**: Browser push notification subscriptions

### Communication
- **Channel**: Chat channels (direct messages or group chats)
- **ChannelMember**: Channel membership
- **Message**: Chat messages

## Logical Groups

### 1. Core Entities
- User, Skill, UserSkill

### 2. Session Entities
- StudyRoom, StudyRoomParticipant, StudyRoomSkill
- PeerSession, PeerSessionSkill

### 3. Transaction Entities
- Payment

### 4. Social Entities
- Review, Notification

### 5. Communication Entities
- Channel, ChannelMember, Message, PushSubscription

### 6. Analytics Entities
- Metrics

## Key Relationships

1. **User ↔ Skills**: Many-to-many via UserSkill (HAS/WANTS)
2. **User ↔ StudyRoom**: One-to-many (creator) and many-to-many (participants)
3. **User ↔ PeerSession**: Many-to-many (requestedBy/requestedTo)
4. **User ↔ Payment**: One-to-many (madeBy/receivedBy)
5. **User ↔ Review**: Many-to-many (reviewer/reviewee)
6. **Session ↔ Skills**: Many-to-many via junction tables
7. **Session ↔ Payment**: One-to-many
8. **Session ↔ Review**: One-to-many

## Data Types

- **Strings**: Used for IDs (CUID), text fields, emails
- **Decimals**: Used for coins and amounts (36,16 precision)
- **Booleans**: Used for flags (onboarded, viewed, etc.)
- **Enums**: Used for status fields (SessionStatus, PaymentStatus, NotifType)
- **Timestamps**: Used for dates (createdAt, updatedAt, date)

## Indexing Strategy

- **Primary Keys**: All tables have `id` as primary key (CUID)
- **Unique Constraints**: Email, username, clerkId on User
- **Foreign Keys**: All relationships have proper foreign keys
- **Composite Indexes**: Unique constraints on junction tables (userId + skillId + type)
- **Query Optimization**: Indexes on frequently queried fields (clerkId, email, status fields)

## Data Integrity

- **Foreign Key Constraints**: Enforced at database level
- **Unique Constraints**: Prevent duplicates (email, username, etc.)
- **Cascade Deletes**: Configured for related data cleanup
- **Check Constraints**: Enum types enforce valid values
- **Not Null Constraints**: Required fields enforced at database level

## Scalability Considerations

- **Read Replicas**: Can add read replicas for read-heavy queries
- **Partitioning**: Future consideration for large tables (Payment, Notification)
- **Archiving**: Old data can be archived (completed sessions, old notifications)
- **Connection Pooling**: Prisma handles connection pooling automatically

