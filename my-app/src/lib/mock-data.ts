import {
  User,
  Skill,
  // UserSkill,
  StudyRoom,
  PeerSession,
  Review,
  Notification,
  MetricCard,
  PeerCard,
  StudyRoomCard,
  SessionStatus,
  UserSkillType,
  NotifType,
  Transaction,
  TransactionType,
  // PaymentStatus,
} from '@/types';

// Mock Skills
export const mockSkills: Skill[] = [
  { id: '1', name: 'React', description: 'JavaScript library for building UIs' },
  { id: '2', name: 'TypeScript', description: 'Typed superset of JavaScript' },
  { id: '3', name: 'Node.js', description: 'JavaScript runtime' },
  { id: '4', name: 'Python', description: 'General-purpose programming language' },
  { id: '5', name: 'UI/UX Design', description: 'User interface and experience design' },
  { id: '6', name: 'Data Science', description: 'Data analysis and machine learning' },
  { id: '7', name: 'SQL', description: 'Database query language' },
  { id: '8', name: 'GraphQL', description: 'Query language for APIs' },
  { id: '9', name: 'Machine Learning', description: 'AI and ML algorithms' },
  { id: '10', name: 'DevOps', description: 'Development and operations practices' },
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    name: 'Sarah Chen',
    email: 'sarah@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    bio: 'Full-stack developer passionate about React and Node.js. Love helping others learn!',
    coins: 500,
    hasSkills: [],
    wantSkills: [],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'user-2',
    name: 'Alex Rodriguez',
    email: 'alex@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex',
    bio: 'UI/UX designer with 5 years of experience. Specializing in modern web design.',
    coins: 750,
    hasSkills: [],
    wantSkills: [],
    createdAt: '2024-01-20T10:00:00Z',
  },
  {
    id: 'user-3',
    name: 'Dr. Priya Kumar',
    email: 'priya@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Priya',
    bio: 'Data scientist specializing in Python and machine learning. PhD in Computer Science.',
    coins: 1200,
    hasSkills: [],
    wantSkills: [],
    createdAt: '2024-01-10T10:00:00Z',
  },
  {
    id: 'user-4',
    name: 'Marcus Johnson',
    email: 'marcus@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    bio: 'Backend engineer focused on scalable systems and databases.',
    coins: 600,
    hasSkills: [],
    wantSkills: [],
    createdAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'user-5',
    name: 'Emma Wilson',
    email: 'emma@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emma',
    bio: 'Frontend developer and TypeScript enthusiast. Building beautiful web experiences.',
    coins: 450,
    hasSkills: [],
    wantSkills: [],
    createdAt: '2024-02-05T10:00:00Z',
  },
  {
    id: 'current-user',
    name: 'You',
    email: 'you@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=You',
    bio: 'Learning and growing every day!',
    coins: 800,
    hasSkills: [],
    wantSkills: [],
    createdAt: '2024-03-01T10:00:00Z',
  },
];

// Add skills to users
mockUsers[0].hasSkills = [
  { id: 'us-1', userId: 'user-1', type: UserSkillType.HAS, skill: mockSkills[0] },
  { id: 'us-2', userId: 'user-1', type: UserSkillType.HAS, skill: mockSkills[2] },
];
mockUsers[0].wantSkills = [
  { id: 'us-3', userId: 'user-1', type: UserSkillType.WANTS, skill: mockSkills[5] },
];

mockUsers[1].hasSkills = [
  { id: 'us-4', userId: 'user-2', type: UserSkillType.HAS, skill: mockSkills[4] },
];
mockUsers[1].wantSkills = [
  { id: 'us-5', userId: 'user-2', type: UserSkillType.WANTS, skill: mockSkills[0] },
];

mockUsers[2].hasSkills = [
  { id: 'us-6', userId: 'user-3', type: UserSkillType.HAS, skill: mockSkills[3] },
  { id: 'us-7', userId: 'user-3', type: UserSkillType.HAS, skill: mockSkills[5] },
  { id: 'us-8', userId: 'user-3', type: UserSkillType.HAS, skill: mockSkills[8] },
];

mockUsers[3].hasSkills = [
  { id: 'us-9', userId: 'user-4', type: UserSkillType.HAS, skill: mockSkills[2] },
  { id: 'us-10', userId: 'user-4', type: UserSkillType.HAS, skill: mockSkills[6] },
];

mockUsers[4].hasSkills = [
  { id: 'us-11', userId: 'user-5', type: UserSkillType.HAS, skill: mockSkills[0] },
  { id: 'us-12', userId: 'user-5', type: UserSkillType.HAS, skill: mockSkills[1] },
];

