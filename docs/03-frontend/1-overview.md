# Frontend Overview

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **UI Library**: React 19
- **Styling**: Tailwind CSS 4
- **Components**: shadcn/ui (Radix UI primitives)
- **State Management**: 
  - TanStack Query (React Query) for server state
  - React Context for global client state
  - Local component state (useState)
- **Authentication**: Clerk
- **Real-time Communication**: LiveKit (WebRTC)
- **HTTP Client**: Axios
- **Form Validation**: Zod
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Notifications**: Sonner (toast notifications)

## Folder Structure

```
my-app/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── page.tsx           # Landing page
│   │   ├── layout.tsx         # Root layout
│   │   ├── browse/            # Browse peers and study rooms
│   │   ├── dashboard/         # User dashboard
│   │   ├── profile/           # User profile pages
│   │   │   └── [userId]/      # Public profile view
│   │   ├── studyroom/         # Study room details
│   │   │   └── [roomId]/
│   │   ├── sessions/          # Peer session details
│   │   │   └── [sessionId]/
│   │   ├── request-session/   # Request peer session
│   │   │   └── [userId]/
│   │   ├── create-study-room/ # Create study room
│   │   ├── submit-review/     # Submit session review
│   │   │   └── [sessionId]/
│   │   ├── onboarding/        # User onboarding flow
│   │   ├── chat/              # Chat interface
│   │   │   └── [channelId]/
│   │   ├── sign-in/           # Sign in page
│   │   ├── sign-up/           # Sign up page
│   │   └── api/               # API routes (server actions)
│   ├── components/            # React components
│   │   ├── cards/             # Card components
│   │   ├── layout/            # Layout components (nav, footer)
│   │   ├── sections/          # Page sections
│   │   ├── ui/                # UI primitives (shadcn)
│   │   ├── forms/             # Form components
│   │   ├── modals/            # Modal components
│   │   ├── chat/              # Chat components
│   │   ├── livekit/           # LiveKit video components
│   │   └── ...
│   ├── hooks/                 # Custom React hooks
│   │   ├── use-users.ts
│   │   ├── use-peer-sessions.ts
│   │   ├── use-study-rooms.ts
│   │   ├── use-reviews.ts
│   │   ├── use-notifications.ts
│   │   └── ...
│   ├── lib/                   # Utility libraries
│   │   ├── api.ts             # API client functions
│   │   ├── api-client.ts      # Axios instance
│   │   └── utils.ts          # Utility functions
│   ├── contexts/              # React Context providers
│   │   └── notification-context.tsx
│   ├── types/                 # TypeScript type definitions
│   │   └── api.types.ts
│   └── providers/            # App providers
│       └── query-provider.tsx # React Query provider
├── public/                    # Static assets
└── package.json
```

## How Routing Works

### App Router (Next.js 15)

- **File-based routing**: Routes are defined by folder structure in `src/app/`
- **Dynamic routes**: Use `[param]` folders (e.g., `[userId]`, `[sessionId]`)
- **Layouts**: `layout.tsx` files wrap pages and provide shared UI
- **Server Components**: Default, can use `"use client"` for client components
- **Route Groups**: Organize routes without affecting URL structure

### Route Examples

- `/` → `src/app/page.tsx` (Landing page)
- `/browse` → `src/app/browse/page.tsx`
- `/dashboard` → `src/app/dashboard/page.tsx`
- `/profile/[userId]` → `src/app/profile/[userId]/page.tsx`
- `/sessions/[sessionId]` → `src/app/sessions/[sessionId]/page.tsx`

### Navigation

- Use `next/navigation` hooks:
  - `useRouter()`: Programmatic navigation
  - `usePathname()`: Current pathname
  - `useSearchParams()`: URL search parameters

## Links to Related Documentation

- [Routes Documentation](./4-routes.md)
- [Components Documentation](./5-components.md)
- [UI Flows Documentation](./6-ui_flows.md)
- [State Management Documentation](./7-state_management.md)
- [Requirements Documentation](./2-requirements.md)
- [Low-Level Design](./3-lld.md)

## Key Features

### Server-Side Rendering (SSR)
- Next.js handles SSR automatically
- Improves SEO and initial load performance
- Data fetching in Server Components

### Client-Side Interactivity
- Client Components for interactive features
- React hooks for state management
- Real-time updates via React Query

### Authentication Integration
- Clerk integration for auth
- Protected routes via middleware
- User context available throughout app

### API Integration
- Centralized API client (Axios)
- React Query for data fetching and caching
- Type-safe API calls with TypeScript

### Real-time Features
- LiveKit for video/audio calls
- WebSocket for chat (future)
- Push notifications for browser

## Development Workflow

1. **Local Development**: `pnpm dev` (runs on port 3000)
2. **Build**: `pnpm build` (production build)
3. **Start**: `pnpm start` (production server)
4. **Lint**: `pnpm lint` (ESLint)
5. **Test**: `pnpm test` (Playwright tests)

## Environment Variables

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`: Clerk public key
- `NEXT_PUBLIC_API_URL`: Backend API URL
- `NEXT_PUBLIC_LIVEKIT_URL`: LiveKit server URL
- `NEXT_PUBLIC_LIVEKIT_API_KEY`: LiveKit API key
- `NEXT_PUBLIC_LIVEKIT_API_SECRET`: LiveKit API secret

## Build Output

- **Static Assets**: Optimized images, fonts, etc.
- **Server Components**: Rendered on server
- **Client Components**: Bundled for browser
- **API Routes**: Serverless functions

## Performance Optimizations

- **Code Splitting**: Automatic with Next.js
- **Image Optimization**: Next.js Image component
- **Font Optimization**: Next.js font optimization
- **Caching**: React Query caching strategy
- **Lazy Loading**: Dynamic imports for large components

