// Import types from index.ts if needed

// Feedback Types
export type FeedbackType = 'structured' | 'freeform' | 'mixed';
export type FeedbackStatus = 'submitted' | 'reviewed' | 'resolved' | 'archived';
export type FeedbackPriority = 'low' | 'medium' | 'high' | 'critical';

export type FeatureArea =
  | 'studyRooms'
  | 'peerSessions'
  | 'dashboard'
  | 'payments'
  | 'reviews'
  | 'notifications'
  | 'browse'
  | 'chat'
  | 'profile'
  | 'skills'
  | 'achievements'
  | 'streaks'
  | 'availability'
  | 'general'
  | 'other';

export type FeedbackCategory =
  | 'bug'
  | 'feature-request'
  | 'ui-issue'
  | 'performance'
  | 'accessibility'
  | 'documentation'
  | 'other';

export interface DeviceInfo {
  browser?: string;
  os?: string;
  device?: string;
  screenResolution?: string;
}

export interface FeedbackAttachment {
  s3Key: string;
  fileName: string;
  fileType: string;
  fileSize?: number;
  uploadDate: string;
  presignedUrl?: string;
}

export interface FeedbackMetadata {
  sessionId?: string;
  studyRoomId?: string;
  peerSessionId?: string;
  [key: string]: unknown;
}

export interface FeedbackSubmission {
  userId?: string;
  userEmail?: string;
  featureArea: FeatureArea;
  feedbackType: FeedbackType;
  title?: string;
  rating?: number; // 1-5
  categories?: FeedbackCategory[];
  structuredData?: Record<string, unknown>;
  freeformText?: string;
  deviceInfo: DeviceInfo;
  metadata?: FeedbackMetadata;
  tags?: string[];
  priority?: FeedbackPriority;
}