mockUsers[5].hasSkills = [
  { id: 'us-13', userId: 'current-user', type: UserSkillType.HAS, skill: mockSkills[0] },
  { id: 'us-14', userId: 'current-user', type: UserSkillType.HAS, skill: mockSkills[1] },
];
mockUsers[5].wantSkills = [
  { id: 'us-15', userId: 'current-user', type: UserSkillType.WANTS, skill: mockSkills[5] },
  { id: 'us-16', userId: 'current-user', type: UserSkillType.WANTS, skill: mockSkills[9] },
];

// Current user for authentication
export const currentUser = mockUsers[5];

// Mock Study Rooms
export const mockStudyRooms: StudyRoom[] = [
  {
    id: 'sr-1',
    title: 'React Hooks Deep Dive',
    description: 'Exploring advanced React hooks and custom hook patterns. We will cover useState, useEffect, useContext, and build custom hooks together.',
    sessionStatus: SessionStatus.ONGOING,
    date: new Date().toISOString(),
    duration: 90,
    maxParticipants: 8,
    createdBy: mockUsers[0],
    learners: [],
    skills: [{ id: 'srs-1', studyRoom: {} as StudyRoom, skill: mockSkills[0] }],
    payments: [],
    reviews: [],
    participantCount: 3,
    isFull: false,
  },
  {
    id: 'sr-2',
    title: 'UI/UX Design Principles',
    description: 'Learn the fundamentals of user-centered design, typography, color theory, and layout principles.',
    sessionStatus: SessionStatus.UPCOMING,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 120,
    maxParticipants: 10,
    createdBy: mockUsers[1],
    learners: [],
    skills: [{ id: 'srs-2', studyRoom: {} as StudyRoom, skill: mockSkills[4] }],
    payments: [],
    reviews: [],
    participantCount: 2,
    isFull: false,
  },
  {
    id: 'sr-3',
    title: 'Python for Data Science',
    description: 'Introduction to pandas, numpy, and data visualization with matplotlib and seaborn.',
    sessionStatus: SessionStatus.ONGOING,
    date: new Date().toISOString(),
    duration: 150,
    maxParticipants: 12,
    createdBy: mockUsers[2],
    learners: [],
    skills: [
      { id: 'srs-3', studyRoom: {} as StudyRoom, skill: mockSkills[3] },
      { id: 'srs-4', studyRoom: {} as StudyRoom, skill: mockSkills[5] },
    ],
    payments: [],
    reviews: [],
    participantCount: 4,
    isFull: false,
  },
  {
    id: 'sr-4',
    title: 'TypeScript Best Practices',
    description: 'Advanced TypeScript patterns, generics, utility types, and type guards.',
    sessionStatus: SessionStatus.UPCOMING,
    date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    maxParticipants: 6,
    createdBy: mockUsers[4],
    learners: [],
    skills: [{ id: 'srs-5', studyRoom: {} as StudyRoom, skill: mockSkills[1] }],
    payments: [],
    reviews: [],
    participantCount: 5,
    isFull: false,
  },
];

