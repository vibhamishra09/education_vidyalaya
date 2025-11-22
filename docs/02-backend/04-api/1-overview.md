# API Overview

## API Design

### REST vs GraphQL
- **RESTful API**: All endpoints follow REST principles
- Resource-based URLs (e.g., `/api/users`, `/api/peer-sessions`)
- HTTP methods indicate actions (GET, POST, PATCH, DELETE)
- JSON request/response format

### Authentication Strategy

**Header-based Authentication:**
- All protected endpoints require JWT token in `Authorization` header
- Format: `Authorization: Bearer <clerk_jwt_token>`
- Token is verified using Clerk SDK on backend
- Unauthenticated requests return `401 Unauthorized`

**Public Endpoints:**
- `GET /api/browse` - Browse peers and study rooms
- `GET /api/users/:userId` - Public user profiles
- `GET /api/skills` - List skills
- `POST /api/webhooks/clerk` - Clerk webhook (uses webhook secret)

### Versioning

- **Current Version**: `/api/v1` (implicit, no version prefix currently)
- All endpoints under `/api/` namespace
- Future versioning strategy: `/api/v2/` for breaking changes

### Pagination Conventions

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

**Response Format:**
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Common Response Shape

**Success Response:**
```json
{
  "data": { ... }  // or [ ... ] for arrays
}
```

**Paginated Response:**
```json
{
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

**Error Response:**
```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {},
  "field": "fieldName",  // Optional: field that caused error
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### HTTP Status Codes

- `200 OK`: Successful GET, PATCH requests
- `201 Created`: Successful POST requests (resource created)
- `400 Bad Request`: Validation errors, invalid input
- `401 Unauthorized`: Authentication required or failed
- `403 Forbidden`: User not authorized for action
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Duplicate resource, conflict
- `500 Internal Server Error`: Server errors

### Request Headers

**Required for Protected Endpoints:**
```
Authorization: Bearer <clerk_jwt_token>
Content-Type: application/json
```

**Optional:**
```
Accept: application/json
```

### Response Headers

```
Content-Type: application/json
Access-Control-Allow-Origin: <frontend-origin>
Access-Control-Allow-Credentials: true
```

### Base URL

- **Development**: `http://localhost:3001`
- **Production**: Configured via environment variables

### API Documentation

- **Swagger UI**: Available at `/api/docs` when server is running
- **Interactive Testing**: Test endpoints directly from Swagger UI
- **OpenAPI Spec**: Generated automatically from code

### Rate Limiting

- Currently not implemented (future enhancement)
- Planned: Rate limiting on authentication endpoints
- Planned: Per-user rate limits for API calls

### CORS Configuration

- Configured for specific frontend origins
- Supports credentials (cookies, auth headers)
- Origins configured in `main.ts` and via `FRONTEND_URLS` env var

### Content Types

- **Request**: `application/json`
- **Response**: `application/json`
- **File Uploads**: `multipart/form-data` (for upload endpoints)

### Date/Time Format

- **ISO 8601**: All dates/times in ISO 8601 format
- Example: `2024-01-01T12:00:00.000Z`
- Timezone: UTC

### Filtering & Search

**Common Query Parameters:**
- `search`: Text search (skills, users, rooms)
- `skillIds`: Filter by skills (comma-separated)
- `status`: Filter by status (enum values)
- `dateFrom`, `dateTo`: Date range filtering
- `page`, `limit`: Pagination

### Sorting

- Currently not implemented (future enhancement)
- Planned: `sortBy` and `sortOrder` query parameters

