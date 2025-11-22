# Frontend Low-Level Design

## How Pages & Components are Structured

### Page Structure Pattern

Each page follows this structure:
```tsx
export default function PageName() {
  // 1. Hooks (auth, data fetching, state)
  const { user } = useUser();
  const { data, isLoading } = useQuery(...);
  const [localState, setLocalState] = useState(...);

  // 2. Effects (side effects, data transformation)
  useEffect(() => { ... }, [dependencies]);

  // 3. Event handlers
  const handleAction = async () => { ... };

  // 4. Loading/error states
  if (isLoading) return <LoadingSkeleton />;
  if (error) return <ErrorState />;

  // 5. Render
  return (
    <Layout>
      <PageContent />
    </Layout>
  );
}
```

### Component Hierarchy

```
App (layout.tsx)
├── Navigation (layout component)
├── Page Content (page.tsx)
│   ├── Sections (section components)
│   │   ├── Cards (card components)
│   │   └── Forms (form components)
│   └── Modals (modal components)
└── Footer (layout component)
```

### Component Organization

- **Layout Components**: Navigation, Footer (shared across pages)
- **Page Components**: Specific to routes (browse, dashboard, etc.)
- **Card Components**: Reusable card UI (PeerCard, StudyRoomCard, etc.)
- **Form Components**: Form inputs and validation
- **UI Primitives**: Base components from shadcn/ui
- **Feature Components**: Complex features (ChatWidget, VideoRoom, etc.)

## Shared Layout and Design System

### Layout Components

#### Navigation (`components/layout/navigation.tsx`)
- Top navigation bar
- Logo and branding
- User menu dropdown
- Notification dropdown
- Coin balance display
- Mobile hamburger menu

#### Footer (`components/layout/footer.tsx`)
- Footer links
- Social media links
- Copyright information
- Responsive layout

#### Bottom Navigation (`components/layout/bottom-nav.tsx`)
- Mobile-only bottom navigation
- Quick access to main pages
- Active route indication

### Design System

#### Colors (Tailwind CSS)
- **Primary**: Green (`green-600`, `green-500`)
- **Secondary**: Muted colors (`muted`, `muted-foreground`)
- **Accent**: Various accent colors
- **Background**: Light/dark mode support

#### Typography
- **Headings**: Bold, various sizes (text-2xl, text-3xl, etc.)
- **Body**: Regular weight, readable sizes
- **Font**: System font stack

#### Spacing
- Consistent spacing scale (4px base unit)
- Padding: `p-4`, `p-6`, `p-8`
- Margin: `m-4`, `m-6`, `m-8`
- Gap: `gap-4`, `gap-6`, `gap-8`

#### Components (shadcn/ui)
- Button: Various variants (default, outline, ghost, etc.)
- Card: Container component
- Input: Form input
- Dialog: Modal dialogs
- Toast: Notification toasts
- Avatar: User avatars
- Badge: Status badges
- Skeleton: Loading skeletons

## How API Clients are Organized

### API Client Structure

#### Axios Instance (`lib/api-client.ts`)
```typescript
// Base axios instance with interceptors
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: { 'Content-Type': 'application/json' }
});

// Request interceptor: Add auth token
apiClient.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: Handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => handleApiError(error)
);
```

#### API Functions (`lib/api.ts`)
- Organized by domain:
  - `usersApi`: User-related API calls
  - `peerSessionsApi`: Peer session API calls
  - `studyRoomsApi`: Study room API calls
  - `reviewsApi`: Review API calls
  - `notificationsApi`: Notification API calls
  - `browseApi`: Browse API calls
  - `dashboardApi`: Dashboard API calls

#### Example API Function:
```typescript
export const usersApi = {
  getCurrentUser: () => apiClient.get('/users/me'),
  updateUser: (data: UpdateUserDto) => apiClient.patch('/users/me', data),
  getUserById: (userId: string) => apiClient.get(`/users/${userId}`),
};
```

## How Routing + State + Query Caching Work Together

### Routing (Next.js App Router)

- **File-based routing**: Routes defined by folder structure
- **Dynamic routes**: `[param]` folders for dynamic segments
- **Layouts**: Shared UI via `layout.tsx`
- **Loading states**: `loading.tsx` for route-level loading
- **Error boundaries**: `error.tsx` for error handling

### State Management Layers

