// Debate Room Types

export enum DebateStatus {
  WAITING = 'WAITING',
  PREP = 'PREP',
  LIVE = 'LIVE',
  ENDED = 'ENDED',
  PROCESSED = 'PROCESSED',
  CANCELLED = 'CANCELLED',
}

export enum TurnOrderType {
  FIFO = 'FIFO',
  RANDOM = 'RANDOM',
}

export enum DebateSide {
  FOR = 'FOR',
  AGAINST = 'AGAINST',
}

export enum ParticipantStatus {
  ACTIVE = 'ACTIVE',
  SPEAKING = 'SPEAKING',
  COMPLETED = 'COMPLETED',
  DISCONNECTED = 'DISCONNECTED',
  BANNED = 'BANNED',
}

// Request DTOs
export interface CreateDebateRoomDto {
  topic: string;
  description?: string;
  maxParticipants?: number;
  turnDurationSeconds?: number;
  prepTimeSeconds?: number;
  turnOrder?: TurnOrderType;
  scheduledAt?: string; // ISO 8601 date string
  /** Total planned session (minutes); required when creating a room. */
  debateDurationMinutes: number;
}

export interface UpdateDebateRoomDto {
  topic?: string;
  description?: string;
  maxParticipants?: number;
  turnDurationSeconds?: number;
  prepTimeSeconds?: number;
  turnOrder?: TurnOrderType;
  /** ISO 8601 — only while status is WAITING */
  scheduledAt?: string;
  /** Remove fixed start time (WAITING only) */
  clearScheduledAt?: boolean;
  debateDurationMinutes?: number;
}

export interface JoinDebateRoomDto {
  preferredSide?: DebateSide;
}

export interface DebateRoomFilters {
  search?: string;
  status?: DebateStatus;
  page?: number;
  limit?: number;
  trending?: boolean;
  sort?: 'hybrid' | 'newest' | 'upcoming';
}

// Response Types
export interface DebateParticipant {
  id: string;
  side: DebateSide;
  status: ParticipantStatus;
  turnCompleted: boolean;
  user: {
    id: string;
    clerkId: string;
    name: string;
    avatar?: string | null;
  };
}

export interface DebateTeam {
  id: string;
  side: DebateSide;
  participants: DebateParticipant[];
  totalScore?: number | null;
  isWinner: boolean;
}

export interface DebateModerator {
  id: string;
  isHost: boolean;
  user: {
    id: string;
    clerkId: string;
    name: string;
    avatar?: string | null;
  };
}

export interface DebateRoom {
  id: string;
  topic: string;
  description?: string | null;
  status: DebateStatus;
  maxParticipants: number;
  turnDurationSeconds: number;
  prepTimeSeconds: number;
  turnOrder: TurnOrderType;
  debateDurationMinutes?: number;
  debateSlotEndsAt?: string | null;
  currentTurnIndex: number;
  currentSpeakerId?: string | null;
  turnStartedAt?: string | null;
  scheduledAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  host: {
    id: string;
    clerkId: string;
    name: string;
    avatar?: string | null;
  };
  teams: DebateTeam[];
  moderators: DebateModerator[];
  livekitRoomName?: string | null;
  createdAt: string;
  hostDetailsUpdatedAt?: string | null;
}

/** Rough upper bound if everyone on both teams takes one full turn (for UI hints only). */
export function estimateDebateSessionMinutes(
  turnDurationSeconds: number,
  maxParticipantsPerTeam: number,
): number {
  return Math.max(
    1,
    Math.round((turnDurationSeconds * maxParticipantsPerTeam * 2) / 60),
  );
}

