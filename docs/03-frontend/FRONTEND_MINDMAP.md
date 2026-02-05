# Webyalaya Frontend Mind Map

> A comprehensive hierarchical visualization of the Webyalaya frontend architecture, components, and structure.

## Table of Contents

1. [Tech Stack & Foundation](#1-tech-stack--foundation)
2. [Project Structure](#2-project-structure)
3. [Routes & Pages](#3-routes--pages)
4. [Components Architecture](#4-components-architecture)
5. [State Management](#5-state-management)
6. [Custom Hooks](#6-custom-hooks)
7. [API Integration](#7-api-integration)
8. [Utilities & Helpers](#8-utilities--helpers)
9. [Key Features & Flows](#9-key-features--flows)
10. [Styling & Theming](#10-styling--theming)
11. [Performance Optimizations](#11-performance-optimizations)
12. [Development & Build](#12-development--build)

---

## 1. Tech Stack & Foundation

### 1.1 Framework & Core Libraries
- **Next.js 15** (App Router)
  - File-based routing
  - Server Components (default)
  - Client Components (`"use client"`)
  - Server Actions
  - Image optimization
  - Font optimization
- **React 19**
  - Latest React features
  - Concurrent rendering
  - Server Components support
- **TypeScript**
  - Full type safety
  - Type definitions in `src/types/`

### 1.2 UI Libraries
- **shadcn/ui** (Radix UI primitives)
  - Accessible component primitives
  - Customizable styling
  - Component location: `src/components/ui/`
- **Radix UI**
  - Dialog, Popover, Select, Switch, etc.
  - Unstyled, accessible components
- **Tailwind CSS 4**
  - Utility-first CSS framework
  - Custom configuration
  - Dark mode support

### 1.3 State Management
- **TanStack Query (React Query) v5**
  - Server state management
  - Caching and invalidation
  - Query keys hierarchy
  - Provider: `src/providers/query-provider.tsx`
- **React Context**
  - Global client state
  - Contexts: `src/contexts/`
- **Local State**
  - `useState` for component-specific state
  - `useReducer` for complex local state

### 1.4 Authentication
- **Clerk**
  - User authentication
  - Session management
  - Protected routes via middleware
  - Integration: `src/middleware.ts`

### 1.5 Real-time Communication
- **LiveKit**
  - WebRTC video/audio calls
  - Screen sharing
  - Components: `src/components/livekit/`
- **Socket.io Client**
  - Real-time chat
  - Debate room features
  - Hook: `src/hooks/use-debate-socket.ts`

### 1.6 Additional Libraries
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **Zod** - Schema validation
- **Axios** - HTTP client
- **Sonner** - Toast notifications
- **Lucide React** - Icons
- **React Markdown** - Markdown rendering
- **Canvas Confetti** - Achievement celebrations
- **Socket.io Client** - WebSocket communication

---

## 2. Project Structure

### 2.1 Root Directory
```
my-app/
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # Utilities and API clients
│   ├── contexts/         # React Context providers
│   ├── types/            # TypeScript definitions
│   ├── providers/        # App-level providers
│   └── middleware.ts     # Route protection
├── public/               # Static assets
├── package.json
└── next.config.ts
```

### 2.2 App Directory (`src/app/`)
- **Purpose**: Next.js App Router pages and layouts
- **Structure**:
  - `layout.tsx` - Root layout with providers
  - `page.tsx` - Landing page
  - Route folders for each page
  - `api/` - API routes (server actions)
  - Dynamic routes: `[param]/`

### 2.3 Components Directory (`src/components/`)
- **Layout Components**: `layout/`
- **Card Components**: `cards/`
- **Feature Components**: `chat/`, `livekit/`, `debate/`, `achievements/`
- **Form Components**: `forms/`
- **Dashboard Components**: `dashboard/`
- **Profile Components**: `profile/`
- **UI Primitives**: `ui/` (shadcn/ui)
- **PWA Components**: `pwa/`
- **Notification Components**: `notifications/`
- **Other**: `sections/`, `stats/`, `reviews/`, `availability/`, `feedback/`

### 2.4 Hooks Directory (`src/hooks/`)
- Data fetching hooks
- Feature-specific hooks
- Utility hooks
- Real-time hooks

### 2.5 Lib Directory (`src/lib/`)
- **API Client**: `api-client.ts`
- **API Modules**: `api/` (organized by feature)
- **Utilities**: `utils/` and `utils.ts`

### 2.6 Contexts Directory (`src/contexts/`)
- `notification-context.tsx` - Notification state
- `toast-context.tsx` - Toast notifications
- `achievement-notification-context.tsx` - Achievement notifications

### 2.7 Types Directory (`src/types/`)
- `api.types.ts` - API request/response types
- Other type definitions

### 2.8 Providers Directory (`src/providers/`)
- `query-provider.tsx` - React Query provider

### 2.9 Public Directory (`public/`)
- Static assets (images, icons, fonts)
- PWA manifest
- Favicon and app icons

---

## 3. Routes & Pages

### 3.1 Public Routes

#### Landing Page (`/`)
- **File**: `src/app/page.tsx`
- **Client Component**: `src/app/home-client.tsx`
- **Features**:
  - Hero section
  - Trending study rooms
  - Platform stats
  - Call-to-action buttons
- **Auth**: Public (redirects authenticated users to `/browse`)

#### Sign In (`/sign-in`)
- **File**: `src/app/sign-in/page.tsx`
- **Features**: Clerk sign-in interface
- **Redirect**: To dashboard after sign-in

#### Sign Up (`/sign-up`)
- **File**: `src/app/sign-up/page.tsx`
- **Features**: Clerk sign-up interface
- **Redirect**: To onboarding after sign-up

#### Browse (`/browse`)
- **File**: `src/app/browse/page.tsx`
- **Client Component**: `src/app/browse/browse-client.tsx`
- **Features**:
  - Tabs: Peers and Study Rooms
  - Search and filtering
  - Skill-based filtering
  - Pagination
- **Query Parameters**: `tab`, `search`, `skills`, `page`

#### Public Profile (`/profile/[userId]`)
- **File**: `src/app/profile/[userId]/page.tsx`
- **Layout**: `src/app/profile/[userId]/layout.tsx`
- **Features**:
  - User profile view
  - Skills display
  - Ratings and reviews
  - Session history
- **Auth**: Public

#### Static Pages
- `/about` - About page
- `/how-it-works` - How it works page
- `/privacy-policy` - Privacy policy
- `/terms-of-use` - Terms of use
- `/offline` - Offline page

### 3.2 Protected Routes

#### Dashboard (`/dashboard`)
- **File**: `src/app/dashboard/page.tsx`
- **Client Component**: `src/app/dashboard/dashboard-client.tsx`
- **Features**:
  - User metrics
  - Pending requests (received/sent)
  - Upcoming sessions
  - Past sessions
  - Calendar widget
  - Quick actions
  - Achievements showcase
  - Streak tracker
- **Auth**: Required

#### Own Profile (`/profile`)
- **File**: `src/app/profile/page.tsx`
- **Client Component**: `src/app/profile/profile-client.tsx`
- **Features**:
  - Edit profile
  - View metrics
  - Earnings chart
  - Sessions history
  - Wallet tab
  - Availability settings
- **Auth**: Required (own profile only)

#### Onboarding (`/onboarding`)
- **File**: `src/app/onboarding/page.tsx`
- **Client Component**: `src/app/onboarding/onboarding-client.tsx`
- **Layout**: `src/app/onboarding/layout.tsx`
- **Features**:
  - Multi-step onboarding
  - Step 1: Basic information
  - Step 2: Skills I have
  - Step 3: Skills I want
- **Auth**: Required (new users)

#### Study Room Details (`/studyroom/[roomId]`)
- **File**: `src/app/studyroom/[roomId]/page.tsx`
- **Client Component**: `src/app/studyroom/[roomId]/study-room-client.tsx`
- **Features**:
  - Room details
  - Join room
  - View participants
  - Join session (LiveKit)
- **Auth**: Required (for joining)

#### Peer Session Details (`/sessions/[sessionId]`)
- **File**: `src/app/sessions/[sessionId]/page.tsx`
- **Layout**: `src/app/sessions/[sessionId]/layout.tsx`
- **Features**:
  - Session details
  - Update status
  - Join LiveKit room
  - Chat integration
- **Auth**: Required (session participant only)

#### Request Session (`/request-session/[userId]`)
- **File**: `src/app/request-session/[userId]/page.tsx`
- **Features**:
  - Session request form
  - Date/time picker
  - Duration selector
  - Skills selection
  - Coin cost preview
- **Auth**: Required

#### Create Study Room (`/create-study-room`)
- **File**: `src/app/create-study-room/page.tsx`
- **Client Component**: `src/app/create-study-room/create-study-room-client.tsx`
- **Features**:
  - Study room creation form
  - Date/time picker
  - Participant limit
  - Joining fee
  - Skills selection
- **Auth**: Required

#### Submit Review (`/submit-review/[sessionId]`)
- **File**: `src/app/submit-review/[sessionId]/page.tsx`
- **Features**:
  - Review form
  - Star rating
  - Review text
- **Auth**: Required (session participant only)

#### Session Feedback (`/session-feedback/[sessionId]`)
- **File**: `src/app/(protected)/session-feedback/[sessionId]/page.tsx`
- **Features**: Post-session feedback form

#### Chat (`/chat`)
- **File**: `src/app/chat/page.tsx`
- **Features**: Chat channels list
- **Auth**: Required

#### Chat Channel (`/chat/[channelId]`)
- **File**: `src/app/chat/[channelId]/page.tsx`
- **Layout**: `src/app/chat/[channelId]/layout.tsx`
- **Features**: Chat interface with messages
- **Auth**: Required (channel member only)

#### Debate Rooms (`/debate-rooms`)
- **File**: `src/app/debate-rooms/page.tsx`
- **Features**: Debate rooms list
- **Auth**: Required

#### Debate Room Live (`/debate-rooms/[roomId]`)
- **File**: `src/app/debate-rooms/[roomId]/page.tsx`
- **Client Components**:
  - `src/app/debate-rooms/[roomId]/debate-live-room.tsx`
  - `src/app/debate-rooms/[roomId]/debate-room-client.tsx`
- **Features**: Live debate room with video, chat, buzzer
- **Auth**: Required

#### Rooms (`/rooms/[room]`)
- **File**: `src/app/rooms/[room]/page.tsx`
- **Layout**: `src/app/rooms/layout.tsx`
- **Features**: Generic room page for LiveKit sessions
  - Supports both study rooms and peer sessions
  - Room name format: `studyroom-{id}` or `peersession-{id}`
  - LiveKit video room integration
  - Session data fetching
  - Host detection
  - Session ended handling
- **Auth**: Required

#### Notifications (`/notifications`)
- **File**: `src/app/notifications/page.tsx`
- **Client Component**: `src/app/notifications/notifications-client.tsx`
- **Features**: Notifications list and management
- **Auth**: Required

### 3.3 API Routes (`src/app/api/`)

#### OG Image Generation
- `src/app/api/og/studyroom/[roomId]/route.tsx`
- Generates Open Graph images for study rooms

#### Skills API
- `src/app/api/skills/route.ts`
- Server action for skills

#### User Onboarding
- `src/app/api/user/onboarding/route.ts`
- Handles onboarding completion

#### Webhooks
- `src/app/api/webhooks/clerk/route.ts`
- Clerk webhook handler

### 3.4 Route Protection

#### Middleware (`src/middleware.ts`)
- **Purpose**: Route protection and onboarding checks
- **Features**:
  - Public route detection
  - Authentication checks
  - Onboarding completion checks
  - Redirects for incomplete onboarding
- **Public Routes**: `/`, `/sign-in`, `/sign-up`, `/browse`, `/how-it-works`, `/about`
- **Protected Routes**: All others require authentication
- **Onboarding**: Redirects incomplete users to `/onboarding`

---

## 4. Components Architecture

### 4.1 Layout Components (`src/components/layout/`)

#### Navigation (`navigation.tsx`)
- **Purpose**: Top navigation bar
- **Features**:
  - Logo and branding
  - User menu dropdown
  - Notification dropdown
  - Coin balance display
  - Mobile hamburger menu
- **Dependencies**: Clerk `useUser()`, notification context

#### Footer (`footer.tsx`)
- **Purpose**: Footer with links and copyright
- **Features**: Footer links, social media links

#### Bottom Navigation (`bottom-nav.tsx`)
- **Purpose**: Mobile bottom navigation
- **Features**: Quick access to main pages, active route indication

#### User Dropdown (`user-dropdown.tsx`)
- **Purpose**: User menu dropdown
- **Features**: Profile link, settings, sign out

#### Notification Dropdown (`notification-dropdown.tsx`)
- **Purpose**: Notification dropdown menu
- **Features**: Notification list, mark as read, view all

#### Coin Dropdown (`coin-dropdown.tsx`)
- **Purpose**: Coin balance display
- **Features**: Current balance, transaction history link

### 4.2 Card Components (`src/components/cards/`)

#### PeerCard (`peer-card.tsx`)
- **Purpose**: Display peer in browse/list
- **Props**: Peer data, onRequestSession callback
- **Features**: Avatar, name, skills, rating, request button

#### StudyRoomCard (`study-room-card.tsx`)
- **Purpose**: Display study room in lists
- **Props**: Room data, onJoin callback
- **Features**: Status badge, title, participants, host info, date

#### StudyRoomCardBrowse (`study-room-card-browse.tsx`)
- **Purpose**: Study room card for browse page
- **Features**: Optimized for browse view

#### SessionRequestCard (`session-request-card.tsx`)
- **Purpose**: Display pending session request
- **Props**: Session data, onAccept, onReject callbacks
- **Features**: Session details, requester info, action buttons

#### UpcomingSessionCard (`upcoming-session-card.tsx`)
- **Purpose**: Display upcoming session
- **Props**: Session data, onJoin, onCancel callbacks
- **Features**: Session details, date/time, action buttons

#### ReviewCard (`review-card.tsx`)
- **Purpose**: Display review/rating
- **Props**: Review data
- **Features**: Star rating, review text, reviewer info, date

#### MetricCard (`metric-card.tsx`)
- **Purpose**: Display dashboard metric
- **Props**: Metric data (name, value, description, icon)
- **Features**: Icon, value, description

#### DebateRoomCard (`debate-room-card.tsx`)
- **Purpose**: Display debate room
- **Props**: Debate room data
- **Features**: Room info, participant count, join button

### 4.3 Feature Components

#### Chat Components (`src/components/chat/`)

##### ChatWidget (`ChatWidget.tsx`)
- **Purpose**: Chat interface for sessions
- **Props**: channelId, userId
- **Features**: Message list, message input, real-time updates

##### MessageList (`MessageList.tsx`)
- **Purpose**: Display chat messages
- **Features**: Message rendering, scroll to bottom, user avatars

##### MessageInput (`MessageInput.tsx`)
- **Purpose**: Message input field
- **Features**: Text input, send button, emoji support

##### ChannelList (`ChannelList.tsx`)
- **Purpose**: List of chat channels
- **Features**: Channel list, unread indicators

#### LiveKit Components (`src/components/livekit/`)

##### EnhancedVideoRoom (`EnhancedVideoRoom.tsx`)
- **Purpose**: Enhanced LiveKit video room
- **Features**:
  - Video/audio controls
  - Screen sharing
  - Participant management
  - Chat integration
  - Session timer
  - Moderation features

##### VideoRoom (`VideoRoom.tsx`)
- **Purpose**: Basic LiveKit video room
- **Features**: Video/audio, screen sharing, participant list

#### Debate Components (`src/components/debate/`)

##### DebateBuzzer (`debate-buzzer.tsx`)
- **Purpose**: Buzzer for debate turns
- **Features**: Buzzer button, turn management

##### DebateResults (`debate-results.tsx`)
- **Purpose**: Display debate results
- **Features**: Results display, winner announcement

##### DebateTeamsDisplay (`debate-teams-display.tsx`)
- **Purpose**: Display debate teams
- **Features**: Team members, team assignments

##### DebateTeamChat (`debate-team-chat.tsx`)
- **Purpose**: Team-specific chat
- **Features**: Team chat interface

##### DebateTurnTimer (`debate-turn-timer.tsx`)
- **Purpose**: Timer for debate turns
- **Features**: Countdown timer, turn notifications

#### Achievement Components (`src/components/achievements/`)

##### AchievementBadge (`achievement-badge.tsx`)
- **Purpose**: Display achievement badge
- **Props**: Achievement data
- **Features**: Icon, title, rarity indicator

##### AchievementShowcase (`achievement-showcase.tsx`)
- **Purpose**: Display achievements list
- **Features**: Unlocked and in-progress achievements

##### AchievementShowcaseConnected (`achievement-showcase-connected.tsx`)
- **Purpose**: Connected achievement showcase with data fetching
- **Features**: Fetches and displays user achievements

##### AchievementProgress (`achievement-progress.tsx`)
- **Purpose**: Display achievement progress
- **Features**: Progress bar, current/target values

##### AchievementUnlockPopup (`achievement-unlock-popup.tsx`)
- **Purpose**: Popup when achievement is unlocked
- **Features**: Celebration animation, achievement details

### 4.4 Form Components (`src/components/forms/`)

#### ReviewForm (`review-form.tsx`)
- **Purpose**: Submit session review
- **Props**: sessionId, sessionType, onSubmit
- **Features**: Star rating, review text, validation

### 4.5 Dashboard Components (`src/components/dashboard/`)

#### CalendarWidget (`calendar-widget.tsx`)
- **Purpose**: Calendar view of sessions
- **Features**: Monthly calendar, session markers

#### EnhancedCalendarWidget (`enhanced-calendar-widget.tsx`)
- **Purpose**: Enhanced calendar with more features
- **Features**: Advanced calendar view, session details

#### CoinWidget (`coin-widget.tsx`)
- **Purpose**: Coin balance widget
- **Features**: Current balance, quick actions

#### QuickActions (`quick-actions.tsx`)
- **Purpose**: Quick action buttons
- **Features**: Create room, browse, request session

#### SessionList (`session-list.tsx`)
- **Purpose**: List of sessions
- **Features**: Upcoming and past sessions, pagination

#### SessionSummaryModal (`session-summary-modal.tsx`)
- **Purpose**: Session summary modal
- **Features**: Session details, actions

#### SkillsAndSuggestions (`skills-and-suggestions.tsx`)
- **Purpose**: Skills display and suggestions
- **Features**: User skills, suggestions

#### TimezoneSelector (`timezone-selector.tsx`)
- **Purpose**: Timezone selection
- **Features**: Timezone dropdown, auto-detect

#### MessagingPlaceholder (`messaging-placeholder.tsx`)
- **Purpose**: Placeholder for messaging feature
- **Features**: Coming soon message

### 4.6 Profile Components (`src/components/profile/`)

#### EditProfileModal (`src/components/modals/edit-profile-modal.tsx`)
- **Purpose**: Edit user profile
- **Props**: isOpen, onClose, user, onUserUpdate
- **Features**: Form fields, skills management, validation

#### WalletTab (`wallet-tab.tsx`)
- **Purpose**: Wallet/transaction history
- **Features**: Transaction list, balance, filters

#### SessionsTab (`sessions-tab.tsx`)
- **Purpose**: User sessions tab
- **Features**: Session history, filters

#### AvailabilitySettings (`availability-settings.tsx`)
- **Purpose**: Availability calendar settings
- **Features**: Calendar view, time slot management

#### StreakTracker (`streak-tracker.tsx`)
- **Purpose**: Display learning streak
- **Features**: Current streak, longest streak, calendar

#### StreakTrackerConnected (`streak-tracker-connected.tsx`)
- **Purpose**: Connected streak tracker with data
- **Features**: Fetches and displays streak data

### 4.7 UI Primitives (`src/components/ui/`)

#### Core Components (shadcn/ui)
- **Button** (`button.tsx`) - Reusable button component
- **Card** (`card.tsx`) - Container component
- **Input** (`input.tsx`) - Form input
- **Textarea** (`textarea.tsx`) - Text area input
- **Dialog** (`dialog.tsx`) - Modal dialog
- **AlertDialog** (`alert-dialog.tsx`) - Confirmation dialog
- **Toast** (`toast.tsx`) - Toast notifications (via Sonner)
- **Skeleton** (`skeleton.tsx`) - Loading skeleton
- **Badge** (`badge.tsx`) - Badge component
- **Avatar** (`avatar.tsx`) - User avatar
- **Tabs** (`tabs.tsx`) - Tab component
- **Select** (`select.tsx`) - Dropdown select
- **Switch** (`switch.tsx`) - Toggle switch
- **Popover** (`popover.tsx`) - Popover component
- **Progress** (`progress.tsx`) - Progress bar
- **ScrollArea** (`scroll-area.tsx`) - Scrollable area
- **Label** (`label.tsx`) - Form label

#### Custom UI Components
- **SkillSearch** (`skill-search.tsx`) - Skill search component
- **SkillInput** (`skill-input.tsx`) - Skill input with autocomplete
- **SocialLinksDisplay** (`social-links-display.tsx`) - Social links display
- **FloatingActionButtons** (`floating-action-buttons.tsx`) - Floating action buttons
- **BackgroundGradient** (`background-gradient.tsx`) - Background gradient
- **FadeIn** (`fade-in.tsx`) - Fade-in animation wrapper
- **Globe** (`globe.tsx`) - 3D globe component

### 4.8 PWA Components (`src/components/pwa/`)

#### ServiceWorkerRegistration (`service-worker-registration.tsx`)
- **Purpose**: Register service worker
- **Features**: Service worker registration, update detection

#### InstallPrompt (`install-prompt.tsx`)
- **Purpose**: PWA install prompt
- **Features**: Install button, beforeinstallprompt handling

#### UpdateNotification (`update-notification.tsx`)
- **Purpose**: Notify about app updates
- **Features**: Update available notification, reload button

### 4.9 Notification Components (`src/components/notifications/`)

#### PushNotificationPrompt (`push-notification-prompt.tsx`)
- **Purpose**: Prompt for push notification permission
- **Features**: Permission request, settings link

#### PushNotificationListener (`push-notification-listener.tsx`)
- **Purpose**: Listen for push notifications
- **Features**: Notification handling, click actions

#### PushNotificationSettings (`push-notification-settings.tsx`)
- **Purpose**: Push notification settings
- **Features**: Enable/disable, preferences

#### NotificationToast (`notification-toast.tsx`)
- **Purpose**: Toast notification display
- **Features**: Notification rendering, actions

### 4.10 Study Room Components (`src/components/study-room/`)

#### SessionEndWarningDialog (`session-end-warning-dialog.tsx`)
- **Purpose**: Warn before session ends
- **Features**: Time warning, extension option

#### EndMeetingDialog (`end-meeting-dialog.tsx`)
- **Purpose**: End meeting confirmation
- **Features**: Confirmation dialog, actions

#### ExtensionRequestDialog (`extension-request-dialog.tsx`)
- **Purpose**: Request session extension
- **Features**: Extension request form

#### SessionEndedDialog (`session-ended-dialog.tsx`)
- **Purpose**: Session ended notification
- **Features**: End message, next steps

### 4.11 Stats Components (`src/components/stats/`)

#### SessionsChart (`sessions-chart.tsx`)
- **Purpose**: Sessions statistics chart
- **Features**: Line/bar chart, time range selection

#### SessionsChartComponent (`sessions-chart-component.tsx`)
- **Purpose**: Reusable sessions chart component
- **Features**: Chart rendering, data formatting

#### ProfileStatsChart (`profile-stats-chart.tsx`)
- **Purpose**: Profile statistics chart
- **Features**: User stats visualization

#### WalletChart (`wallet-chart.tsx`)
- **Purpose**: Wallet/earnings chart
- **Features**: Earnings over time, filters

#### ChartContainer (`chart-container.tsx`)
- **Purpose**: Chart container wrapper
- **Features**: Responsive container, loading states

### 4.12 Section Components (`src/components/sections/`)

#### HeroSection (`hero.tsx`)
- **Purpose**: Landing page hero section
- **Features**: Value proposition, CTA buttons, animations

#### PlatformStats (`platform-stats.tsx`)
- **Purpose**: Platform statistics display
- **Features**: Stats cards, animations

#### TestimonialsSlider (`testimonials-slider.tsx`)
- **Purpose**: Testimonials carousel
- **Features**: Slider, testimonials display

### 4.13 Other Components

#### Reviews (`src/components/reviews/`)
- **ReviewsSection** (`reviews-section.tsx`) - Reviews list
- **UserReviewStats** (`user-review-stats.tsx`) - Review statistics

#### Availability (`src/components/availability/`)
- **AvailabilityCalendar** (`availability-calendar.tsx`) - Basic availability calendar
- **ImprovedAvailabilityCalendar** (`improved-availability-calendar.tsx`) - Enhanced calendar

#### Feedback (`src/components/feedback/`)
- **FeedbackForm** (`feedback-form.tsx`) - General feedback form
- **SessionFeedbackForm** (`session-feedback-form.tsx`) - Session-specific feedback
- **FeedbackWidget** (`feedback-widget.tsx`) - Feedback widget
- **FeedbackIntegrationExample** (`feedback-integration-example.tsx`) - Integration example

#### How It Works (`src/components/how-it-works/`)
- **ClientPage** (`client-page.tsx`) - How it works page content

#### Share (`src/components/share/`)
- **ShareButton** (`share-button.tsx`) - Share functionality

#### Auth (`src/components/auth/`)
- **HiddenSignInButton** (`hidden-sign-in-button.tsx`) - Hidden sign-in button for testing

---

## 5. State Management

### 5.1 React Query (Server State)

#### Query Client Configuration
- **Provider**: `src/providers/query-provider.tsx`
- **Default Options**:
  - Stale time: 1 minute
  - Retry: 1 attempt
  - Refetch on window focus: false

#### Query Keys Structure
Hierarchical query keys for organized caching:

```typescript
// Users
userKeys = {
  all: ['users'],
  current: () => ['users', 'current'],
  detail: (id) => ['users', 'detail', id],
  skills: (id, type) => ['users', 'detail', id, 'skills', type]
}

// Peer Sessions
peerSessionKeys = {
  all: ['peerSessions'],
  lists: () => ['peerSessions', 'list'],
  list: (filters) => ['peerSessions', 'list', filters],
  details: () => ['peerSessions', 'detail'],
  detail: (id) => ['peerSessions', 'detail', id]
}

// Study Rooms
studyRoomKeys = {
  all: ['studyRooms'],
  lists: () => ['studyRooms', 'list'],
  list: (filters) => ['studyRooms', 'list', filters],
  details: () => ['studyRooms', 'detail'],
  detail: (id) => ['studyRooms', 'detail', id]
}
```

#### Caching Strategy
- **User Data**: 5 minutes stale time
- **List Data**: 2 minutes stale time
- **Detail Data**: 5 minutes stale time
- **Real-time Data**: 0 stale time (notifications)

#### Cache Invalidation
- After mutations, invalidate related queries
- Optimistic updates for better UX
- Refetch on reconnect

### 5.2 React Context (Global Client State)

#### NotificationContext (`src/contexts/notification-context.tsx`)
- **State**:
  - `notifications`: Array of notifications
  - `unreadCount`: Number of unread
  - `isLoading`: Loading state
  - `hasMore`: Pagination flag
- **Methods**:
  - `fetchNotifications()`: Fetch from API
  - `markAsRead(id)`: Mark notification as read
  - `markAllAsRead()`: Mark all as read
  - `addNotification(notification)`: Add notification (real-time)
- **Provider**: Wraps app in `layout.tsx`
- **Auto-refetch**: Every 30 seconds when signed in

#### ToastContext (`src/contexts/toast-context.tsx`)
- **State**: Array of toasts
- **Methods**:
  - `showToast()`: Show custom toast
  - `showSuccess()`: Show success toast
  - `showError()`: Show error toast
  - `showWarning()`: Show warning toast
  - `showInfo()`: Show info toast
- **Provider**: Wraps app in `layout.tsx`

#### AchievementNotificationContext (`src/contexts/achievement-notification-context.tsx`)
- **Purpose**: Handle achievement unlock notifications
- **Features**: Achievement popup, celebration animations

### 5.3 Local Component State
- **useState**: For form inputs, UI toggles, local filters
- **useReducer**: For complex local state (future use)

---

## 6. Custom Hooks

### 6.1 Data Fetching Hooks

#### Users (`src/hooks/use-users.ts`)
- **useCurrentUser()**: Fetch current authenticated user
- **useUserById(userId)**: Fetch user by ID
- **useUpdateUserProfile()**: Update user profile mutation
- **useUserStats(userId)**: Fetch user statistics

#### Peer Sessions (`src/hooks/use-peer-sessions.ts`)
- **usePeerSessions(filters)**: Fetch list of peer sessions
- **usePeerSessionDetails(sessionId)**: Fetch session details
- **useRequestPeerSession()**: Create session request mutation
- **useUpdatePeerSessionStatus()**: Update session status mutation

#### Study Rooms (`src/hooks/use-study-rooms.ts`)
- **useStudyRooms(filters)**: Fetch list of study rooms
- **useStudyRoomDetails(roomId)**: Fetch room details
- **useCreateStudyRoom()**: Create study room mutation
- **useJoinStudyRoom()**: Join study room mutation

#### Reviews (`src/hooks/use-reviews.ts`)
- **useReviews(filters)**: Fetch reviews
- **useCreateReview()**: Create review mutation

#### Notifications (`src/hooks/use-notifications.ts`)
- **useNotifications(page, limit)**: Fetch notifications
- **useMarkNotificationAsRead()**: Mark as read mutation
- **useMarkAllNotificationsAsRead()**: Mark all as read mutation

### 6.2 Feature Hooks

#### Dashboard (`src/hooks/use-dashboard.ts`)
- **useDashboard(options)**: Fetch dashboard data
- **Options**: includeMetrics, includeRequests, includeSessions, etc.

#### Browse (`src/hooks/use-browse.ts`)
- **useBrowse(filters)**: Fetch browse data (peers and study rooms)
- **Filters**: tab, search, skills, pagination

#### Debate Rooms (`src/hooks/use-debate-rooms.ts`)
- **useDebateRooms()**: Fetch debate rooms
- **useDebateRoomDetails(roomId)**: Fetch debate room details
- **useCreateDebateRoom()**: Create debate room mutation
- **useJoinDebateRoom()**: Join debate room mutation

#### Achievements (`src/hooks/use-achievements.ts`)
- **useAchievements()**: Fetch user achievements
- **useUnlockAchievement()**: Unlock achievement mutation

#### Skills (`src/hooks/use-skills.ts`)
- **useSkills(search)**: Fetch skills with search
- **useCreateSkill()**: Create skill mutation

#### Streaks (`src/hooks/use-streaks.ts`)
- **useStreak()**: Fetch user streak data
- **useStreakHistory()**: Fetch streak history

#### Stats (`src/hooks/use-user-stats.ts`, `src/hooks/use-platform-stats.ts`)
- **useUserStats(userId)**: Fetch user statistics
- **usePlatformStats()**: Fetch platform statistics

### 6.3 Utility Hooks

#### Local Storage (`src/hooks/use-local-storage.ts`)
- **useLocalStorage(key, initialValue)**: Local storage hook
- **useTabPersistence(key, defaultValue, validValues)**: Tab state persistence

#### Authentication (`src/hooks/use-require-auth.ts`)
- **useRequireAuth()**: Require authentication hook
- **Features**: Redirect to sign-in if not authenticated

#### Session Timer (`src/hooks/use-session-timer.ts`)
- **useSessionTimer(startTime, duration)**: Session timer hook
- **Features**: Countdown, time remaining, elapsed time

#### Session Extension (`src/hooks/use-session-extension.ts`)
- **useSessionExtension()**: Request session extension
- **Features**: Extension request mutation

#### Session Moderation (`src/hooks/use-session-moderation.ts`)
- **useSessionModeration()**: Session moderation features
- **Features**: Moderation actions, reporting

### 6.4 Real-time Hooks

#### Debate Socket (`src/hooks/use-debate-socket.ts`)
- **useDebateSocket(roomId)**: Connect to debate room socket
- **Features**: Real-time updates, events handling

#### Push Notifications (`src/hooks/use-push-notifications.ts`)
- **usePushNotifications()**: Push notification management
- **Features**: Permission request, subscription, notifications

### 6.5 Specialized Hooks

#### Speech Recognition (`src/hooks/use-speech-recognition.ts`)
- **useSpeechRecognition()**: Browser speech recognition
- **Features**: Voice input, transcription

#### Feedback (`src/hooks/use-feedback.ts`)
- **useFeedback()**: Feedback submission
- **Features**: Submit feedback mutation

#### Transactions (`src/hooks/use-transactions.ts`)
- **useTransactions(filters)**: Fetch transaction history
- **Features**: Transaction list, filters, pagination

#### Profile Data (`src/hooks/use-profile-data.ts`)
- **useProfileData(userId)**: Fetch comprehensive profile data
- **Features**: User, stats, reviews, sessions

---

## 7. API Integration

### 7.1 API Client Setup

#### API Client (`src/lib/api-client.ts`)
- **Base**: Axios instance
- **Base URL**: `NEXT_PUBLIC_API_URL` or `http://localhost:3001`
- **Timeout**: 30 seconds
- **Interceptors**:
  - Request: Add Clerk auth token
  - Response: Error handling, format API errors
- **Methods**:
  - `setAuthToken(token)`: Manually set token
  - `clearAuthToken()`: Clear token
  - `getClerkToken()`: Get Clerk token
  - `getTokenFromAuth(auth)`: Get token from Clerk auth

### 7.2 API Modules (`src/lib/api/`)

#### Users API (`users.api.ts`)
- `getCurrentUser()`: Get current user
- `getUserById(userId)`: Get user by ID
- `updateUserProfile(data)`: Update user profile
- `getUserStats(userId)`: Get user statistics

#### Peer Sessions API (`peer-sessions.api.ts`)
- `getPeerSessions(filters)`: Get peer sessions list
- `getPeerSessionDetails(sessionId)`: Get session details
- `requestPeerSession(data)`: Create session request
- `updatePeerSessionStatus(sessionId, status)`: Update session status

#### Study Rooms API (`study-rooms.api.ts`)
- `getStudyRooms(filters)`: Get study rooms list
- `getStudyRoomDetails(roomId)`: Get room details
- `createStudyRoom(data)`: Create study room
- `joinStudyRoom(roomId)`: Join study room

#### Reviews API (`reviews.api.ts`)
- `getReviews(filters)`: Get reviews
- `createReview(data)`: Create review

#### Notifications API (`notifications.api.ts`)
- `getNotifications(page, limit)`: Get notifications
- `markNotificationAsRead(id)`: Mark as read
- `markAllNotificationsAsRead()`: Mark all as read
- `markNotificationsAsRead(ids)`: Mark multiple as read

#### Dashboard API (`dashboard.api.ts`)
- `getDashboard(options)`: Get dashboard data
- **Options**: includeMetrics, includeRequests, includeSessions, etc.

#### Browse API (`browse.api.ts`)
- `browse(filters)`: Browse peers and study rooms
- **Filters**: tab, search, skills, pagination

#### Skills API (`skills.api.ts`)
- `getSkills(search, pagination)`: Get skills
- `createSkill(data)`: Create skill

#### Achievements API (`achievements.api.ts`)
- `getAchievements()`: Get user achievements
- `unlockAchievement(achievementId)`: Unlock achievement

#### Debate Rooms API (`debate-rooms.api.ts`)
- `getDebateRooms()`: Get debate rooms
- `getDebateRoomDetails(roomId)`: Get debate room details
- `createDebateRoom(data)`: Create debate room
- `joinDebateRoom(roomId)`: Join debate room

#### Streaks API (`streaks.api.ts`)
- `getStreak()`: Get user streak
- `getStreakHistory()`: Get streak history

#### Stats API (`stats.api.ts`)
- `getUserStats(userId)`: Get user statistics
- `getPlatformStats()`: Get platform statistics

#### Availability API (`availability.api.ts`)
- `getAvailability(userId)`: Get user availability
- `updateAvailability(data)`: Update availability

#### Payments API (`payments.api.ts`)
- `getTransactionHistory(filters)`: Get transaction history

#### Feedback API (`feedback.api.ts`)
- `submitFeedback(data)`: Submit feedback
- `getFeedback(filters)`: Get feedback list

### 7.3 Error Handling

#### Error Types (`src/types/api.types.ts`)
- `ApiError`: Standard API error format
- Error codes: `UNAUTHORIZED`, `NETWORK_ERROR`, `REQUEST_ERROR`

#### Error Handling Patterns
- Request interceptor: Add auth token
- Response interceptor: Format errors, handle 401
- Component-level: Try-catch with user-friendly messages
- Toast notifications for errors

---

## 8. Utilities & Helpers

### 8.1 API Utils (`src/lib/utils/api-utils.ts`)
- Error handling utilities
- Response formatting
- Request helpers

### 8.2 Date/Time Utils (`src/lib/utils/date-time.ts`)
- Date formatting functions
- Timezone handling
- Time calculations

### 8.3 Coin Formatting (`src/lib/utils/coin-format.ts`)
- `formatCoins(amount)`: Format coin amounts
- Display utilities

### 8.4 Notification Utils (`src/lib/utils/notification-links.ts`)
- Generate notification action links
- Route helpers

### 8.5 Push Notification Utils (`src/lib/utils/push-notifications.ts`)
- Push notification helpers
- Subscription management

### 8.6 General Utils (`src/lib/utils.ts`)
- `cn(...inputs)`: Class name utility (clsx + tailwind-merge)
- Common helper functions

### 8.7 Upload Utils (`src/lib/upload.ts`)
- File upload utilities
- Image upload helpers

---

## 9. Key Features & Flows

### 9.1 Authentication Flow
1. User visits protected route
2. Middleware checks authentication
3. If not authenticated → redirect to `/sign-in`
4. After sign-in → redirect to dashboard or original route
5. Clerk manages session and tokens
6. API client adds token to requests

### 9.2 Onboarding Flow
1. New user signs up
2. Redirected to `/onboarding`
3. Step 1: Basic information (name, bio, avatar, location, school)
4. Step 2: Skills I have (teaching skills)
5. Step 3: Skills I want (learning skills)
6. Complete onboarding → mark as complete in Clerk metadata
7. Redirect to dashboard

### 9.3 Session Booking Flow
1. Browse peers at `/browse`
2. View peer profile at `/profile/[userId]`
3. Click "Request Session" → navigate to `/request-session/[userId]`
4. Fill session request form:
   - Title, description
   - Date and time
   - Duration
   - Skills
5. Preview coin cost
6. Submit request → creates peer session
7. Redirect to dashboard
8. Request appears in "Pending Requests"
9. Peer accepts/rejects request
10. If accepted → session appears in "Upcoming Sessions"

### 9.4 Study Room Creation & Joining
1. Navigate to `/create-study-room`
2. Fill study room form:
   - Title, description
   - Date and time
   - Duration
   - Max participants
   - Joining fee
   - Skills
3. Create room → redirect to `/studyroom/[roomId]`
4. Room appears in browse results
5. Other users can discover and join
6. Join room → added to participants
7. When room starts → join LiveKit session

### 9.5 Live Session Flow
1. View upcoming session at `/sessions/[sessionId]` or dashboard
2. When session time arrives → "Join Session" button active
3. Click "Join Session":
   - If LiveKit: Request token from backend → initialize LiveKit → join room
   - If Google Meet: Redirect to Google Meet URL
4. During session:
   - Video/audio controls
   - Screen sharing
   - Chat widget
   - Participant list
   - Session timer
5. Complete session → mark as done
6. Payment released to teacher
7. Review reminder notification sent

### 9.6 Chat System
1. Navigate to `/chat` → see channels list
2. Click channel → navigate to `/chat/[channelId]`
3. View messages in channel
4. Send messages
5. Real-time updates (future: WebSocket)

### 9.7 Debate Rooms
1. Navigate to `/debate-rooms` → see debate rooms list
2. Join or create debate room
3. Navigate to `/debate-rooms/[roomId]`
4. Features:
   - Video/audio (LiveKit)
   - Team assignments
   - Buzzer system for turns
   - Turn timer
   - Team chat
   - Debate results

### 9.8 Review & Rating System
1. After session completion → receive review reminder
2. Navigate to `/submit-review/[sessionId]`
3. Fill review form:
   - Star rating (1-5)
   - Review text
4. Submit review
5. Review appears on reviewee's profile
6. Reviewee's average rating updated

### 9.9 Achievement System
1. User performs actions (sessions, reviews, etc.)
2. Backend checks achievement criteria
3. Achievement unlocked → notification sent
4. Frontend receives notification
5. Achievement popup displayed
6. Achievement added to user's profile
7. Coin reward credited

### 9.10 Streak Tracking
1. User completes session
2. Backend updates streak
3. Frontend displays:
   - Current streak
   - Longest streak
   - Streak calendar
4. Streak displayed on dashboard and profile

### 9.11 Push Notifications
1. User grants notification permission
2. Service worker registered
3. Push subscription created
4. Backend sends push notifications
5. Frontend receives and displays notifications
6. Click notification → navigate to relevant page

### 9.12 PWA Features
1. Service worker registration
2. App manifest for install
3. Install prompt (beforeinstallprompt)
4. Update detection and notification
5. Offline support (future)

---

## 10. Styling & Theming

### 10.1 Tailwind CSS Configuration
- **Version**: Tailwind CSS 4
- **Configuration**: Custom theme
- **Utilities**: Custom utility classes

### 10.2 Custom Fonts
- **Inter**: Primary font (Google Fonts)
- **Harabara**: Custom font (`public/fonts/Harabara.ttf`)
- **Gotham**: Custom font (Light, Medium, Bold variants)
- **Configuration**: `src/app/layout.tsx`

### 10.3 Color Scheme & Design Tokens
- **Primary**: Green (#16a34a)
- **Theme Color**: #16a34a
- **Color Scheme**: Light (dark mode future)
- **Design System**: shadcn/ui tokens

### 10.4 Responsive Design Patterns
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Bottom navigation for mobile
- Desktop navigation for larger screens

### 10.5 Dark Mode Support
- **Status**: Future feature
- **Preparation**: Design tokens ready

---

## 11. Performance Optimizations

### 11.1 Code Splitting
- Automatic with Next.js
- Dynamic imports for large components
- Route-based code splitting

### 11.2 Image Optimization
- Next.js Image component
- Automatic optimization
- Lazy loading
- Responsive images

### 11.3 Font Optimization
- Next.js font optimization
- Preload critical fonts
- Font display: swap

### 11.4 Caching Strategies
- React Query caching
- Stale time configuration
- Cache invalidation patterns
- Browser caching for static assets

### 11.5 Lazy Loading
- Dynamic imports for heavy components
- Route-based lazy loading
- Component-level lazy loading

### 11.6 Bundle Optimization
- Tree shaking
- Minification
- Compression

---

## 12. Development & Build

### 12.1 Scripts (`package.json`)
- `pnpm dev`: Development server (Turbopack)
- `pnpm build`: Production build (Turbopack)
- `pnpm start`: Production server
- `pnpm lint`: ESLint
- `pnpm test`: Playwright tests
- `pnpm test:ui`: Playwright UI mode
- `pnpm test:headed`: Playwright headed mode

### 12.2 Environment Variables
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_LIVEKIT_URL`: LiveKit server URL
- `NEXT_PUBLIC_LIVEKIT_API_KEY`: LiveKit API key
- `NEXT_PUBLIC_LIVEKIT_API_SECRET`: LiveKit API secret
- `NEXT_PUBLIC_SITE_URL`: Site URL for SEO

### 12.3 Build Output Structure
- **Static Assets**: Optimized images, fonts
- **Server Components**: Rendered on server
- **Client Components**: Bundled for browser
- **API Routes**: Serverless functions
- **Static Pages**: Pre-rendered pages

### 12.4 Testing Setup
- **Framework**: Playwright
- **Test Files**: `tests/` directory
- **Test Types**:
  - API endpoint tests
  - Integration tests
  - Component tests
- **Commands**: See scripts section

### 12.5 Development Tools
- **React Query Devtools**: Development only
- **ESLint**: Code linting
- **TypeScript**: Type checking
- **Next.js Devtools**: Built-in devtools

---

## Related Documentation

- [Frontend Overview](./1-overview.md)
- [Frontend Requirements](./2-requirements.md)
- [Frontend Low-Level Design](./3-lld.md)
- [Frontend Routes](./4-routes.md)
- [Frontend Components](./5-components.md)
- [Frontend UI Flows](./6-ui_flows.md)
- [Frontend State Management](./7-state_management.md)

---

## Quick Reference

### Common File Paths
- **Root Layout**: `src/app/layout.tsx`
- **Middleware**: `src/middleware.ts`
- **API Client**: `src/lib/api-client.ts`
- **Types**: `src/types/api.types.ts`
- **Query Provider**: `src/providers/query-provider.tsx`

### Common Patterns
- **Server Component**: Default (no `"use client"`)
- **Client Component**: Add `"use client"` at top
- **Data Fetching**: Use React Query hooks
- **Form Handling**: Local state + mutation
- **Error Handling**: Try-catch + toast notifications
- **Loading States**: Skeleton loaders or spinners

### Component Organization
- **Layout**: Shared across pages
- **Page**: Route-specific
- **Feature**: Complex features (chat, livekit, debate)
- **UI**: Base components (shadcn/ui)
- **Card**: Reusable cards
- **Form**: Form-related components

---

*Last Updated: 2025*
*This mind map is a living document and should be updated as the frontend evolves.*
