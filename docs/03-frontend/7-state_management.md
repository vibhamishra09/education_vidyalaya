# State Management

## Global State (React Context)

### Notification Context (`contexts/notification-context.tsx`)

**Purpose**: Manage notification state globally  
**State**:
- `notifications`: Array of notifications
- `unreadCount`: Number of unread notifications
- `isLoading`: Loading state

**Methods**:
- `fetchNotifications()`: Fetch notifications from API
- `markAsRead(id)`: Mark notification as read
- `markAllAsRead()`: Mark all notifications as read
- `addNotification(notification)`: Add notification (for real-time)

**Usage**:
```tsx
const { notifications, unreadCount, markAsRead } = useNotificationContext();
```

**Provider**: Wraps app in `layout.tsx`

---

## Server State (React Query / TanStack Query)

### Query Keys Structure

Hierarchical query keys for organized caching:

```typescript
// Users
export const userKeys = {
  all: ['users'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
  skills: (id: string, type?: 'HAS' | 'WANTS') => 
    [...userKeys.detail(id), 'skills', type] as const,
};

// Peer Sessions
export const peerSessionKeys = {
  all: ['peerSessions'] as const,
  lists: () => [...peerSessionKeys.all, 'list'] as const,
  list: (filters) => [...peerSessionKeys.lists(), filters] as const,
  details: () => [...peerSessionKeys.all, 'detail'] as const,
  detail: (id: string) => [...peerSessionKeys.details(), id] as const,
};

// Study Rooms
export const studyRoomKeys = {
  all: ['studyRooms'] as const,
  lists: () => [...studyRoomKeys.all, 'list'] as const,
  list: (filters) => [...studyRoomKeys.lists(), filters] as const,
  details: () => [...studyRoomKeys.all, 'detail'] as const,
  detail: (id: string) => [...studyRoomKeys.details(), id] as const,
};
```

### Custom Hooks for Data Fetching

#### Users (`hooks/use-users.ts`)

**`useCurrentUser()`**:
- Fetches current authenticated user
- Query key: `userKeys.current()`
- Stale time: 5 minutes
- Enabled: Only when Clerk is loaded

**`useUserById(userId)`**:
- Fetches user by ID
- Query key: `userKeys.detail(userId)`
- Stale time: 5 minutes

**`useUpdateUserProfile()`**:
- Mutation to update user profile
- Invalidates: `userKeys.current()`
- Optimistic updates: Updates cache immediately

---

#### Peer Sessions (`hooks/use-peer-sessions.ts`)

**`usePeerSessions(filters)`**:
- Fetches list of peer sessions
- Query key: `peerSessionKeys.list(filters)`
- Stale time: 2 minutes
- Filters: status, requestedBy, requestedTo, page, limit

**`usePeerSessionDetails(sessionId)`**:
- Fetches session details
- Query key: `peerSessionKeys.detail(sessionId)`
- Stale time: 5 minutes

**`useRequestPeerSession()`**:
- Mutation to create session request
- Invalidates: `peerSessionKeys.lists()`
- On success: Redirects to dashboard

**`useUpdatePeerSessionStatus()`**:
- Mutation to update session status
- Invalidates: Session detail and lists
- Handles payment updates

---

#### Study Rooms (`hooks/use-study-rooms.ts`)

**`useStudyRooms(filters)`**:
- Fetches list of study rooms
- Query key: `studyRoomKeys.list(filters)`
- Stale time: 2 minutes
- Filters: skillIds, status, dateFrom, dateTo, search, page, limit

**`useStudyRoomDetails(roomId)`**:
- Fetches room details
- Query key: `studyRoomKeys.detail(roomId)`
- Stale time: 5 minutes

**`useCreateStudyRoom()`**:
- Mutation to create study room
- Invalidates: `studyRoomKeys.lists()`
- On success: Redirects to room page

**`useJoinStudyRoom()`**:
- Mutation to join study room
- Invalidates: Room detail and lists
- Updates participant count

---

#### Reviews (`hooks/use-reviews.ts`)

**`useReviews(filters)`**:
- Fetches reviews
- Query key: `reviewKeys.list(filters)`
- Filters: userId, sessionId, page, limit

**`useCreateReview()`**:
- Mutation to create review
- Invalidates: Review lists, user details (for rating update)
- Prevents duplicate reviews

---

#### Notifications (`hooks/use-notifications.ts`)

**`useNotifications(page, limit)`**:
- Fetches notifications
- Query key: `notificationKeys.list(page, limit)`
- Stale time: 0 (always fresh)

**`useMarkNotificationAsRead()`**:
- Mutation to mark notification as read
- Optimistic update: Updates cache immediately
- Invalidates: Notification list

