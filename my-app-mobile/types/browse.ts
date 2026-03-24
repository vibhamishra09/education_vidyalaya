export type Skill = {
  id: string;
  name: string;
};

export type BrowsePeer = {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
  skills: Skill[];
  rating?: number;
  reviewCount?: number;
  totalSessions?: number;
};

export type StudyRoom = {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO date string
  startTime: string; // HH:mm
  duration: number; // minutes
  skills: Skill[];
  participantCount: number;
  maxParticipants: number;
  host: {
    id: string;
    name: string;
    avatar?: string;
  };
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
};
