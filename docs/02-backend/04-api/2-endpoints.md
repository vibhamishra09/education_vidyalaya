# API Endpoints

## Authentication & Users

### POST /api/webhooks/clerk
**Description**: Clerk webhook endpoint for user synchronization

**Auth**: Webhook secret verification (not JWT)

**Request Body**:
```json
{
  "type": "user.created",
  "data": {
    "id": "user_xxx",
    "email_addresses": [...],
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

**Response**: `200 OK`
```json
{
  "message": "User synced successfully"
}
```

---

### GET /api/users/me
**Description**: Get current authenticated user's profile

**Auth**: Required (Bearer token)

**Response**: `200 OK`
```json
{
  "data": {
    "id": "user_xxx",
    "name": "John Doe",
    "email": "john@example.com",
    "avatar": "https://...",
    "bio": "Software developer",
    "location": "San Francisco",
    "school": "MIT",
    "coins": "100.00",
    "wallet": null,
    "hourlyRate": "50.00",
    "onboarded": true,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

---

### PATCH /api/users/me
**Description**: Update current user's profile

**Auth**: Required

**Request Body**:
```json
{
  "name": "John Doe",
  "bio": "Updated bio",
  "avatar": "https://...",
  "location": "New York",
  "school": "Harvard",
  "hourlyRate": "60.00"
}
```

**Response**: `200 OK`
```json
{
  "data": {
    "id": "user_xxx",
    "name": "John Doe",
    ...
  }
}
```

---

### GET /api/users/:userId
**Description**: Get public user profile

**Auth**: Not required

**Response**: `200 OK`
```json
{
  "data": {
    "id": "user_xxx",
    "name": "John Doe",
    "avatar": "https://...",
    "bio": "Software developer",
    "location": "San Francisco",
    "school": "MIT",
    "hourlyRate": "50.00",
    "metrics": {
      "sessionsCompleted": 10,
      "coinsEarned": "500.00",
      "averageRating": 4.5,
      "reviewCount": 8
    }
  }
}
```

---

### GET /api/users/:userId/skills
**Description**: Get user's skills (HAS and WANTS)

**Auth**: Not required

**Response**: `200 OK`
```json
{
  "data": {
    "has": [
      {
        "id": "skill_xxx",
        "name": "React",
        "description": "React framework"
      }
    ],
    "wants": [
      {
        "id": "skill_yyy",
        "name": "Python",
        "description": "Python programming"
      }
    ]
  }
}
```

---

## Skills

### GET /api/skills
**Description**: Get all skills with search and pagination

**Auth**: Not required

**Query Parameters**:
- `search` (optional): Search by name/description
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "skill_xxx",
      "name": "React",
      "description": "React framework"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 50,
    "totalPages": 3
  }
}
```

---

### POST /api/skills
**Description**: Create a new skill

**Auth**: Required

**Request Body**:
```json
{
  "name": "Vue.js",
  "description": "Vue.js framework"
}
```

**Response**: `201 Created`
```json
{
  "data": {
    "id": "skill_xxx",
    "name": "Vue.js",
    "description": "Vue.js framework"
  }
}
```

---

## Study Rooms

### GET /api/study-rooms
**Description**: List study rooms with filtering

**Auth**: Not required

**Query Parameters**:
- `skillIds` (optional): Comma-separated skill IDs
- `status` (optional): UPCOMING, ONGOING, DONE, CANCELLED
- `dateFrom` (optional): ISO date string
- `dateTo` (optional): ISO date string
- `search` (optional): Search by title/description
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "room_xxx",
      "title": "React Fundamentals",
      "description": "Learn React basics",
      "sessionStatus": "UPCOMING",
      "date": "2024-01-15T10:00:00.000Z",
      "duration": 60,
      "maxParticipants": 10,
      "currentParticipants": 5,
      "joiningFee": "20.00",
      "createdBy": {
        "id": "user_xxx",
        "name": "John Doe",
        "avatar": "https://..."
      },
      "skills": [
        {
          "id": "skill_xxx",
          "name": "React"
        }
      ]
    }
  ],
  "pagination": { ... }
}
```

