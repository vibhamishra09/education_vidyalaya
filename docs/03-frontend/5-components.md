# Component Hierarchy & Responsibilities

## High-Level Component Tree

```
App (layout.tsx)
├── Navigation (layout/navigation.tsx)
│   ├── UserDropdown (layout/user-dropdown.tsx)
│   ├── NotificationDropdown (layout/notification-dropdown.tsx)
│   └── CoinDropdown (layout/coin-dropdown.tsx)
├── Page Content (varies by route)
│   ├── Cards/
│   │   ├── PeerCard (cards/peer-card.tsx)
│   │   ├── StudyRoomCard (cards/study-room-card.tsx)
│   │   ├── SessionRequestCard (cards/session-request-card.tsx)
│   │   └── ...
│   ├── Forms/
│   │   ├── ReviewForm (forms/review-form.tsx)
│   │   └── ...
│   ├── Sections/
│   │   ├── HeroSection (sections/hero.tsx)
│   │   └── ...
│   └── Modals/
│       └── EditProfileModal (modals/edit-profile-modal.tsx)
└── Footer (layout/footer.tsx)
```

## Layout Components

### Navigation (`components/layout/navigation.tsx`)
**Purpose**: Top navigation bar  
**Props**: None (uses hooks for user data)  
**Location**: `src/components/layout/navigation.tsx`  
**Features**:
- Logo and branding
- User menu dropdown
- Notification dropdown
- Coin balance display
- Mobile hamburger menu
- Responsive design

**Dependencies**:
- `useUser()` from Clerk
- `useNotificationContext()` for notifications
- `useCurrentUser()` for coin balance

---

### Footer (`components/layout/footer.tsx`)
**Purpose**: Footer with links and copyright  
**Props**: None  
**Location**: `src/components/layout/footer.tsx`  
**Features**:
- Footer links
- Social media links
- Copyright information

---

### Bottom Navigation (`components/layout/bottom-nav.tsx`)
**Purpose**: Mobile bottom navigation  
**Props**: None  
**Location**: `src/components/layout/bottom-nav.tsx`  
**Features**:
- Quick access to main pages
- Active route indication
- Mobile-only display

---

## Card Components

### PeerCard (`components/cards/peer-card.tsx`)
**Purpose**: Display peer information in browse/list  
**Props**:
```typescript
{
  peer: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    skills: Skill[];
    averageRating?: number;
    reviewCount?: number;
  };
  onRequestSession?: (peerId: string) => void;
}
```
**Location**: `src/components/cards/peer-card.tsx`  
**Features**:
- User avatar and name
- Skills display (HAS skills)
- Rating and review count
- Request session button
- Link to profile

---

### StudyRoomCard (`components/cards/study-room-card.tsx`)
**Purpose**: Display study room in browse/list  
**Props**:
```typescript
{
  status: 'live' | 'scheduled';
  category: string;
  title: string;
  description: string;
  participants: { current: number; max: number };
  host: { name: string; avatar?: string };
  date?: Date;
  duration?: number;
  onJoin?: () => void;
}
```
**Location**: `src/components/cards/study-room-card.tsx`  
**Features**:
- Room status badge
- Title and description
- Participant count
- Host information
- Date and duration
- Join button (if applicable)

---

### SessionRequestCard (`components/cards/session-request-card.tsx`)
**Purpose**: Display pending session request  
**Props**:
```typescript
{
  session: PeerSession;
  onAccept?: () => void;
  onReject?: () => void;
}
```
**Location**: `src/components/cards/session-request-card.tsx`  
**Features**:
- Session details
- Requester information
- Accept/Reject buttons
- Status badge

---

### UpcomingSessionCard (`components/cards/upcoming-session-card.tsx`)
**Purpose**: Display upcoming session  
**Props**:
```typescript
{
  session: PeerSession | StudyRoom;
  onJoin?: () => void;
  onCancel?: () => void;
}
```
**Location**: `src/components/cards/upcoming-session-card.tsx`  
**Features**:
- Session details
- Date and time
- Join/Cancel buttons
- Countdown timer (future)

---

### ReviewCard (`components/cards/review-card.tsx`)
**Purpose**: Display review/rating  
**Props**:
```typescript
{
  review: {
    id: string;
    rating: number;
    review: string;
    reviewer: { name: string; avatar?: string };
    createdAt: Date;
  };
}
```
**Location**: `src/components/cards/review-card.tsx`  
**Features**:
- Star rating display
- Review text
- Reviewer information
- Date

---

## Form Components