#### 1. Server State (React Query)
- **Purpose**: Data from API
- **Location**: `hooks/use-*.ts` files
- **Caching**: Automatic caching and invalidation
- **Refetching**: Automatic refetch on focus, reconnect

#### 2. Global Client State (React Context)
- **Purpose**: App-wide client state
- **Location**: `contexts/` directory
- **Examples**: Notification context, theme context

#### 3. Local Component State (useState)
- **Purpose**: Component-specific state
- **Location**: Inside components
- **Examples**: Form inputs, UI toggles, local filters

### Query Caching Strategy

#### Query Keys
```typescript
// Hierarchical query keys
export const userKeys = {
  all: ['users'] as const,
  current: () => [...userKeys.all, 'current'] as const,
  detail: (id: string) => [...userKeys.all, 'detail', id] as const,
};
```

#### Cache Invalidation
```typescript
// Invalidate related queries after mutation
const queryClient = useQueryClient();
await updateUser(data);
queryClient.invalidateQueries({ queryKey: userKeys.current() });
```

#### Stale Time
- **User data**: 5 minutes
- **List data**: 2 minutes
- **Detail data**: 5 minutes
- **Real-time data**: 0 (always fresh)

## Component Communication Patterns

### Parent → Child: Props
```tsx
<PeerCard 
  peer={peerData}
  onRequestSession={handleRequest}
/>
```

### Child → Parent: Callbacks
```tsx
<Form onSubmit={handleSubmit} />
```

### Sibling Components: Shared State (Lifted State)
```tsx
// State in parent, passed to children
const [filter, setFilter] = useState('');
<FilterBar filter={filter} onFilterChange={setFilter} />
<Results filter={filter} />
```

### Global State: Context API
```tsx
// Provide context
<NotificationProvider>
  <App />
</NotificationProvider>

// Consume context
const { notifications, markAsRead } = useNotificationContext();
```

### Server State: React Query
```tsx
// Fetch data
const { data } = usePeerSessions();

// Mutate data
const mutation = useUpdateSessionStatus();
mutation.mutate({ sessionId, status });
```

## Data Flow Patterns

### Fetching Data
1. Component mounts
2. React Query hook called
3. API request made (via axios)
4. Response cached
5. Component re-renders with data

### Updating Data
1. User action triggers mutation
2. Optimistic update (optional)
3. API request made
4. Cache invalidated
5. Related queries refetched
6. Component re-renders with fresh data

### Real-time Updates
1. WebSocket connection (future)
2. Server sends update
3. React Query cache updated
4. Components re-render automatically

## Error Handling Pattern

### API Errors
```typescript
// In API client interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle auth error
      redirectToLogin();
    }
    // Show toast notification
    toast.error(error.response?.data?.message || 'An error occurred');
    return Promise.reject(error);
  }
);
```

### Component Error Boundaries
```tsx
// Error boundary component
<ErrorBoundary fallback={<ErrorFallback />}>
  <PageContent />
</ErrorBoundary>
```

### Query Error Handling
```tsx
const { data, error, isLoading } = useQuery({
  queryKey: ['users'],
  queryFn: fetchUsers,
  retry: (failureCount, error) => {
    // Don't retry on 4xx errors
    if (error.response?.status < 500) return false;
    return failureCount < 3;
  },
});
```

## Form Handling Pattern

### Controlled Components
```tsx
const [formData, setFormData] = useState({
  title: '',
  description: '',
});

<input
  value={formData.title}
  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
/>
```

### Form Validation (Zod)
```typescript
const schema = z.object({
  title: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### Form Submission
```tsx
const onSubmit = async (data) => {
  try {
    await mutation.mutateAsync(data);
    toast.success('Success!');
    router.push('/success');
  } catch (error) {
    toast.error('Failed to submit');
  }
};
```

## Performance Optimizations

### Code Splitting
```tsx
// Dynamic imports for large components
const VideoRoom = dynamic(() => import('@/components/livekit/VideoRoom'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

### Memoization
```tsx
// Memoize expensive computations
const filteredData = useMemo(() => {
  return data.filter(item => item.status === filter);
}, [data, filter]);

// Memoize callbacks
const handleClick = useCallback(() => {
  // Handler logic
}, [dependencies]);
```

### Image Optimization
```tsx
// Next.js Image component
<Image
  src={avatar}
  alt="User avatar"
  width={40}
  height={40}
  loading="lazy"
/>
```

### Virtual Scrolling (Future)
- For long lists (notifications, messages)
- Use `react-window` or similar library