---

### GET /api/study-rooms/:id
**Description**: Get study room details

**Auth**: Not required

**Response**: `200 OK`
```json
{
  "data": {
    "id": "room_xxx",
    "title": "React Fundamentals",
    "description": "Learn React basics",
    "sessionStatus": "UPCOMING",
    "date": "2024-01-15T10:00:00.000Z",
    "duration": 60,
    "maxParticipants": 10,
    "currentParticipants": 5,
    "joiningFee": "20.00",
    "gmeetLink": "https://meet.google.com/...",
    "createdBy": { ... },
    "participants": [ ... ],
    "skills": [ ... ]
  }
}
```

---

### POST /api/study-rooms
**Description**: Create a new study room

**Auth**: Required

**Request Body**:
```json
{
  "title": "React Fundamentals",
  "description": "Learn React basics",
  "date": "2024-01-15T10:00:00.000Z",
  "duration": 60,
  "maxParticipants": 10,
  "joiningFee": "20.00",
  "skillIds": ["skill_xxx", "skill_yyy"]
}
```

**Response**: `201 Created`
```json
{
  "data": {
    "id": "room_xxx",
    "title": "React Fundamentals",
    ...
  }
}
```

---

### PATCH /api/study-rooms/:id
**Description**: Update study room (owner only)

**Auth**: Required

**Request Body**:
```json
{
  "title": "Updated Title",
  "description": "Updated description",
  "gmeetLink": "https://meet.google.com/..."
}
```

**Response**: `200 OK`
```json
{
  "data": {
    "id": "room_xxx",
    "title": "Updated Title",
    ...
  }
}
```

---

### POST /api/study-rooms/:id/join
**Description**: Join a study room

**Auth**: Required

**Response**: `200 OK`
```json
{
  "data": {
    "message": "Successfully joined study room",
    "studyRoom": { ... }
  }
}
```

---

## Peer Sessions

### GET /api/peer-sessions
**Description**: List peer sessions (filtered by current user)

**Auth**: Required

**Query Parameters**:
- `status` (optional): PENDING, UPCOMING, ONGOING, DONE, CANCELLED
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "session_xxx",
      "title": "React Tutoring",
      "description": "One-on-one React session",
      "sessionStatus": "UPCOMING",
      "date": "2024-01-15T10:00:00.000Z",
      "duration": 60,
      "requestedBy": {
        "id": "user_xxx",
        "name": "Alice",
        "avatar": "https://..."
      },
      "requestedTo": {
        "id": "user_yyy",
        "name": "Bob",
        "avatar": "https://..."
      },
      "skills": [ ... ],
      "payment": {
        "amountMade": "50.00",
        "paymentStatus": "ESCROW"
      }
    }
  ],
  "pagination": { ... }
}
```

---

### GET /api/peer-sessions/:id
**Description**: Get peer session details

**Auth**: Required (must be participant)

**Response**: `200 OK`
```json
{
  "data": {
    "id": "session_xxx",
    "title": "React Tutoring",
    "description": "One-on-one React session",
    "sessionStatus": "UPCOMING",
    "date": "2024-01-15T10:00:00.000Z",
    "duration": 60,
    "gmeetLink": "https://meet.google.com/...",
    "requestedBy": { ... },
    "requestedTo": { ... },
    "skills": [ ... ],
    "payment": { ... }
  }
}
```

---

### POST /api/peer-sessions
**Description**: Request a peer session

**Auth**: Required

**Request Body**:
```json
{
  "title": "React Tutoring",
  "description": "One-on-one React session",
  "requestedToId": "user_yyy",
  "date": "2024-01-15T10:00:00.000Z",
  "duration": 60,
  "skillIds": ["skill_xxx"]
}
```

**Response**: `201 Created`
```json
{
  "data": {
    "id": "session_xxx",
    "title": "React Tutoring",
    "sessionStatus": "PENDING",
    ...
  }
}
```

---

### PATCH /api/peer-sessions/:id/status
**Description**: Update peer session status

**Auth**: Required (must be participant)

**Request Body**:
```json
{
  "status": "UPCOMING"  // or "ONGOING", "DONE", "CANCELLED"
}
```

**Response**: `200 OK`
```json
{
  "data": {
    "id": "session_xxx",
    "sessionStatus": "UPCOMING",
    ...
  }
}
```

---

## Reviews

### GET /api/reviews
**Description**: Get reviews with filtering

**Auth**: Not required

**Query Parameters**:
- `userId` (optional): Filter by reviewed user
- `sessionId` (optional): Filter by session
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "review_xxx",
      "rating": 5,
      "review": "Great session!",
      "reviewer": {
        "id": "user_xxx",
        "name": "Alice",
        "avatar": "https://..."
      },
      "reviewee": {
        "id": "user_yyy",
        "name": "Bob",
        "avatar": "https://..."
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": { ... }
}
```