// Mock Reviews
export const mockReviews: Review[] = [
  {
    id: 'rev-1',
    rating: 5,
    review: 'Excellent session! Sarah explained React hooks very clearly and answered all my questions.',
    reviewer: mockUsers[4],
    reviewee: mockUsers[0],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-2',
    rating: 4,
    review: 'Great insights into UI/UX design. Alex provided practical examples and useful resources.',
    reviewer: mockUsers[0],
    reviewee: mockUsers[1],
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-3',
    rating: 5,
    review: 'Dr. Kumar is an amazing teacher! The Python session was very comprehensive.',
    reviewer: mockUsers[3],
    reviewee: mockUsers[2],
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'rev-4',
    rating: 5,
    review: 'Very helpful session on Node.js backend development. Marcus knows his stuff!',
    reviewer: mockUsers[5],
    reviewee: mockUsers[3],
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// Mock Peer Cards for Browse
export const mockPeerCards: PeerCard[] = [
  {
    id: 'pc-1',
    type: 'peer',
    user: mockUsers[0],
    skillsTeachable: [mockSkills[0], mockSkills[2]],
    rating: 4.8,
    reviewCount: 24,
  },
  {
    id: 'pc-2',
    type: 'peer',
    user: mockUsers[1],
    skillsTeachable: [mockSkills[4]],
    rating: 4.9,
    reviewCount: 18,
  },
  {
    id: 'pc-3',
    type: 'peer',
    user: mockUsers[2],
    skillsTeachable: [mockSkills[3], mockSkills[5], mockSkills[8]],
    rating: 5.0,
    reviewCount: 42,
  },
  {
    id: 'pc-4',
    type: 'peer',
    user: mockUsers[3],
    skillsTeachable: [mockSkills[2], mockSkills[6]],
    rating: 4.7,
    reviewCount: 15,
  },
  {
    id: 'pc-5',
    type: 'peer',
    user: mockUsers[4],
    skillsTeachable: [mockSkills[0], mockSkills[1]],
    rating: 4.8,
    reviewCount: 21,
  },
];

// Mock Study Room Cards for Browse
export const mockStudyRoomCards: StudyRoomCard[] = mockStudyRooms.map((sr) => ({
  id: sr.id,
  type: 'studyRoom',
  studyRoom: sr,
  participantCount: sr.participantCount || 0,
  maxParticipants: sr.maxParticipants,
  isFull: (sr.participantCount || 0) >= sr.maxParticipants,
  timeRemaining: sr.sessionStatus === SessionStatus.ONGOING ? '45 min left' : undefined,
}));

// Mock Metric Cards
export const mockMetrics: MetricCard[] = [
  {
    name: 'Sessions Completed',
    value: 12,
    description: 'Total sessions attended',
    icon: 'check-circle',
  },
  {
    name: 'Average Rating',
    value: '4.8',
    description: 'Based on 8 reviews',
    icon: 'star',
  },
  {
    name: 'Skills Learned',
    value: 5,
    description: 'New skills acquired',
    icon: 'book',
  },
  {
    name: 'WEBYA Earned',
    value: 450,
    description: 'Total earnings',
    icon: 'coins',
  },
];

// Mock Notifications
export const mockNotifications: Notification[] = [
  {
    id: 'notif-1',
    notifType: NotifType.URGENT,
    message: 'New session request from Emma Wilson',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    viewed: false,
    user: currentUser,
  },
  {
    id: 'notif-2',
    notifType: NotifType.NORMAL,
    message: 'Your session "TypeScript Basics" starts in 2 hours',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    viewed: false,
    user: currentUser,
  },
  {
    id: 'notif-3',
    notifType: NotifType.NORMAL,
    message: 'Marcus Johnson left you a 5-star review',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    viewed: true,
    user: currentUser,
  },
];

// Mock Peer Sessions
export const mockPeerSessions: PeerSession[] = [
  {
    id: 'ps-1',
    title: 'React Advanced Patterns',
    description: 'One-on-one session on advanced React patterns',
    sessionStatus: SessionStatus.UPCOMING,
    date: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    duration: 60,
    requestedBy: currentUser,
    requestedTo: mockUsers[0],
    skills: [{ id: 'pss-1', peerSession: {} as PeerSession, skill: mockSkills[0] }],
    reviews: [],
  },
  {
    id: 'ps-2',
    title: 'UI/UX Consultation',
    description: 'Portfolio review and design feedback',
    sessionStatus: SessionStatus.UPCOMING,
    date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    duration: 45,
    requestedBy: mockUsers[4],
    requestedTo: currentUser,
    skills: [{ id: 'pss-2', peerSession: {} as PeerSession, skill: mockSkills[4] }],
    reviews: [],
  },
];

// Mock Transactions
export const mockTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: TransactionType.EARNED,
    amount: 50,
    description: 'Payment from React Hooks session',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    relatedUser: mockUsers[4],
  },
  {
    id: 'tx-2',
    type: TransactionType.SPENT,
    amount: 30,
    description: 'Joined Python Data Science workshop',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    relatedUser: mockUsers[2],
  },
  {
    id: 'tx-3',
    type: TransactionType.EARNED,
    amount: 40,
    description: 'Payment from TypeScript session',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    relatedUser: mockUsers[3],
  },
  {
    id: 'tx-4',
    type: TransactionType.REFUNDED,
    amount: 25,
    description: 'Refund for cancelled session',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    relatedUser: mockUsers[1],
  },
];

// Helper function to get user rating
export function getUserRating(userId: string): number {
  const userReviews = mockReviews.filter(r => r.reviewee.id === userId);
  if (userReviews.length === 0) return 0;
  const sum = userReviews.reduce((acc, r) => acc + r.rating, 0);
  return sum / userReviews.length;
}

// Helper function to get user review count
export function getUserReviewCount(userId: string): number {
  return mockReviews.filter(r => r.reviewee.id === userId).length;
}