export interface Feedback {
  feedbackId: string;
  userId: string;
  userEmail?: string;
  featureArea: FeatureArea;
  feedbackType: FeedbackType;
  title?: string;
  rating?: number;
  categories: FeedbackCategory[];
  structuredData: Record<string, unknown>;
  freeformText?: string;
  deviceInfo: DeviceInfo;
  metadata: FeedbackMetadata;
  attachments: FeedbackAttachment[];
  status: FeedbackStatus;
  priority: FeedbackPriority;
  tags: string[];
  submittedAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

export interface FeedbackResponse {
  success: boolean;
  feedbackId: string;
  message: string;
}

export interface AttachmentUploadRequest {
  fileName: string;
  fileType: string;
  fileData: string; // base64 encoded
}

export interface AttachmentUploadResponse {
  success: boolean;
  attachment: FeedbackAttachment;
  message: string;
}

export interface FeedbackFilters {
  userId?: string;
  featureArea?: FeatureArea;
  status?: FeedbackStatus;
  startDate?: string;
  endDate?: string;
  limit?: number;
  lastEvaluatedKey?: string;
}

export interface FeedbackListResponse {
  feedback: Feedback[];
  pagination: {
    lastEvaluatedKey: string | null;
    hasMore: boolean;
  };
}

export interface FeedbackStats {
  total: number;
  byFeatureArea: Record<string, number>;
  byStatus: Record<string, number>;
  byRating: Record<string, number>;
  byCategory: Record<string, number>;
  averageRating: number;
  recentCount: number; // Last 7 days
}

export interface FeedbackStatsResponse {
  stats: FeedbackStats;
}

// Session and Payment Enums
export enum SessionStatus {
  PENDING = 'PENDING',
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  CANCELLED = 'CANCELLED',
  DONE = 'DONE',
  NOT_COMPLETED = 'NOT_COMPLETED',
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
  sessionsAttendedAsLearner: number;
  totalSessionRequests: number;
  acceptedSessions: number;
  acceptanceRate: number; // Stored as a decimal (0-1)
  avgRating: number;
  reviewCount: number;
}

// Social media link types
export const SOCIAL_PLATFORMS = [
  'linkedin',
  'twitter',
  'github',
  'youtube',
  'instagram',
  'facebook',
  'tiktok',
  'discord',
  'twitch',
  'reddit',
  'medium',
  'devto',
  'stackoverflow',
  'dribbble',
  'behance',
  'figma',
  'website',
  'custom',
] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export interface SocialLink {
  platform: string; // Can be one of SOCIAL_PLATFORMS or any custom string
  url: string;
  label?: string; // Optional custom label (useful for 'custom' platform or renaming)
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
  // Social media profile links (flexible array structure)
  socialLinks?: SocialLink[];
}

export interface PublicUser {
  id: string;
  name: string;
  avatar?: string;
  hourlyRate?: number | string;
}

export interface UpdateUserDto {
  name?: string;
  username?: string;
  bio?: string;
  avatar?: string;
  location?: string;
  school?: string;
  hourlyRate?: number | string;
  hasSkills?: string[];
  wantSkills?: string[];
  // Social media profile links (flexible array structure)
  socialLinks?: SocialLink[];
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
  imageUrl?: string;
  sessionStatus: SessionStatus;
  date: Date | string;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
  participantCount: number;
  createdBy: PublicUser;
  skills: (string | Skill)[];
  hostAvgRating?: number | null;
  hostReviewCount?: number;
  hostTotalSessions?: number;
  isRecurring?: boolean;
  recurrenceMode?: StudyRoomRecurrenceMode | null;
  seriesId?: string | null;
  seriesRootId?: string | null;
  occurrenceIndex?: number | null;
  timezone?: string | null;
  slug?: string;
  /** Public registration path segment for webinars (`/webinar/register/[slug]`). */
  webinarRegistrationSlug?: string | null;
}

export type StudyRoomSessionMode = 'STANDARD' | 'WEBINAR';

export interface StudyRoom extends StudyRoomCard {
  participants: (PublicUser & { role?: 'PARTICIPANT' | 'COHOST'; clerkId?: string })[];
  guestParticipants?: Array<{
    id: string;
    name: string;
    email: string;
    role: 'PARTICIPANT' | 'COHOST';
    livekitIdentity: string;
  }>;
  role: 'teacher' | 'learner' | 'empty';
  cohostCount?: number;
  reviews: ReviewCard[];
  summary?: string;
  chatChannelId?: string | null;
  occurrencesCreated?: number;
  hostDetailsUpdatedAt?: string | null;
  sessionMode?: StudyRoomSessionMode;
  webinarConfig?: unknown;
  webinarRegistrationSlug?: string | null;
  webinarRegistrationUrl?: string | null;
}

export enum StudyRoomRecurrenceMode {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  CUSTOM_DATES = 'CUSTOM_DATES',
}

export enum StudyRoomEditScope {
  SINGLE = 'SINGLE',
  THIS_AND_FUTURE = 'THIS_AND_FUTURE',
  ENTIRE_SERIES = 'ENTIRE_SERIES',
}

export interface StudyRoomRecurrenceDto {
  mode: StudyRoomRecurrenceMode;
  interval?: number;
  weekdays?: number[];
  customDates?: string[];
  repeatUntil: string;
}

export interface CreateStudyRoomDto {
  title: string;
  description?: string;
  imageUrl?: string;
  skills: string[];
  date: string;
  time: string;
  duration: number;
  maxParticipants: number;
  joiningFee?: number;
  timezone: string;
  recurrence?: StudyRoomRecurrenceDto;
  sessionMode?: StudyRoomSessionMode;
  webinarConfig?: Record<string, unknown>;
}

export interface UpdateStudyRoomDto {
  title?: string;
  description?: string;
  imageUrl?: string;
  skills?: string[];
  date?: string;
  time?: string;
  duration?: number;
  maxParticipants?: number;
  joiningFee?: number;
  status?: SessionStatus;
  timezone?: string;
  editScope?: StudyRoomEditScope;
  recurrence?: StudyRoomRecurrenceDto;
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
  /** ISO time when someone last saved meeting details. */
  hostDetailsUpdatedAt?: string | null;
  /** Internal user id of who last saved details (other party sees “Edited” / banner). */
  lastDetailsEditedById?: string | null;
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

/** PATCH /api/peer-sessions/:id — either participant; `scheduledAt` as ISO string. */
export interface UpdatePeerSessionDto {
  title?: string;
  description?: string;
  duration?: number;
  /** Omit to leave unchanged; empty string clears the link. */
  gmeetLink?: string;
  scheduledAt?: string;
  skills?: string[];
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
  review?: string;
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
  rating?: number | null;
  reviewCount?: number;
  totalSessions?: number;
  socialLinks?: SocialLink[];
}

export interface BrowseResponse {
  peers: BrowsePeer[];
  studyRooms: StudyRoomCard[];
  trendingStudyRooms?: StudyRoomCard[];
  counts: {
    peers: number;
    studyRooms: number;
    webinars?: number;
  };
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
  sessionStatus?: SessionStatus;
  hostDetailsUpdatedAt?: string | null;
  lastDetailsEditedById?: string | null;
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
  sessionStatus?: SessionStatus;
  hostDetailsUpdatedAt?: string | null;
  lastDetailsEditedById?: string | null;
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
  sessionStatus?: SessionStatus;
  hostDetailsUpdatedAt?: string | null;
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
  hostDetailsUpdatedAt?: string | null;
}

export interface DashboardData {
  metrics?: Metric[];
  pendingRequests?: PendingRequest[];
  sentRequests?: PendingRequest[];
  upcomingSessions?: UpcomingSession[];
  pastSessions?: PastSession[];
  upcomingStudyRooms?: UpcomingStudyRoom[];
  pastStudyRooms?: PastStudyRoom[];
  sessionsPagination?: {
    upcomingSessions: Pagination;
    pastSessions: Pagination;
    upcomingStudyRooms: Pagination;
    pastStudyRooms: Pagination;
  };
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
  createdById?: string;
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
  tab: 'peers' | 'studyRooms' | 'webinars';
  search?: string;
  skills?: string[];
  peerHasSocialLinks?: boolean;
  studyStatus?: SessionStatus;
  studyFreeOnly?: boolean;
  includeTrendingStudyRooms?: boolean;
  trendingLimit?: number;
  [key: string]: unknown;
}

export interface DashboardQuery {
  includeMetrics?: boolean;
  includeRequests?: boolean;
  includeSessions?: boolean;
  includeNotifications?: boolean;
  includeStreaks?: boolean;
  includeAchievements?: boolean;
  page?: number;
  limit?: number;
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

// Session Feedback Types (Post-session survey)
export type FirstFeelingOption = 'Excited' | 'Curious' | 'Confused' | 'Neutral' | 'Disgusting';
export type ClarityOption = 'Very clear' | 'Somewhat clear' | 'Not clear' | 'Confusing';
export type ProblemSolvedOption = 'Completely' | 'Mostly' | 'Partially' | 'Not really';
export type PreviousSolutionOption = 'YouTube or online videos' | 'Paid courses' | 'Friends or peers' | 'Self-learning' | "Couldn't find a solution";
export type EaseOfStartOption = 'Extremely easy' | 'Easy' | 'Neutral' | 'Difficult' | 'Very difficult';
export type YesNoOption = 'Yes' | 'No';
export type TrustIncreaseOption = 'User profiles & credibility' | 'Ratings & reviews' | 'AI Moderation & guidelines' | 'Verified users';
export type PlatformComparisonOption = 'Human' | 'Practical' | 'Interactive' | 'Flexible' | 'Confusing' | 'Less useful';
export type ContinueUsingOption = 'Very likely' | 'Likely' | 'Not sure' | 'Unlikely';
export type WillingToPayOption = 'Yes, definitely' | 'Maybe, if the value is clear' | 'No';
export type PaidFeatureOption = 
  | 'Unlimited live learning sessions'
  | 'Access to high-quality peers / mentors'
  | 'Debate Rooms'
  | 'Session recordings and notes'
  | 'Sessions being moderated and rated by AI'
  | 'Verified experts / credibility badges'
  | 'AI-powered learning recommendations'
  | 'Certificates / proof of learning'
  | 'Community-only learning circles';

export interface SessionFeedbackAnswers {
  // Q1: Time spent (in minutes)
  timeSpentMinutes?: number;
  // Q2: One sentence description
  oneSentenceDescription?: string;
  // Q3: First feeling
  firstFeeling?: FirstFeelingOption;
  // Q4: Clarity of purpose
  clarityOfPurpose?: ClarityOption;
  // Q5: Problem hoping to solve
  problemHopingToSolve?: string;
  // Q6: To what extent problem solved
  problemSolvedExtent?: ProblemSolvedOption;
  // Q7: Previous solution attempts
  previousSolution?: PreviousSolutionOption;
  // Q8: Ease of getting started
  easeOfStart?: EaseOfStartOption;
  // Q9: Confidence interacting with others
  confidenceInteracting?: string;
  // Q10: What enjoyed most
  enjoyedMost?: string;
  // Q11: Felt stuck at any point
  feltStuck?: YesNoOption;
  // Q12: Where felt stuck (if yes)
  whereStuck?: string;
  // Q13: What would remove to reduce friction
  removeForFriction?: string;
  // Q14: Value score (1-10)
  valueScore?: number;
  // Q15: What would make it must-use
  whatMakeMustUse?: string;
  // Q16: Believe peer learning is helpful
  believePeerLearningHelpful?: YesNoOption;
  // Q17: What would increase trust most
  trustIncreaseOption?: TrustIncreaseOption;
  // Q18: How different from other platforms
  howDifferent?: string;
  // Q19: What would use instead
  alternativeIfNotExist?: string;
  // Q20: Platform comparison feeling
  platformComparison?: PlatformComparisonOption;
  // Q21: Likelihood to continue using
  likelihoodToContinue?: ContinueUsingOption;
  // Q22: NPS Score (0-10)
  npsScore?: number;
  // Q23: What would stop recommending
  stopRecommending?: string;
  // Q24: Willing to pay ₹1/day
  willingToPay?: WillingToPayOption;
  // Q25: Most valuable paid features (multi-select)
  valuablePaidFeatures?: PaidFeatureOption[];
  // Q26: What makes worth paying for
  whatMakesWorthPaying?: string;
  // Q27: What would change/improve
  whatWouldChange?: string;
  // Q28: Open to feedback call
  openToFeedbackCall?: YesNoOption;
  // Q29: Final thoughts
  finalThoughts?: string;
}

export interface SessionFeedbackSubmission {
  sessionId: string;
  sessionType: 'studyRoom' | 'peerSession';
  isHost: boolean;
  answers: SessionFeedbackAnswers;
  submittedAt?: string;
}
