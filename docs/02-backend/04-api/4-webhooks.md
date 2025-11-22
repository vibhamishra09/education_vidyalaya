# Webhooks

TODO: Correct the documentation based on the code. (Clerk webhooks not being used)

## Overview

Webyalaya backend receives webhooks from Clerk for user synchronization. This ensures that user data in our database stays in sync with Clerk's authentication system.

## Webhook Endpoint

### POST /api/webhooks/clerk

**URL**: `https://your-backend.com/api/webhooks/clerk`

**Description**: Receives webhook events from Clerk when users are created, updated, or deleted.

---

## Authentication Strategy

### Webhook Secret Verification

Clerk signs webhook payloads with a secret. The backend verifies this signature to ensure the webhook is legitimate.

**Header**: `svix-signature`
- Contains signature and timestamp
- Format: `v1,timestamp,signature`

**Verification Process**:
1. Extract signature and timestamp from header
2. Recreate the signed payload using webhook secret
3. Compare computed signature with received signature
4. Verify timestamp is recent (prevent replay attacks)
5. Process webhook if verification passes

**Environment Variable**: `CLERK_WEBHOOK_SECRET`
- Set this in your Clerk dashboard under Webhooks → Signing Secret
- Never commit this secret to version control

---

## Webhook Events

### user.created

**Trigger**: New user signs up in Clerk

**Payload Example**:
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [
      {
        "email_address": "john@example.com",
        "id": "idn_xxx",
        "verification": {
          "status": "verified"
        }
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://img.clerk.com/...",
    "username": "johndoe",
    "created_at": 1234567890
  }
}
```

**Backend Action**:
1. Create user record in database
2. Set `clerkId` to Clerk user ID
3. Set `email` from email_addresses[0]
4. Set `name` from first_name + last_name
5. Set `avatar` from image_url
6. Initialize `coins` to 100 (starting coins)
7. Set `onboarded` to false

---

### user.updated

**Trigger**: User profile updated in Clerk

**Payload Example**:
```json
{
  "type": "user.updated",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [...],
    "first_name": "John",
    "last_name": "Smith",  // Changed
    "image_url": "https://img.clerk.com/...",
    "username": "johnsmith"  // Changed
  }
}
```

**Backend Action**:
1. Find user by `clerkId`
2. Update user fields:
   - `name` (if first_name/last_name changed)
   - `email` (if primary email changed)
   - `avatar` (if image_url changed)
   - `username` (if username changed)

---

### user.deleted

**Trigger**: User account deleted in Clerk

**Payload Example**:
```json
{
  "type": "user.deleted",
  "data": {
    "id": "user_2abc123",
    "deleted": true
  }
}
```

**Backend Action**:
1. Find user by `clerkId`
2. Option 1: Soft delete (mark as deleted, keep data)
3. Option 2: Hard delete (remove user record)
4. Handle cascading deletes for related data (sessions, reviews, etc.)

**Note**: Current implementation may not handle deletions. Consider implementing soft delete or data anonymization for GDPR compliance.

---

## Payload Examples

### Complete Webhook Request

**Headers**:
```
POST /api/webhooks/clerk HTTP/1.1
Host: your-backend.com
Content-Type: application/json
svix-id: msg_2abc123
svix-timestamp: 1234567890
svix-signature: v1,timestamp,signature_hash
```

**Body**:
```json
{
  "type": "user.created",
  "data": {
    "id": "user_2abc123",
    "email_addresses": [
      {
        "email_address": "john@example.com",
        "id": "idn_xxx",
        "verification": {
          "status": "verified"
        }
      }
    ],
    "first_name": "John",
    "last_name": "Doe",
    "image_url": "https://img.clerk.com/...",
    "username": "johndoe",
    "created_at": 1234567890
  }
}
```

---

## Retry Policy

### Clerk's Retry Policy

Clerk will retry failed webhook deliveries:
- **Initial attempt**: Immediate
- **Retry 1**: After 1 minute
- **Retry 2**: After 5 minutes
- **Retry 3**: After 30 minutes
- **Retry 4**: After 2 hours
- **Retry 5**: After 6 hours
- **Retry 6**: After 12 hours
- **Max retries**: 6 attempts

### Backend Response Requirements

**Success Response**: `200 OK`
```json
{
  "message": "Webhook processed successfully"
}
```

**Error Response**: `400 Bad Request` or `500 Internal Server Error`
- Clerk will retry on 4xx/5xx errors
- Return `200 OK` only if webhook was successfully processed
- Idempotency: Handle duplicate webhooks gracefully

---

## Idempotency

Webhooks may be delivered multiple times. The backend should handle this gracefully:

1. **Check if user exists**: Before creating, check if user with `clerkId` already exists
2. **Update instead of create**: If user exists, update instead of error
3. **Idempotent operations**: Ensure operations can be safely repeated

**Example**:
```typescript
// Idempotent user creation
const existingUser = await prisma.user.findUnique({
  where: { clerkId: clerkData.id }
});

