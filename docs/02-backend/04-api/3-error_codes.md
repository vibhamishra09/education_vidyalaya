# Error Codes

## Error Response Schema

All API errors follow this standardized format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {},
  "field": "fieldName",  // Optional: field that caused the error
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Error Codes List

### Authentication Errors

#### UNAUTHORIZED
- **HTTP Status**: `401 Unauthorized`
- **Description**: User is not authenticated or token is invalid/expired
- **Example**: Missing or invalid JWT token
- **Resolution**: User must authenticate and provide valid token

#### FORBIDDEN
- **HTTP Status**: `403 Forbidden`
- **Description**: User is authenticated but not authorized for this action
- **Example**: User trying to update another user's study room
- **Resolution**: User can only perform actions on their own resources

---

### Validation Errors

#### VALIDATION_ERROR
- **HTTP Status**: `400 Bad Request`
- **Description**: Request validation failed
- **Example**: Missing required fields, invalid data types
- **Field**: Field name that failed validation
- **Resolution**: Fix validation errors and retry

#### INVALID_DATE
- **HTTP Status**: `400 Bad Request`
- **Description**: Date is invalid or in the past
- **Example**: Session date is before current date
- **Resolution**: Provide a valid future date

#### INVALID_DURATION
- **HTTP Status**: `400 Bad Request`
- **Description**: Duration is outside allowed range
- **Example**: Duration must be between 15 and 480 minutes
- **Resolution**: Provide duration within valid range

---

### Resource Not Found Errors

#### USER_NOT_FOUND
- **HTTP Status**: `404 Not Found`
- **Description**: User with given ID does not exist
- **Example**: Requesting profile for non-existent user
- **Resolution**: Verify user ID is correct

#### SESSION_NOT_FOUND
- **HTTP Status**: `404 Not Found`
- **Description**: Peer session or study room not found
- **Example**: Requesting details for non-existent session
- **Resolution**: Verify session ID is correct

#### SKILL_NOT_FOUND
- **HTTP Status**: `404 Not Found`
- **Description**: Skill with given ID does not exist
- **Example**: Referencing non-existent skill
- **Resolution**: Verify skill ID is correct

#### NOTIFICATION_NOT_FOUND
- **HTTP Status**: `404 Not Found`
- **Description**: Notification not found
- **Example**: Marking non-existent notification as read
- **Resolution**: Verify notification ID is correct

---

### Payment Errors

#### INSUFFICIENT_FUNDS
- **HTTP Status**: `400 Bad Request`
- **Description**: User does not have enough coins for transaction
- **Example**: Requesting session but balance is too low
- **Resolution**: User needs to earn more coins or reduce transaction amount

#### PAYMENT_NOT_FOUND
- **HTTP Status**: `404 Not Found`
- **Description**: Payment record not found
- **Example**: Referencing non-existent payment
- **Resolution**: Verify payment ID is correct

#### PAYMENT_ALREADY_PROCESSED
- **HTTP Status**: `409 Conflict`
- **Description**: Payment has already been processed
- **Example**: Trying to refund already refunded payment
- **Resolution**: Payment cannot be processed again

---

### Session Errors

#### ROOM_FULL
- **HTTP Status**: `409 Conflict`
- **Description**: Study room has reached maximum capacity
- **Example**: Trying to join full study room
- **Resolution**: Wait for available spot or find another room

#### ALREADY_PARTICIPANT
- **HTTP Status**: `409 Conflict`
- **Description**: User is already a participant
- **Example**: Trying to join study room they're already in
- **Resolution**: User is already a participant

#### SESSION_ALREADY_ACCEPTED
- **HTTP Status**: `409 Conflict`
- **Description**: Session has already been accepted
- **Example**: Trying to accept already accepted session
- **Resolution**: Session status cannot be changed

#### SESSION_ALREADY_CANCELLED
- **HTTP Status**: `409 Conflict`
- **Description**: Session has already been cancelled
- **Example**: Trying to update cancelled session
- **Resolution**: Cannot modify cancelled session

#### CANNOT_CANCEL_COMPLETED_SESSION
- **HTTP Status**: `400 Bad Request`
- **Description**: Cannot cancel a completed session
- **Example**: Trying to cancel session with DONE status
- **Resolution**: Completed sessions cannot be cancelled

---

