# Database Performance

## Important Indexes and Why They Exist

### User Table

**Indexes**:
- `id` (Primary Key): Fast lookups by user ID
- `email` (Unique): Fast email lookups for authentication
- `clerkId` (Unique): Fast Clerk ID lookups for webhook sync
- `username` (Unique, Nullable): Fast username lookups

**Why**: User lookups are the most common operation. These indexes ensure O(log n) lookups instead of full table scans.

---

### PeerSession Table

**Indexes**:
- `requestedById` + `sessionStatus`: Find user's sessions by status
- `requestedToId` + `sessionStatus`: Find received sessions by status
- `date`: Date range queries for upcoming sessions
- `sessionStatus`: Filter by status

**Why**: Users frequently query their own sessions filtered by status. Composite indexes make these queries efficient.

**Query Example**:
```sql
-- Uses composite index
SELECT * FROM "PeerSession" 
WHERE "requestedById" = 'user_xxx' 
AND "sessionStatus" = 'UPCOMING';
```

---

### StudyRoom Table

**Indexes**:
- `createdById`: Find rooms created by user
- `sessionStatus`: Filter by status
- `date`: Date range queries

**Why**: Users need to find their created rooms and browse rooms by date/status.

---

### Payment Table

**Indexes**:
- `madeById` + `paymentStatus`: Find user's payments by status
- `receivedById` + `paymentStatus`: Find received payments by status
- `createdAt`: Date range queries for transaction history

**Why**: Payment queries are frequent for dashboard and transaction history. Composite indexes optimize these.

**Query Example**:
```sql
-- Uses composite index
SELECT * FROM "Payment" 
WHERE "madeById" = 'user_xxx' 
AND "paymentStatus" = 'ESCROW';
```

---

### Notification Table

**Indexes**:
- `userId` + `viewed`: Find unread notifications
- `userId` + `createdAt`: Get user's notifications sorted by date

**Why**: Notification queries are very frequent. Users constantly check unread count and notification list.

**Query Example**:
```sql
-- Uses composite index
SELECT COUNT(*) FROM "Notification" 
WHERE "userId" = 'user_xxx' 
AND "viewed" = false;
```

---

### Review Table

**Indexes**:
- `revieweeId` + `rating`: Calculate average rating
- `peerSessionId` + `reviewerId`: Prevent duplicate reviews
- `studyRoomId` + `reviewerId`: Prevent duplicate reviews

**Why**: Average rating calculation is expensive without index. Duplicate prevention needs fast lookups.

**Query Example**:
```sql
-- Uses composite index for average
SELECT AVG("rating") FROM "Review" 
WHERE "revieweeId" = 'user_xxx';
```

---

### Junction Tables (UserSkill, StudyRoomParticipant, etc.)

**Indexes**:
- Composite unique indexes: `[userId, skillId, type]`
- Foreign key indexes on both sides

**Why**: Junction table queries are frequent. Composite indexes optimize joins and prevent duplicates.

---

## Heavy Queries and How They're Optimized

### 1. User Dashboard Query

**Query**: Get user metrics, pending requests, upcoming sessions, notifications

**Optimization**:
- Use separate queries instead of complex joins
- Use indexes on `userId` + `status` for sessions
- Use indexes on `userId` + `viewed` for notifications
- Cache metrics if possible

**Example**:
```typescript
// Optimized: Separate queries with indexes
const sessions = await prisma.peerSession.findMany({
  where: { requestedById: userId, sessionStatus: 'UPCOMING' },
  // Uses index on requestedById + sessionStatus
});

const notifications = await prisma.notification.findMany({
  where: { userId, viewed: false },
  // Uses index on userId + viewed
});
```

---

### 2. Browse Peers Query

**Query**: Browse peers filtered by skills with pagination

