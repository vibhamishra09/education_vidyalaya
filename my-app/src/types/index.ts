// Core Enums
export enum SessionStatus {
  PENDING = 'PENDING',
  UPCOMING = 'UPCOMING',
  ONGOING = 'ONGOING',
  CANCELLED = 'CANCELLED',
  DONE = 'DONE'
}

export enum PaymentStatus {
  ESCROW = 'ESCROW',
  REFUNDED = 'REFUNDED',
  RECEIVED = 'RECEIVED'
}

export enum NotifType {
  URGENT = 'URGENT',
  NORMAL = 'NORMAL'
}

export enum UserSkillType {
  HAS = 'HAS',
  WANTS = 'WANTS'
}

export enum TransactionType {
  EARNED = 'EARNED',
  SPENT = 'SPENT',
  REFUNDED = 'REFUNDED'
}

// Core Data Types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  coins: number;
  hasSkills: UserSkill[];
  wantSkills: UserSkill[];
  metrics?: Metrics;
  createdAt?: string;
  updatedAt?: string;
}

export interface Skill {
  id: string;
  name: string;
  description?: string;
}

export interface UserSkill {
  id: string;
  userId: string;
  type: UserSkillType;
  skill: Skill;
}

export interface Metrics {
  id: string;
  name: string;
  value: number;
  description?: string;
  userId: string;
}

// StudyRoom Types
export interface StudyRoom {
  id: string;
  title: string;
  description?: string;
  sessionStatus: SessionStatus;
  date: string;
  duration: number;
  maxParticipants: number;
  createdBy: User;
  learners: StudyRoomParticipant[];
  skills: StudyRoomSkill[];
  payments: Payment[];
  reviews: Review[];
  participantCount?: number;
  isFull?: boolean;
}

export interface StudyRoomParticipant {
  id: string;
  user: User;
  studyRoom: StudyRoom;
}

export interface StudyRoomSkill {
  id: string;
  studyRoom: StudyRoom;
  skill: Skill;
}

// PeerSession Types
export interface PeerSession {
  id: string;
  title: string;
  description?: string;
  sessionStatus: SessionStatus;
  date: string;
  duration: number;
  requestedBy: User;
  requestedTo: User;
  skills: PeerSessionSkill[];
  payment?: Payment;
  reviews: Review[];
}

export interface PeerSessionSkill {
  id: string;
  peerSession: PeerSession;
  skill: Skill;
}

// Payment Types
export interface Payment {
  id: string;
  paymentStatus: PaymentStatus;
  madeBy: User;
  receivedBy: User;
  amountMade: number;
  amountReceived: number;
  studyRoom?: StudyRoom;
  peerSession?: PeerSession;
  createdAt?: string;
  updatedAt?: string;
}

// Review Types
export interface Review {
  id: string;
  rating: number;
  review: string;
  studyRoom?: StudyRoom;
  peerSession?: PeerSession;
  reviewer: User;
  reviewee: User;
  createdAt?: string;
  updatedAt?: string;
}

// Notification Types
export interface Notification {
  id: string;
  notifType: NotifType;
  message: string;
  createdAt: string;
  viewed: boolean;
  user: User;
}

// UI Component Types
export interface NavLink {
  title: string;
  route: string;
  icon?: string;
}

export interface PeerCard {
  id: string;
  type: 'peer';
  user: User;
  skillsTeachable: Skill[];
  rating: number;
  reviewCount: number;
}

export interface StudyRoomCard {
  id: string;
  type: 'studyRoom';
  studyRoom: StudyRoom;
  timeRemaining?: string;
  participantCount: number;
  maxParticipants: number;
  isFull: boolean;
}

export type BrowseCard = PeerCard | StudyRoomCard;

export interface ProfileDetailCard {
  user: User;
  skillsTeachable: Skill[];
  rating: number;
  reviewCount: number;
}

export interface MetricCard {
  name: string;
  value: number | string;
  description?: string;
  icon?: string;
}

export interface ReviewCard {
  review: Review;
  reviewer: User;
  createdAt: string;
}

export interface PendingSessionRequest {
  id: string;
  type: 'peerSession';
  peerSession: PeerSession;
  requestedBy: User;
  skills: string[];
  timeRemaining: string;
  cost: number;
}

export interface UpcomingSessionCard {
  id: string;
  type: 'studyRoom' | 'peerSession';
  title: string;
  date: string;
  timeOfDay: string;
  dayLabel: 'Today' | 'Tomorrow' | string;
  participants?: User[];
  skills: string[];
}

export interface StudyRoomDetailCard {
  studyRoom: StudyRoom;
  role: 'teacher' | 'learner' | 'empty';
  timeRemaining?: string;
  joiningFee?: number;
  learnerList: User[];
  teacher: User;
  topic: Skill;
}

export interface AISummary {
  id: string;
  studyRoomId: string;
  summary: string;
  keyPoints: string[];
  createdAt: string;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RequestSessionForm {
  peerId: string;
  peerName: string;
  skills: Skill[];
  date: string;
  time: string;
  duration: number;
  message?: string;
  cost: number;
  balance: number;
}

export interface CreateStudyRoomForm {
  title: string;
  description?: string;
  skills: Skill[];
  date: string;
  time: string;
  duration: number;
  maxParticipants: number;
}

export interface SubmitReviewForm {
  sessionId: string;
  sessionType: 'studyRoom' | 'peerSession';
  rating: number;
  review: string;
}

export interface EditProfileForm {
  name: string;
  bio?: string;
  avatar?: string;
  hasSkills: Skill[];
  wantSkills: Skill[];
}

// Page State Types
export interface BrowsePageState {
  activeTab: 'peers' | 'studyRooms';
  searchQuery: string;
  selectedSkills: Skill[];
  peers: PeerCard[];
  studyRooms: StudyRoomCard[];
  loading: boolean;
  hasMore: boolean;
}

export interface DashboardState {
  metrics: MetricCard[];
  pendingRequests: PendingSessionRequest[];
  upcomingSessions: UpcomingSessionCard[];
  pendingReviews: number;
  notifications: Notification[];
  loading: boolean;
}

export interface ProfilePageState {
  user: User;
  publicMetrics: MetricCard[];
  upcomingStudyRooms: StudyRoomCard[];
  recentReviews: ReviewCard[];
  loading: boolean;
}

export interface StudyRoomPageState {
  studyRoom: StudyRoom;
  role: 'teacher' | 'learner' | 'empty';
  aiSummary?: AISummary;
  reviews: ReviewCard[];
  loading: boolean;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ErrorResponse {
  message: string;
  code?: string;
  details?: unknown;
}

// Transaction Types
export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
  relatedUser?: User;
}

// Utility Types
export interface PageMeta {
  title: string;
  description?: string;
  keywords?: string[];
}

export interface FooterLink {
  label: string;
  url: string;
  external?: boolean;
}

export interface SearchFilters {
  skills: Skill[];
  dateRange?: {
    start: string;
    end: string;
  };
  maxParticipants?: number;
  sessionType?: 'studyRoom' | 'peerSession';
}

export interface TimeSlot {
  date: string;
  time: string;
  available: boolean;
  bookedBy?: User;
}
