# Backend Requirements

## Functional Requirements

### API Endpoints
- Expose RESTful API endpoints for all frontend operations
- Support pagination for list endpoints
- Support filtering and search for browse endpoints
- Provide standardized response formats
- Handle CORS for frontend origin

### Authentication & Authorization
- Implement authentication using Clerk JWT tokens
- Verify JWT tokens on protected endpoints
- Extract user information from JWT tokens
- Support webhook authentication for Clerk events
- Provide current user decorator for easy access
- Protect sensitive endpoints with authentication guards

### User Management
- Expose API for user CRUD operations
- Sync users from Clerk via webhooks
- Manage user profiles (name, bio, avatar, location, school)
- Handle user skills (HAS/WANTS)
- Provide public user profile endpoints
- Track user metrics (sessions, earnings, ratings)

### Skills Management
- Provide CRUD operations for skills
- Support skill search and pagination
- Prevent duplicate skills
- Associate skills with users, sessions, and study rooms

### Study Room Management
- Create, read, update study rooms
- Manage study room participants
- Enforce capacity limits
- Handle joining fees
- Track study room status (UPCOMING, ONGOING, DONE, CANCELLED)
- Filter study rooms by skills, date, status

### Peer Session Management
- Create peer session requests
- Accept/decline session requests
- Update session status
- Track session lifecycle
- Associate sessions with skills
- Filter sessions by user, status, date

### Payment Processing
- Create payment records with escrow system
- Deduct coins from user balance
- Hold coins in escrow
- Release coins on session completion
- Refund coins on cancellation
- Track payment history
- Validate sufficient balance before transactions

### Review System
- Create reviews for sessions
- Prevent duplicate reviews
- Calculate average ratings
- Track review counts
- Associate reviews with users and sessions
- Filter reviews by user or session

### Notification System
- Create notifications for various events
- Mark notifications as read
- Track unread notification counts
- Support notification types (URGENT, NORMAL)
- Paginate notification lists
- Associate notifications with users, sessions, rooms

### Browse & Search
- Browse peers with filtering
- Browse study rooms with filtering
- Search by skills, keywords
- Support pagination
- Return relevant results

### Dashboard
- Aggregate user metrics
- Provide pending session requests
- Show upcoming sessions
- Display recent notifications
- Calculate statistics (sessions completed, coins earned, ratings)

### Data Validation
- Validate all incoming request payloads
- Use DTOs (Data Transfer Objects) for validation
- Transform and sanitize input data
- Return clear validation error messages
- Whitelist allowed properties

### Error Handling
- Return standardized error format
- Use appropriate HTTP status codes
- Provide error codes for programmatic handling
- Include error messages for users
- Log errors with context (trace_id, user_id)

## Non-Functional Requirements

### Performance
- All APIs must respond within 500ms (p95) under normal load
- Database queries optimized with proper indexes
- Implement pagination to handle large datasets
- Use efficient query patterns (avoid N+1 queries)
- Support connection pooling for database

### Reliability
- Handle database connection failures gracefully
- Implement retry logic for external service calls
- Use database transactions for critical operations
- Provide health check endpoints
- Log all errors with sufficient context

### Security
- Verify JWT tokens on all protected endpoints
- Validate and sanitize all user inputs
- Prevent SQL injection via Prisma ORM
- Implement CORS for allowed origins only
- Verify webhook signatures from Clerk
- Never expose sensitive data in error messages
- Use environment variables for secrets

### Scalability
- Design stateless API (no server-side sessions)
- Support horizontal scaling (multiple instances)
- Use database connection pooling
- Implement efficient caching strategy (future)
- Optimize database queries for performance

### Observability
- Log all API requests with trace_id
- Include user_id in logs when available
- Log errors with stack traces
- Track API response times
- Monitor database query performance
- Provide metrics endpoints (future)

### Documentation
- Generate OpenAPI/Swagger documentation
- Document all endpoints with request/response schemas
- Provide example requests and responses
- Document error codes and status codes
- Keep documentation up-to-date with code

### Code Quality
- Use TypeScript for type safety
- Follow NestJS best practices
- Implement proper error handling
- Write unit tests for business logic
- Write integration tests for API endpoints
- Maintain code consistency

### Database
- Use Prisma migrations for schema changes
- Maintain referential integrity
- Use transactions for multi-step operations
- Implement proper indexing strategy
- Support database backups
- Handle migration rollbacks

### External Integrations
- Handle Clerk webhook events
- Generate LiveKit tokens securely
- Handle external service failures gracefully
- Implement retry logic with exponential backoff
- Monitor external service health

### Configuration
- Load configuration from environment variables
- Support different environments (dev, staging, prod)
- Validate required environment variables on startup
- Provide sensible defaults where appropriate
- Never commit secrets to version control