export interface DebateRoomsResponse {
  debateRooms: DebateRoom[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface DebateReport {
  participantId: string;
  ideaScore: number;
  clarityScore: number;
  rebuttalScore: number;
  overallScore: number;
  aiScore?: number | null;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary?: string | null;
  judgeReviews?: {
    moderatorId: string;
    moderatorName: string;
    turnNumber: number;
    notes?: string | null;
    scores: Record<string, number>;
    createdAt: string;
  }[];
  participant?: {
    user: {
      id: string;
      name: string;
      avatar?: string | null;
    };
    team: {
      side: DebateSide;
    };
  };
}

export interface DebateResults {
  debateRoomId: string;
  topic: string;
  winningTeam: DebateSide | null;
  aiScoringStatus?: 'pending';
  teams: {
    side: DebateSide;
    totalScore: number;
    isWinner: boolean;
    participantCount: number;
  }[];
  reports: DebateReport[];
}

export type DebateEvaluationScores = Record<string, number>;

export interface DebateGradingFactor {
  key: string;
  label: string;
}

export const DEFAULT_DEBATE_GRADING_FACTORS: DebateGradingFactor[] = [
  { key: 'clarityOfThoughts', label: 'Clarity of Thoughts' },
  { key: 'factCheck', label: 'Fact Check' },
  { key: 'argumentQuality', label: 'Argument Quality' },
];

export interface DebateModeratorEvaluation {
  id: string;
  debateRoomId: string;
  participantId: string;
  moderatorId: string;
  turnNumber: number;
  notes?: string | null;
  scores: DebateEvaluationScores;
  createdAt: string;
  updatedAt: string;
  participant?: {
    id: string;
    user: {
      id: string;
      clerkId: string;
      name: string;
      avatar?: string | null;
    };
    team: {
      side: DebateSide;
    };
  };
}

export interface UpsertDebateModeratorEvaluationDto {
  participantId: string;
  turnNumber: number;
  notes?: string;
  scores?: DebateEvaluationScores;
}

export interface ModeratorEvaluationsQuery {
  participantId?: string;
  turnNumber?: number;
}

// Socket Event Types
export interface DebateState {
  roomId: string;
  status: DebateStatus;
  currentTurnIndex: number;
  currentSpeakerId: string | null;
  turnStartedAt: string | null;
  turnEndTime?: number | null;
  prepEndTime?: number | null;
  turnDurationSeconds: number;
  prepTimeSeconds: number;
  teams: {
    FOR: string[];
    AGAINST: string[];
  };
  turnQueue: string[];
  buzzerQueue: string[];
}

export interface TurnStartedEvent {
  participantId: string;
  participantUserId: string;
  participantName: string;
  side: DebateSide;
  turnIndex: number;
  duration: number;
  startedAt: string;
}

export interface TurnEndedEvent {
  participantId: string;
  participantUserId: string;
  nextParticipantId?: string;
  nextParticipantUserId?: string;
  nextSide?: DebateSide;
}

export interface PrepStartedEvent {
  prepEndTime: number;
}

export interface PrepCountdownEvent {
  secondsRemaining: number;
}

export interface BuzzerPressedEvent {
  participantId: string;
  participantUserId: string;
  participantName: string;
  side: DebateSide;
  timestamp: string;
  queuePosition: number;
}

export interface TeamChatMessage {
  id: string;
  participantId: string;
  participantName: string;
  side: DebateSide;
  message: string;
  timestamp: string;
}

export interface DebateEndedEvent {
  roomId: string;
  reason: 'completed' | 'cancelled' | 'timeout';
  endedAt: string;
}

export interface ParticipantJoinedEvent {
  participantId: string;
  userId: string;
  name: string;
  avatar?: string | null;
  side: DebateSide;
  teamSize: { FOR: number; AGAINST: number };
}

export interface ParticipantLeftEvent {
  participantId: string;
  userId: string;
  side: DebateSide;
  teamSize: { FOR: number; AGAINST: number };
}

export interface MicEnabledEvent {
  participantId: string;
  reason: 'moderator' | 'turn' | 'manual';
}

export interface MicDisabledEvent {
  participantId: string;
  reason: 'turn_ended' | 'debate_ended' | 'manual';
}

// LiveKit Token Response
export interface DebateLivekitTokenResponse {
  token: string;
  serverUrl: string;
  roomName: string;
}

// User Role in Debate
export type DebateUserRole = 'host' | 'moderator' | 'participant' | 'spectator' | null;

const DEBATE_HOST_EDIT_BLOCKED: DebateStatus[] = [
  DebateStatus.ENDED,
  DebateStatus.PROCESSED,
  DebateStatus.CANCELLED,
];

/** Host may edit from list cards; uses internal user id (same as API current user). */
export function canDebateHostEditFromCard(opts: {
  currentUserId?: string | null;
  hostUserId: string;
  status: DebateStatus;
}): boolean {
  if (!opts.currentUserId || opts.currentUserId !== opts.hostUserId) {
    return false;
  }
  return !DEBATE_HOST_EDIT_BLOCKED.includes(opts.status);
}

// Computed helper to get user's role in debate
export function getUserDebateRole(
  debateRoom: DebateRoom,
  userId: string // This is the Clerk userId
): DebateUserRole {
  // Check if host (compare with clerkId)
  if (debateRoom.host.clerkId === userId) {
    return 'host';
  }

  // Check if moderator (compare with clerkId)
  const moderator = debateRoom.moderators.find(m => m.user.clerkId === userId);
  if (moderator) {
    return moderator.isHost ? 'host' : 'moderator';
  }

  // Check if participant (compare with clerkId)
  for (const team of debateRoom.teams) {
    if (team.participants.some(p => p.user.clerkId === userId)) {
      return 'participant';
    }
  }

  return 'spectator';
}

// Get user's team side
export function getUserTeamSide(
  debateRoom: DebateRoom,
  userId: string // This is the Clerk userId
): DebateSide | null {
  for (const team of debateRoom.teams) {
    if (team.participants.some(p => p.user.clerkId === userId)) {
      return team.side;
    }
  }
  return null;
}