---

### POST /api/reviews
**Description**: Create a review

**Auth**: Required

**Request Body**:
```json
{
  "rating": 5,
  "review": "Great session!",
  "revieweeId": "user_yyy",
  "peerSessionId": "session_xxx"  // or "studyRoomId"
}
```

**Response**: `201 Created`
```json
{
  "data": {
    "id": "review_xxx",
    "rating": 5,
    "review": "Great session!",
    ...
  }
}
```

---

### GET /api/sessions/:id/reviews
**Description**: Get reviews for a session

**Auth**: Not required

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "review_xxx",
      "rating": 5,
      "review": "Great session!",
      "reviewer": { ... },
      ...
    }
  ]
}
```

---

## Notifications

### GET /api/notifications
**Description**: Get user's notifications

**Auth**: Required

**Query Parameters**:
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**: `200 OK`
```json
{
  "data": [
    {
      "id": "notif_xxx",
      "notifType": "NORMAL",
      "message": "You have a new session request",
      "viewed": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "actionType": "SESSION_REQUEST",
      "actionData": "{\"sessionId\":\"session_xxx\"}",
      "peerSessionId": "session_xxx"
    }
  ],
  "pagination": { ... },
  "unreadCount": 5
}
```

---

### PATCH /api/notifications/:id/read
**Description**: Mark notification as read

**Auth**: Required

**Response**: `200 OK`
```json
{
  "data": {
    "id": "notif_xxx",
    "viewed": true,
    ...
  }
}
```

---

### PATCH /api/notifications/read-all
**Description**: Mark all notifications as read

**Auth**: Required

**Response**: `200 OK`
```json
{
  "data": {
    "message": "All notifications marked as read"
  }
}
```

---

## Browse

### GET /api/browse
**Description**: Browse peers or study rooms

**Auth**: Not required

**Query Parameters**:
- `tab` (required): `peers` or `studyRooms`
- `skillIds` (optional): Comma-separated skill IDs
- `search` (optional): Search query
- `page` (optional): Page number
- `limit` (optional): Items per page

**Response**: `200 OK`
```json
{
  "data": [
    // Peers or study rooms based on tab
  ],
  "pagination": { ... }
}
```

---

## Dashboard

### GET /api/dashboard
**Description**: Get dashboard data for current user

**Auth**: Required

**Query Parameters**:
- `include` (optional): Comma-separated list: `metrics`, `pendingRequests`, `upcomingSessions`, `notifications`

**Response**: `200 OK`
```json
{
  "data": {
    "metrics": {
      "sessionsCompleted": 10,
      "coinsEarned": "500.00",
      "averageRating": 4.5,
      "reviewCount": 8
    },
    "pendingRequests": [ ... ],
    "upcomingSessions": [ ... ],
    "recentNotifications": [ ... ],
    "pendingReviewsCount": 2
  }
}
```