**`useMarkAllNotificationsAsRead()`**:
- Mutation to mark all as read
- Optimistic update: Updates all notifications
- Invalidates: Notification list

---

### Caching Behavior

#### Stale Time Configuration

- **User Data**: 5 minutes (infrequent changes)
- **List Data**: 2 minutes (moderate changes)
- **Detail Data**: 5 minutes (infrequent changes)
- **Real-time Data**: 0 (always fresh - notifications)

#### Cache Invalidation Strategy

**After Mutations**:
```typescript
// Invalidate related queries
queryClient.invalidateQueries({ queryKey: userKeys.current() });
queryClient.invalidateQueries({ queryKey: peerSessionKeys.lists() });
```

**Optimistic Updates**:
```typescript
// Update cache immediately, rollback on error
queryClient.setQueryData(userKeys.current(), (old) => ({
  ...old,
  name: newName,
}));
```

**Refetch on Focus**:
- Enabled by default for most queries
- Disabled for user data (5 min stale time)
- Disabled for notifications (real-time updates)

---

## Local Component State

### useState Hook

**Usage**: Component-specific state that doesn't need to be shared

**Examples**:
```tsx
// Form inputs
const [title, setTitle] = useState('');

// UI toggles
const [isOpen, setIsOpen] = useState(false);

// Local filters
const [searchQuery, setSearchQuery] = useState('');

// Pagination
const [currentPage, setCurrentPage] = useState(1);
```

### useReducer Hook (Future)

For complex local state:
```tsx
const [state, dispatch] = useReducer(reducer, initialState);
```

---

## Rules: Where to Fetch Data

### Server Data → React Query
- All API data fetched via React Query hooks
- Located in `hooks/use-*.ts` files
- Automatic caching and refetching

### Global Client State → Context
- App-wide client state (notifications, theme)
- Located in `contexts/` directory
- Provided at app level

### Component State → useState
- Component-specific state (form inputs, UI toggles)
- Local to component
- Doesn't need to be shared

---

## Rules: Where to Store What

### User Data
- **Storage**: React Query cache
- **Hook**: `useCurrentUser()`, `useUserById()`
- **Stale Time**: 5 minutes
- **Invalidation**: On profile update

### Session Data
- **Storage**: React Query cache
- **Hook**: `usePeerSessions()`, `usePeerSessionDetails()`
- **Stale Time**: 2-5 minutes
- **Invalidation**: On status update, create, cancel

### Study Room Data
- **Storage**: React Query cache
- **Hook**: `useStudyRooms()`, `useStudyRoomDetails()`
- **Stale Time**: 2-5 minutes
- **Invalidation**: On create, join, update

### Notification Data
- **Storage**: React Query cache + Context
- **Hook**: `useNotifications()`, `useNotificationContext()`
- **Stale Time**: 0 (always fresh)
- **Invalidation**: On mark as read, new notification

### Form State
- **Storage**: Local component state (useState)
- **Location**: Inside form components
- **Persistence**: Not persisted (cleared on submit)

### UI State
- **Storage**: Local component state (useState)
- **Examples**: Modal open/close, dropdown open/close
- **Persistence**: Not persisted

---

## Rules: How to Invalidate Cache

### After Mutations

**Pattern**:
```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onSuccess: () => {
    // Invalidate related queries
    queryClient.invalidateQueries({ queryKey: ['relatedKey'] });
  },
});
```

**Examples**:
- Update user → Invalidate `userKeys.current()`
- Create session → Invalidate `peerSessionKeys.lists()`
- Update session → Invalidate session detail and lists
- Create review → Invalidate review lists and user details

### Optimistic Updates

**Pattern**:
```typescript
const mutation = useMutation({
  mutationFn: updateData,
  onMutate: async (newData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['key'] });
    
    // Snapshot previous value
    const previous = queryClient.getQueryData(['key']);
    
    // Optimistically update
    queryClient.setQueryData(['key'], newData);
    
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback on error
    queryClient.setQueryData(['key'], context.previous);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['key'] });
  },
});
```

---

## State Management Best Practices

1. **Use React Query for Server State**: All API data via React Query
2. **Use Context Sparingly**: Only for truly global client state
3. **Keep Local State Local**: Use useState for component-specific state
4. **Invalidate Related Queries**: After mutations, invalidate related data
5. **Optimistic Updates**: For better UX, update cache immediately
6. **Stale Time Configuration**: Set appropriate stale times per data type
7. **Error Handling**: Handle errors in queries and mutations
8. **Loading States**: Show loading skeletons during data fetch
9. **Cache Keys**: Use hierarchical query keys for organization
10. **Refetch Strategy**: Configure refetch on focus, reconnect appropriately