### Review Errors

#### DUPLICATE_REVIEW
- **HTTP Status**: `409 Conflict`
- **Description**: User has already reviewed this session
- **Example**: Trying to submit second review for same session
- **Resolution**: Each user can only review a session once

#### CANNOT_REVIEW_OWN_SESSION
- **HTTP Status**: `400 Bad Request`
- **Description**: User cannot review their own session
- **Example**: Trying to review session where user is both parties
- **Resolution**: Can only review sessions with other users

#### SESSION_NOT_COMPLETED
- **HTTP Status**: `400 Bad Request`
- **Description**: Can only review completed sessions
- **Example**: Trying to review UPCOMING session
- **Resolution**: Wait for session to complete

---

### Skill Errors

#### SKILL_ALREADY_EXISTS
- **HTTP Status**: `409 Conflict`
- **Description**: Skill with this name already exists
- **Example**: Creating duplicate skill
- **Resolution**: Use existing skill or choose different name

#### SKILL_NOT_FOUND
- **HTTP Status**: `404 Not Found`
- **Description**: Skill does not exist
- **Example**: Referencing non-existent skill
- **Resolution**: Verify skill ID is correct

---

### User Errors

#### USERNAME_ALREADY_TAKEN
- **HTTP Status**: `409 Conflict`
- **Description**: Username is already taken
- **Example**: Trying to set username that exists
- **Resolution**: Choose different username

#### EMAIL_ALREADY_EXISTS
- **HTTP Status**: `409 Conflict`
- **Description**: Email is already registered
- **Example**: Trying to register with existing email
- **Resolution**: Use different email or login

---

### Rate Limiting Errors

#### RATE_LIMITED
- **HTTP Status**: `429 Too Many Requests`
- **Description**: Too many requests in short time period
- **Example**: Exceeding rate limit on authentication endpoints
- **Resolution**: Wait before retrying

---

### Server Errors

#### INTERNAL_SERVER_ERROR
- **HTTP Status**: `500 Internal Server Error`
- **Description**: Unexpected server error
- **Example**: Database connection failure, unhandled exception
- **Resolution**: Contact support if issue persists

#### DATABASE_ERROR
- **HTTP Status**: `500 Internal Server Error`
- **Description**: Database operation failed
- **Example**: Connection timeout, query failure
- **Resolution**: Retry request or contact support

#### EXTERNAL_SERVICE_ERROR
- **HTTP Status**: `502 Bad Gateway`
- **Description**: External service (Clerk, LiveKit) error
- **Example**: Clerk API unavailable
- **Resolution**: Retry request or contact support

---

## Error Code Mapping to Log/Monitoring Fields

### Log Fields
- `error_code`: The error code (e.g., "INSUFFICIENT_FUNDS")
- `error_message`: Human-readable message
- `http_status`: HTTP status code
- `user_id`: User ID if available
- `trace_id`: Request trace ID for correlation
- `timestamp`: Error timestamp
- `field`: Field that caused error (if applicable)
- `stack_trace`: Stack trace for server errors

### Monitoring Metrics
- **Error Rate**: Count of errors by code
- **Error Rate by Endpoint**: Errors grouped by API endpoint
- **Error Rate by User**: Errors grouped by user (for debugging)
- **4xx vs 5xx Ratio**: Client vs server errors

### Alerting Thresholds
- **5xx Errors**: Alert if > 1% of requests
- **4xx Errors**: Alert if > 10% of requests (may indicate client issues)
- **Specific Critical Errors**: Alert on INSUFFICIENT_FUNDS spikes (may indicate payment issues)

## Error Handling Best Practices

1. **Always include error code**: Makes programmatic handling easier
2. **Provide helpful messages**: Guide users on how to fix issues
3. **Include field name**: For validation errors, specify which field failed
4. **Log all errors**: Include context for debugging
5. **Don't expose sensitive data**: Never include passwords, tokens, or internal details
6. **Use appropriate HTTP status**: Follow REST conventions
7. **Include timestamp**: Helps with debugging and correlation

## Client-Side Error Handling

Clients should:
1. Check `code` field for programmatic handling
2. Display `message` to users
3. Use `field` to highlight form errors
4. Retry on 5xx errors with exponential backoff
5. Handle 401 by redirecting to login
6. Handle 429 by implementing rate limiting

