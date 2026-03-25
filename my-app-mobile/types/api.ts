export type SessionStatus = 'UPCOMING' | 'ONGOING' | 'DONE' | 'CANCELLED';

export type PlatformStats = {
  usersOnboarded: number;
  studyRoomsHosted: number;
  sessionsCompleted: number;
  learningHours: number;
  reviewsGiven: number;
};

export type ApiPeer = {
  id: string;
  name: string;
  avatar?: string | null;
  bio?: string | null;
  skills: string[];
  rating?: number | null;
  reviewCount?: number;
  totalSessions?: number;
  socialLinks?: Array<{ platform: string; url: string }>;
};

export type ApiStudyRoom = {
  id: string;
  title: string;
  description?: string | null;
  sessionStatus: SessionStatus;
  date: string;
  duration: number;
  maxParticipants: number;
  joiningFee: number;
  participantCount: number;
  createdBy: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  skills: string[];
  hostAvgRating?: number | null;
  hostReviewCount?: number;
  hostTotalSessions?: number;
};

export type BrowseResponse = {
  peers: ApiPeer[];
  studyRooms: ApiStudyRoom[];
  trendingStudyRooms?: ApiStudyRoom[];
  counts: {
    peers: number;
    studyRooms: number;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
};

export type DebateRoomResponse = {
  id: string;
  topic: string;
  description?: string | null;
  status: 'WAITING' | 'PREP' | 'LIVE' | 'ENDED' | 'PROCESSED' | 'CANCELLED';
  scheduledAt?: string | null;
  turnDurationSeconds: number;
  maxParticipants: number;
  teams: Array<{
    id: string;
    side: 'FOR' | 'AGAINST';
    participants: Array<{
      id: string;
      user: {
        id: string;
        name: string;
        avatar?: string | null;
      };
      status: string;
    }>;
  }>;
  host: {
    id?: string;
    name: string;
    avatar?: string | null;
  };
};

export type DebateRoomsResponse = {
  debateRooms: DebateRoomResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type DashboardMetric = {
  name: string;
  value: number;
  description: string;
};

export type DashboardSession = {
  id: string;
  title: string;
  date: string;
  duration: number;
  description?: string | null;
  sessionStatus: SessionStatus;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  peer?: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  skills?: Array<{ id: string; name: string }>;
  participantCount?: number;
  maxParticipants?: number;
};

export type DashboardResponse = {
  metrics: DashboardMetric[];
  pendingRequests?: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    direction: 'received' | 'sent';
    requestedBy: { id: string; name: string; avatar?: string | null };
    requestedTo: { id: string; name: string; avatar?: string | null };
    skills: string[];
  }>;
  sentRequests?: Array<{
    id: string;
    title: string;
    date: string;
    duration: number;
    direction: 'received' | 'sent';
    requestedBy: { id: string; name: string; avatar?: string | null };
    requestedTo: { id: string; name: string; avatar?: string | null };
    skills: string[];
  }>;
  upcomingSessions?: DashboardSession[];
  pastSessions?: DashboardSession[];
  upcomingStudyRooms?: DashboardSession[];
  pastStudyRooms?: DashboardSession[];
  notifications?: ApiNotification[];
  streak?: {
    currentStreak: number;
    longestStreak: number;
    lastActiveDate?: string | null;
  } | null;
  achievements?: {
    unlocked: Array<{
      id: string;
      title: string;
      description: string;
      unlockedAt?: string | null;
      category?: string;
      reward?: number;
    }>;
    inProgress: Array<{
      id: string;
      title: string;
      description: string;
      current?: number;
      target?: number;
      category?: string;
      reward?: number;
    }>;
    totalUnlocked: number;
    totalAvailable: number;
  };
  pendingReviews?: number;
};

export type SessionActivityPoint = {
  date: string;
  learned: number;
  taught: number;
  studyRooms: number;
};

export type CurrentUserResponse = {
  user: {
    id: string;
    name: string;
    username?: string | null;
    email: string;
    avatar?: string | null;
    bio?: string | null;
    location?: string | null;
    school?: string | null;
    coins: number;
    hourlyRate?: number | null;
    hasSkills: string[];
    wantSkills: string[];
    socialLinks: Array<{ platform: string; url: string }>;
    publicStats: {
      sessionsTaught: number;
      sessionsAttendedAsLearner: number;
      totalSessionRequests: number;
      acceptedSessions: number;
      acceptanceRate: number;
      avgRating: number;
      reviewCount: number;
    };
  };
  isNewUser: boolean;
};

export type PublicUser = CurrentUserResponse['user'];

export type ApiNotification = {
  id: string;
  notifType: 'URGENT' | 'NORMAL';
  message: string;
  createdAt: string;
  viewed: boolean;
};

export type NotificationsResponse = {
  notifications: ApiNotification[];
  unreadCount: number;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasMore: boolean;
  };
};
