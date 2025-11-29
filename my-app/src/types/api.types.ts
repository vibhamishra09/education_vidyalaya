// Import types from index.ts if needed

// Session and Payment Enums
export enum SessionStatus {
  PENDING = 'PENDING',
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  CANCELLED = 'CANCELLED',
  DONE = 'DONE',
}

export enum PaymentStatus {
  ESCROW = 'ESCROW',
  REFUNDED = 'REFUNDED',
  RECEIVED = 'RECEIVED',
}

export enum NotifType {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL',
}

// User Types
export interface PublicUserStats {
  sessionsTaught: number;
  totalSessionRequests: number;
  acceptedSessions: number;
  acceptanceRate: number; // Stored as a decimal (0-1)
  avgRating: number;
  reviewCount: number;
}

export interface User {
  id: string;
  name: string;
  username?: string;
  email: string;
  avatar?: string;
  bio?: string;
  location?: string;
  school?: string;
  coins: number | string; // Can be number or string (from Prisma Decimal)
  hourlyRate?: number | string; // Hourly rate in coins for teaching sessions
  hasSkills?: string[];
  wantSkills?: string[];
  publicStats?: PublicUserStats;
}

export interface PublicUser {
  id: string;
  name: string;
  avatar?: string;
  hourlyRate?: number | string;
}

export interface UpdateUserDto {
  username?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  school?: string;
  hourlyRate?: number | string;
  hasSkills?: string[];
  wantSkills?: string[];
}

export interface CurrentUserResponse {
  user: User;
  isNewUser: boolean;
}

// Skill Types
export interface Skill {
  id: string;
  name: string;
  description?: string;
}

export interface CreateSkillDto {
  name: string;
  description?: string;
}

// Study Room Types
export interface StudyRoomCard {
  id: string;
  title: string;
  description?: string;
  sessionStatus: SessionStatus;
  date: Date | string;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
  participantCount: number;
  createdBy: PublicUser;
  skills: (string | Skill)[];
  gmeetLink?: string;
  hostAvgRating?: number;
  hostReviewCount?: number;
}

export interface StudyRoom extends StudyRoomCard {
  participants: PublicUser[];
  role: 'teacher' | 'learner' | 'empty';
  reviews: ReviewCard[];
  summary?: string;
  chatChannelId?: string | null;
}

export interface CreateStudyRoomDto {
  title: string;
  description?: string;
  skills: string[];
  date: string;
  time: string;
  duration: number;
  maxParticipants: number;
  joiningFee?: number;
  gmeetLink?: string;
  timezone: string;
}

export interface UpdateStudyRoomDto {
  title?: string;
  description?: string;
  skills?: string[];
  date?: string;
  time?: string;
  duration?: number;
  maxParticipants?: number;
  joiningFee?: number;
  gmeetLink?: string;
}

// Peer Session Types
export interface PeerSession {
  id: string;
  title: string;
  description?: string;
  sessionStatus: SessionStatus;
  date: Date | string;
  duration: number;
  requestedBy: PublicUser;
  requestedTo: PublicUser;
  skills: Skill[];
  gmeetLink?: string;
  summary?: string;
  chatChannelId?: string | null;
  role?: 'requester' | 'requestedTo' | 'empty';
}

export interface RequestSessionDto {
  peerId: string;
  skills?: string[];
  date: string;
  time: string;
  duration: number;
  message?: string;
  cost: number;
  gmeetLink?: string;
  timezone: string;
}

export interface UpdateSessionStatusDto {
  status: SessionStatus;
}

// Review Types
export interface Review {
  id: string;
  rating: number;
  review: string;
  reviewer: PublicUser;
  reviewee: PublicUser;
}

export interface Review {
  id: string;
  rating: number;
  review: string;
  reviewer: PublicUser;
  reviewee: PublicUser;
}

export interface ReviewCard {
  id: string;
  rating: number;
  review: string;
  reviewer: PublicUser;
}

export interface CreateReviewDto {
  sessionId: string;
  sessionType: 'studyRoom' | 'peerSession';
  rating: number;
  review: string;
}

export interface SessionReviewsResponse {
  reviews: ReviewCard[];
  avgRating: number;
  totalCount: number;
  pagination: Pagination;
}

// Notification Types
export interface Notification {
  id: string;
  notifType: NotifType;
  message: string;
  createdAt: Date | string;
  viewed: boolean;
  actionType?: string; // e.g., "SESSION_REQUEST", "SESSION_REMINDER", "REVIEW_REMINDER"
  actionData?: string; // JSON string with sessionId, sessionType, etc.
  peerSessionId?: string;
  studyRoomId?: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  unreadCount: number;
  pagination: Pagination;
}

// Browse Types
export interface BrowsePeer {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  skills: string[];
}

export interface BrowseResponse {
  peers: BrowsePeer[];
  studyRooms: StudyRoomCard[];
  pagination: Pagination;
}

// Dashboard Types
export interface Metric {
  name: string;
  value: number;
  description: string;
}

export interface PendingRequest {
  id: string;
  title: string;
  requestedBy: PublicUser;
  requestedTo?: PublicUser;
  date: Date | string;
  duration: number;
  skills: string[];
  direction?: 'received' | 'sent';
}