if (existingUser) {
  // Update existing user
  return await prisma.user.update({
    where: { clerkId: clerkData.id },
    data: { ... }
  });
} else {
  // Create new user
  return await prisma.user.create({
    data: { ... }
  });
}
```

---

## Error Handling

### Invalid Signature
- **Response**: `401 Unauthorized`
- **Action**: Log security event, reject webhook
- **Retry**: Clerk will retry, but will fail again if secret is wrong

### Processing Error
- **Response**: `500 Internal Server Error`
- **Action**: Log error details, return error response
- **Retry**: Clerk will retry automatically

### User Not Found (for updates/deletes)
- **Response**: `404 Not Found` or `200 OK` (if idempotent)
- **Action**: Log warning, may be expected for deletions
- **Retry**: Clerk will retry, but may be expected behavior

---

## Testing Webhooks

### Local Development

Use Clerk's webhook testing tools or ngrok to forward webhooks to local server:

1. **Install ngrok**: `npm install -g ngrok`
2. **Start backend**: `pnpm start:dev` (runs on port 3001)
3. **Expose local server**: `ngrok http 3001`
4. **Copy ngrok URL**: `https://abc123.ngrok.io`
5. **Configure Clerk webhook**: Set webhook URL to `https://abc123.ngrok.io/api/webhooks/clerk`
6. **Test**: Create/update user in Clerk, verify webhook received

### Webhook Testing Tools

- **Clerk Dashboard**: Test webhooks from Clerk dashboard
- **Postman**: Manually send webhook payloads
- **Svix CLI**: Test webhook signatures locally

---

## Security Considerations

1. **Always verify signature**: Never process webhooks without signature verification
2. **Check timestamp**: Reject webhooks with old timestamps (prevent replay attacks)
3. **Validate payload**: Ensure payload structure matches expected format
4. **Rate limiting**: Consider rate limiting webhook endpoint (future enhancement)
5. **Logging**: Log all webhook events for audit trail
6. **Monitoring**: Monitor webhook success/failure rates

---

## Future Enhancements

### Additional Webhook Events
- `session.created`: When Clerk session is created
- `session.revoked`: When Clerk session is revoked
- `organization.created`: If using Clerk organizations

### Webhook Queue
- Implement queue system for webhook processing
- Handle high-volume webhook events
- Retry failed processing internally

### Webhook Dashboard
- View webhook delivery history
- Retry failed webhooks manually
- Monitor webhook health

---

## Configuration

### Clerk Dashboard Setup

1. Go to **Webhooks** section in Clerk dashboard
2. Click **Add Endpoint**
3. Enter webhook URL: `https://your-backend.com/api/webhooks/clerk`
4. Select events: `user.created`, `user.updated`, `user.deleted`
5. Copy **Signing Secret**
6. Set `CLERK_WEBHOOK_SECRET` environment variable

### Environment Variables

```bash
CLERK_WEBHOOK_SECRET=whsec_xxx  # From Clerk dashboard
CLERK_SECRET_KEY=sk_test_xxx    # For webhook verification
```

---

## Monitoring

### Key Metrics
- **Webhook delivery rate**: Success vs failure
- **Processing time**: Time to process webhook
- **Error rate**: Errors by type
- **Retry rate**: How often Clerk retries

### Alerts
- Alert on high webhook failure rate (> 5%)
- Alert on webhook processing errors
- Alert on signature verification failures