### ReviewForm (`components/forms/review-form.tsx`)
**Purpose**: Submit session review  
**Props**:
```typescript
{
  sessionId: string;
  sessionType: 'peerSession' | 'studyRoom';
  onSubmit: (data: ReviewData) => Promise<void>;
}
```
**Location**: `src/components/forms/review-form.tsx`  
**Features**:
- Star rating selector (1-5)
- Review text input
- Validation
- Submit button
- Error handling

---

## Section Components

### HeroSection (`components/sections/hero.tsx`)
**Purpose**: Landing page hero section  
**Props**: None  
**Location**: `src/components/sections/hero.tsx`  
**Features**:
- Value proposition
- Call-to-action buttons
- Animated background (optional)

---

## Modal Components

### EditProfileModal (`components/modals/edit-profile-modal.tsx`)
**Purpose**: Edit user profile  
**Props**:
```typescript
{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUserUpdate: (updatedUser: User) => void;
}
```
**Location**: `src/components/modals/edit-profile-modal.tsx`  
**Features**:
- Form fields (name, bio, avatar, location, school)
- Skills management (HAS/WANTS)
- Validation
- Save/Cancel buttons

---

## Feature Components

### ChatWidget (`components/chat/ChatWidget.tsx`)
**Purpose**: Chat interface for sessions  
**Props**:
```typescript
{
  channelId: string;
  userId: string;
}
```
**Location**: `src/components/chat/ChatWidget.tsx`  
**Features**:
- Message list
- Message input
- Real-time updates (future)
- User avatars

**Dependencies**:
- `MessageList` component
- `MessageInput` component

---

### VideoRoom (`components/livekit/VideoRoom.tsx`)
**Purpose**: LiveKit video/audio room  
**Props**:
```typescript
{
  roomName: string;
  token: string;
  onLeave?: () => void;
}
```
**Location**: `src/components/livekit/VideoRoom.tsx`  
**Features**:
- Video/audio controls
- Screen sharing
- Participant list
- Chat integration

**Dependencies**:
- LiveKit React components
- LiveKit client SDK

---

## UI Primitives (shadcn/ui)

### Button (`components/ui/button.tsx`)
**Purpose**: Reusable button component  
**Props**:
```typescript
{
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}
```
**Location**: `src/components/ui/button.tsx`

---

### Card (`components/ui/card.tsx`)
**Purpose**: Container component  
**Props**:
```typescript
{
  children: ReactNode;
  className?: string;
}
```
**Location**: `src/components/ui/card.tsx`

---

### Input (`components/ui/input.tsx`)
**Purpose**: Form input  
**Props**:
```typescript
{
  type?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
}
```
**Location**: `src/components/ui/input.tsx`

---

### Dialog (`components/ui/dialog.tsx`)
**Purpose**: Modal dialog  
**Props**:
```typescript
{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}
```
**Location**: `src/components/ui/dialog.tsx`

---

### Toast (`components/ui/toast.tsx`)
**Purpose**: Toast notifications  
**Usage**: Via `sonner` library  
**Location**: `src/components/ui/toast.tsx`

---

### Skeleton (`components/ui/skeleton.tsx`)
**Purpose**: Loading skeleton  
**Props**:
```typescript
{
  className?: string;
}
```
**Location**: `src/components/ui/skeleton.tsx`

---

## Component Communication Patterns

### Props Down
- Parent components pass data to children via props
- Example: `<PeerCard peer={peerData} />`

### Events Up
- Children notify parents via callback props
- Example: `<Form onSubmit={handleSubmit} />`

### Context for Global State
- Shared state via React Context
- Example: `useNotificationContext()`

### React Query for Server State
- Server data via React Query hooks
- Example: `const { data } = usePeerSessions();`

## Component Best Practices

1. **Single Responsibility**: Each component has one clear purpose
2. **Composition**: Build complex components from simple ones
3. **Reusability**: Extract reusable components
4. **Props Interface**: Define clear TypeScript interfaces for props
5. **Error Boundaries**: Wrap error-prone components
6. **Loading States**: Show loading skeletons during data fetch
7. **Empty States**: Handle empty data gracefully
8. **Accessibility**: Use semantic HTML and ARIA attributes

## Component Organization Rules

- **Layout Components**: Shared across pages (`layout/`)
- **Page Components**: Route-specific (`app/`)
- **Feature Components**: Complex features (`chat/`, `livekit/`)
- **UI Primitives**: Base components (`ui/`)
- **Card Components**: Reusable cards (`cards/`)
- **Form Components**: Form-related (`forms/`)
- **Section Components**: Page sections (`sections/`)