export interface UpcomingSession {
  id: string;
  title: string;
  date: Date | string;
  duration: number;
  peer: PublicUser;
  skills?: Array<{ id: string; name: string } | string>;
  description?: string;
  requestedBy?: PublicUser;
}

export interface PastSession {
  id: string;
  title: string;
  date: Date | string;
  duration: number;
  peer: PublicUser;
  skills?: Array<{ id: string; name: string } | string>;
  description?: string;
  requestedBy?: PublicUser;
}

export interface UpcomingStudyRoom {
  id: string;
  title: string;
  date: Date | string;
  duration: number;
  maxParticipants: number;
  participantCount: number;
  createdBy: PublicUser;
  skills?: Array<{ id: string; name: string } | string>;
  description?: string;
}

export interface PastStudyRoom {
  id: string;
  title: string;
  date: Date | string;
  duration: number;
  maxParticipants: number;
  participantCount: number;
  createdBy: PublicUser;
  skills?: Array<{ id: string; name: string } | string>;
  description?: string;
}

export interface DashboardData {
  metrics?: Metric[];
  pendingRequests?: PendingRequest[];
  sentRequests?: PendingRequest[];
  upcomingSessions?: UpcomingSession[];
  pastSessions?: PastSession[];
  upcomingStudyRooms?: UpcomingStudyRoom[];
  pastStudyRooms?: PastStudyRoom[];
  pendingReviews?: number;
  notifications?: Notification[];
  streak?: StreakData;
  achievements?: {
    unlocked: Achievement[];
    inProgress: Achievement[];
    totalUnlocked: number;
    totalAvailable: number;
  };
}

// Pagination Types
export interface Pagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  offset?: number;
}

// Response Types with Pagination
export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

export interface SkillsResponse {
  skills: Skill[];
  pagination: Pagination;
}

export interface StudyRoomsResponse {
  studyRooms: StudyRoomCard[];
  pagination: Pagination;
}

export interface PeerSessionsResponse {
  peerSessions: PeerSession[];
  pagination: Pagination;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: Pagination;
}

// Error Types
export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
  field?: string;
  timestamp: string;
}

// API Query Parameters
export interface StudyRoomFilters extends PaginationQuery {
  search?: string;
  skills?: string[];
  status?: SessionStatus;
  dateFrom?: string;
  dateTo?: string;
  trending?: boolean;
  [key: string]: unknown;
}

export interface PeerSessionFilters extends PaginationQuery {
  status?: SessionStatus;
  requestedBy?: string;
  requestedTo?: string;
  [key: string]: unknown;
}

export interface ReviewFilters extends PaginationQuery {
  userId?: string;
  sessionId?: string;
  sessionType?: 'studyRoom' | 'peerSession';
  [key: string]: unknown;
}

export interface NotificationFilters extends PaginationQuery {
  type?: NotifType;
  viewed?: boolean;
  [key: string]: unknown;
}

export interface BrowseFilters extends PaginationQuery {
  tab: 'peers' | 'studyRooms';
  search?: string;
  skills?: string[];
  [key: string]: unknown;
}

export interface DashboardQuery {
  includeMetrics?: boolean;
  includeRequests?: boolean;
  includeSessions?: boolean;
  includeNotifications?: boolean;
  includeStreaks?: boolean;
  includeAchievements?: boolean;
  [key: string]: unknown;
}

// Transaction History Types
export interface TransactionHistoryItem {
  id: string;
  type: 'PAYMENT_MADE' | 'PAYMENT_RECEIVED' | 'REFUND_RECEIVED';
  amount: number;
  description: string;
  status: PaymentStatus;
  date: Date | string;
  relatedUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  relatedSession?: {
    id: string;
    title: string;
    type: 'PEER_SESSION' | 'STUDY_ROOM';
  };
}

export interface TransactionHistoryResponse {
  transactions: TransactionHistoryItem[];
  pagination: Pagination;
}

// Streak Types
export interface StreakDay {
  date: string; // ISO date string
  hasActivity: boolean;
  sessionCount: number;
  minutesLearned: number;
  minutesTaught: number;
}

export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | string | null;
}

export interface StreakHistoryResponse {
  days: StreakDay[];
  currentStreak: number;
}

// Achievement Types
export enum AchievementCategory {
  LEARNING = 'LEARNING',
  TEACHING = 'TEACHING',
  SOCIAL = 'SOCIAL',
  MILESTONE = 'MILESTONE',
  STREAK = 'STREAK',
}

export enum AchievementRarity {
  COMMON = 'COMMON',
  RARE = 'RARE',
  EPIC = 'EPIC',
  LEGENDARY = 'LEGENDARY',
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  maxProgress: number;
  progress: number;
  coinReward: number;
  unlocked: boolean;
  unlockedAt?: Date | string | null;
}

export interface AchievementsResponse {
  unlocked: Achievement[];
  inProgress: Achievement[];
  locked: Achievement[];
  totalUnlocked: number;
  totalAvailable: number;
}

export interface MonthlyTopUser {
  id: string;
  name: string;
  avatar?: string;
  sessionCount: number;
  totalMinutes: number;
}

export interface MonthlyTopUsersResponse {
  topLearner: MonthlyTopUser | null;
  topTeacher: MonthlyTopUser | null;
  month: number;
  year: number;
}
