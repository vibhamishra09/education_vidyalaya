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
}

export interface UpdateDebateRoomDto {
  topic?: string;
  description?: string;
  maxParticipants?: number;
  turnDurationSeconds?: number;
  prepTimeSeconds?: number;
  turnOrder?: TurnOrderType;
}

export interface JoinDebateRoomDto {
  preferredSide?: DebateSide;
}

export interface DebateRoomFilters {
  search?: string;
  status?: DebateStatus;
  page?: number;
  limit?: number;
}

// Response Types
export interface DebateParticipant {
  id: string;
  side: DebateSide;
  status: ParticipantStatus;
  turnCompleted: boolean;
  user: {
    id: string;
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
  currentTurnIndex: number;
  currentSpeakerId?: string | null;
  turnStartedAt?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  host: {
    id: string;
    name: string;
    avatar?: string | null;
  };
  teams: DebateTeam[];
  moderators: DebateModerator[];
  livekitRoomName?: string | null;
  createdAt: string;
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
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary?: string | null;
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
  teams: {
    side: DebateSide;
    totalScore: number;
    isWinner: boolean;
    participantCount: number;
  }[];
  reports: DebateReport[];
}

// Socket Event Types
export interface DebateState {
  roomId: string;
  status: DebateStatus;
  currentTurnIndex: number;
  currentSpeakerId: string | null;
  turnStartedAt: string | null;
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

export interface PrepCountdownEvent {
  secondsRemaining: number;
  startsAt: string;
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

// LiveKit Token Response
export interface DebateLivekitTokenResponse {
  token: string;
  serverUrl: string;
  roomName: string;
}

// User Role in Debate
export type DebateUserRole = 'host' | 'moderator' | 'participant' | 'spectator' | null;

// Computed helper to get user's role in debate
export function getUserDebateRole(
  debateRoom: DebateRoom,
  userId: string
): DebateUserRole {
  // Check if host
  if (debateRoom.host.id === userId) {
    return 'host';
  }

  // Check if moderator
  const moderator = debateRoom.moderators.find(m => m.user.id === userId);
  if (moderator) {
    return moderator.isHost ? 'host' : 'moderator';
  }

  // Check if participant
  for (const team of debateRoom.teams) {
    if (team.participants.some(p => p.user.id === userId)) {
      return 'participant';
    }
  }

  return 'spectator';
}

// Get user's team side
export function getUserTeamSide(
  debateRoom: DebateRoom,
  userId: string
): DebateSide | null {
  for (const team of debateRoom.teams) {
    if (team.participants.some(p => p.user.id === userId)) {
      return team.side;
    }
  }
  return null;
}