**Optimization**:
- Use junction table indexes
- Limit results with pagination
- Use `include` efficiently (don't over-fetch)

**Example**:
```typescript
const users = await prisma.user.findMany({
  where: {
    userSkills: {
      some: {
        skillId: { in: skillIds },
        type: 'HAS'
      }
    }
  },
  take: limit,
  skip: (page - 1) * limit,
  // Uses index on UserSkill.skillId
});
```

---

### 3. Average Rating Calculation

**Query**: Calculate user's average rating

**Optimization**:
- Use composite index on `revieweeId` + `rating`
- Consider caching result in Metrics table
- Update Metrics table when review is created

**Example**:
```typescript
// Uses index on revieweeId
const reviews = await prisma.review.findMany({
  where: { revieweeId: userId },
  select: { rating: true }
});

const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

// Cache in Metrics table
await prisma.metrics.upsert({
  where: { userId },
  update: { value: avgRating },
  create: { userId, name: 'averageRating', value: avgRating }
});
```

---

### 4. Session List with Filters

**Query**: Get sessions filtered by status, date range, user

**Optimization**:
- Use composite indexes on `userId` + `status`
- Use index on `date` for range queries
- Limit results with pagination

**Example**:
```typescript
const sessions = await prisma.peerSession.findMany({
  where: {
    requestedById: userId,
    sessionStatus: status,
    date: {
      gte: dateFrom,
      lte: dateTo
    }
  },
  // Uses composite index on requestedById + sessionStatus
  // Uses index on date
  take: limit,
  skip: (page - 1) * limit
});
```

---

## Caching Strategy

### Current Implementation

**No caching currently implemented**. All queries hit database directly.

### Future Caching Opportunities

1. **User Metrics**: Cache in Metrics table, update on relevant events
2. **Skills List**: Cache in memory (rarely changes)
3. **User Profile**: Cache with TTL (updates infrequently)
4. **Session Details**: Cache with TTL for frequently accessed sessions

### Recommended Caching Approach

**Redis Cache** (future enhancement):
- Cache user metrics (TTL: 5 minutes)
- Cache skills list (TTL: 1 hour)
- Cache user profiles (TTL: 10 minutes)
- Cache notification counts (TTL: 1 minute)

**Application-Level Cache**:
- Cache skills list in memory (restart on skill creation)
- Cache frequently accessed user data

---

## Known Bottlenecks / Future Considerations

### Current Bottlenecks

1. **Notification Queries**: High frequency, could benefit from caching
2. **Average Rating Calculation**: Calculated on-the-fly, should cache in Metrics
3. **Browse Queries**: Complex joins, could benefit from materialized views
4. **Dashboard Aggregation**: Multiple queries, could be optimized

### Future Considerations

1. **Read Replicas**: Add read replicas for read-heavy queries
2. **Partitioning**: Partition large tables (Payment, Notification) by date
3. **Materialized Views**: Pre-aggregate common queries (user metrics, popular skills)
4. **Full-Text Search**: Add PostgreSQL full-text search for skills, users
5. **Connection Pooling**: Already handled by Prisma, but monitor pool size
6. **Query Optimization**: Use `EXPLAIN ANALYZE` to identify slow queries
7. **Database Monitoring**: Set up query performance monitoring

### Query Performance Monitoring

**Recommended Metrics**:
- Slow query log (queries > 100ms)
- Query execution time percentiles (p50, p95, p99)
- Index usage statistics
- Table scan frequency
- Connection pool utilization

**Tools**:
- PostgreSQL `pg_stat_statements` extension
- Prisma query logging
- Application Performance Monitoring (APM) tools

---

## Index Maintenance

### When to Add Indexes

- **Frequent WHERE clauses**: Add index on filtered columns
- **Frequent JOINs**: Add index on foreign keys
- **Frequent ORDER BY**: Add index on sorted columns
- **Frequent GROUP BY**: Add index on grouped columns

### When NOT to Add Indexes

- **Rarely queried columns**: Don't add unnecessary indexes
- **Frequently updated columns**: Indexes slow down writes
- **Low cardinality columns**: Indexes don't help much (e.g., boolean)

### Index Monitoring

**Monitor**:
- Index usage: `pg_stat_user_indexes`
- Unused indexes: Remove if not used
- Index bloat: Reindex periodically

**Maintenance**:
```sql
-- Reindex table
REINDEX TABLE "User";

-- Analyze table (update statistics)
ANALYZE "User";
```

---

## Database Connection Pooling

**Prisma Connection Pooling**:
- Prisma handles connection pooling automatically
- Default pool size: Based on database URL
- Configure via `DATABASE_URL` connection string parameters

**Recommended Settings**:
```
DATABASE_URL="postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=20"
```

**Monitoring**:
- Monitor active connections
- Alert on connection pool exhaustion
- Scale database if needed

---

## Performance Testing

### Load Testing

**Test Scenarios**:
1. High concurrent user sessions
2. Large dataset queries (10k+ users, 100k+ sessions)
3. Complex browse queries with multiple filters
4. Dashboard aggregation under load

**Tools**:
- k6, Artillery, or similar load testing tools
- Monitor database performance during tests

### Optimization Checklist

- [ ] All foreign keys have indexes
- [ ] Composite indexes on frequently queried column combinations
- [ ] Pagination implemented on all list endpoints
- [ ] Queries use indexes (verify with EXPLAIN)
- [ ] No N+1 query problems
- [ ] Connection pooling configured
- [ ] Query timeouts set
- [ ] Slow query logging enabled

