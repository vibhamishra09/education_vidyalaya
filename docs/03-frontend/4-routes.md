# Frontend Routes

## Route Mapping

### Public Routes

#### GET `/`
**Component**: `src/app/page.tsx`  
**Purpose**: Landing page  
**Auth**: Public (redirects authenticated users to `/browse`)  
**Description**: Hero section, featured study rooms, debate rooms preview

---

#### GET `/sign-in`
**Component**: `src/app/sign-in/page.tsx`  
**Purpose**: User sign in  
**Auth**: Public  
**Description**: Clerk sign-in interface, redirects to dashboard after sign-in

---

#### GET `/sign-up`
**Component**: `src/app/sign-up/page.tsx`  
**Purpose**: User registration  
**Auth**: Public  
**Description**: Clerk sign-up interface, redirects to dashboard after sign-up

---

#### GET `/browse`
**Component**: `src/app/browse/page.tsx`  
**Purpose**: Browse peers and study rooms  
**Auth**: Public (enhanced for authenticated users)  
**Description**: Tabs for peers and study rooms, filtering, search, pagination

**Query Parameters**:
- `tab`: `peers` | `studyRooms` (default: `peers`)
- `search`: Search query string
- `skills`: Comma-separated skill names
- `page`: Page number (default: 1)

---

#### GET `/profile/[userId]`
**Component**: `src/app/profile/[userId]/page.tsx`  
**Purpose**: Public user profile  
**Auth**: Public  
**Description**: View user profile, skills, ratings, reviews, sessions history

**Dynamic Segments**:
- `userId`: User ID (CUID)

---

### Protected Routes (Authentication Required)

#### GET `/dashboard`
**Component**: `src/app/dashboard/page.tsx`  
**Purpose**: User dashboard  
**Auth**: Required  
**Role**: Any authenticated user  
**Description**: User metrics, pending requests, upcoming sessions, notifications

---

#### GET `/profile`
**Component**: `src/app/profile/page.tsx`  
**Purpose**: Own user profile  
**Auth**: Required  
**Role**: Own profile only  
**Description**: Edit profile, view metrics, earnings chart, sessions history

---

 ---

#### GET `/studyroom/[roomId]`
**Component**: `src/app/studyroom/[roomId]/page.tsx`  
**Purpose**: Study room details  
**Auth**: Required (for joining)  
**Role**: Any authenticated user  
**Description**: View room details, join room, view participants, join session

**Dynamic Segments**:
- `roomId`: Study room ID (CUID)

---

#### GET `/sessions/[sessionId]`
**Component**: `src/app/sessions/[sessionId]/page.tsx`  
**Purpose**: Peer session details  
**Auth**: Required  
**Role**: Session participant only  
**Description**: View session details, update status, join LiveKit room, chat

**Dynamic Segments**:
- `sessionId`: Peer session ID (CUID)

---

#### GET `/request-session/[userId]`
**Component**: `src/app/request-session/[userId]/page.tsx`  
**Purpose**: Request peer session  
**Auth**: Required  
**Role**: Any authenticated user  
**Description**: Form to request session with peer, preview coin cost

**Dynamic Segments**:
- `userId`: Target user ID (CUID)

---

#### GET `/create-study-room`
**Component**: `src/app/create-study-room/page.tsx`  
**Purpose**: Create study room  
**Auth**: Required  
**Role**: Any authenticated user  
**Description**: Form to create new study room

---

#### GET `/submit-review/[sessionId]`
**Component**: `src/app/submit-review/[sessionId]/page.tsx`  
**Purpose**: Submit session review  
**Auth**: Required  
**Role**: Session participant only  
**Description**: Form to rate and review completed session

**Dynamic Segments**:
- `sessionId`: Session ID (CUID)

---

#### GET `/chat`
**Component**: `src/app/chat/page.tsx`  
**Purpose**: Chat channels list  
**Auth**: Required  
**Role**: Any authenticated user  
**Description**: List of chat channels (direct messages, group chats)

---

#### GET `/chat/[channelId]`
**Component**: `src/app/chat/[channelId]/page.tsx`  
**Purpose**: Chat interface  
**Auth**: Required  
**Role**: Channel member only  
**Description**: Chat messages, send messages, real-time updates

**Dynamic Segments**:
- `channelId`: Channel ID (CUID)

---

## Route Protection

### Middleware (`src/middleware.ts`)

```typescript
// Protects routes based on authentication
export default clerkMiddleware((auth, req) => {
  // Public routes
  if (isPublicRoute(req.nextUrl.pathname)) {
    return;
  }
  
  // Protected routes require authentication
  auth().protect();
});
```

### Route Categories

#### Public Routes
- `/` (landing page)
- `/sign-in`
- `/sign-up`
- `/browse`
- `/profile/[userId]` (public profiles)

#### Protected Routes
- `/dashboard`
- `/profile` (own profile)
- `/studyroom/[roomId]`
- `/sessions/[sessionId]`
- `/request-session/[userId]`
- `/create-study-room`
- `/submit-review/[sessionId]`
- `/chat` and `/chat/[channelId]`

### Role-Based Access (Future)

Currently, all authenticated users have the same access. Future enhancements:
- **Admin Role**: Access to admin dashboard
- **Moderator Role**: Ability to moderate content
- **Premium Role**: Access to premium features

## Route Transitions

### Navigation Flow

```
Landing Page (/)
  ↓ (Sign Up)
Dashboard (/dashboard)
  ↓ (Browse)
Browse (/browse)
  ↓ (Select Peer)
Request Session (/request-session/[userId])
  ↓ (Submit)
Dashboard (/dashboard)
  ↓ (View Session)
Session Details (/sessions/[sessionId])
  ↓ (Complete)
Submit Review (/submit-review/[sessionId])
  ↓ (Submit)
Dashboard (/dashboard)
```

### Redirects

#### After Sign In
- Redirects to `/dashboard` (or previous page if exists)

#### After Sign Up
- Redirects to `/dashboard`

#### Unauthenticated Access to Protected Routes
- Redirects to `/sign-in` with return URL

#### Authenticated Access to Landing Page
- Redirects to `/browse`

## URL Structure Conventions

### Dynamic Segments
- Use `[param]` for single dynamic segments
- Use descriptive names: `[userId]`, `[sessionId]`, `[roomId]`, `[channelId]`

### Query Parameters
- Use for filtering, searching, pagination
- Examples: `?tab=peers&search=react&page=2`

### Hash Fragments
- Use for anchor links (e.g., `#features`, `#about`)

## Route Metadata

### Page Titles
- Set via Next.js metadata API
- Example: `export const metadata = { title: 'Dashboard' }`

### SEO Metadata
- Description, keywords, Open Graph tags
- Set per route in `layout.tsx` or `page.tsx`

## Error Handling

### 404 Not Found
- Custom 404 page: `src/app/not-found.tsx`

### Error Boundaries
- Route-level error handling: `src/app/error.tsx`
- Component-level error boundaries

### Loading States
- Route-level loading: `src/app/loading.tsx`
- Component-level loading skeletons

