export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary';

export type AchievementCategory =
  | 'learning'
  | 'teaching'
  | 'social'
  | 'milestone'
  | 'streak';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  unlockedAt?: Date | string;
  progress?: number;
  maxProgress?: number;
  pointReward?: number;
}

export interface UserAchievements {
  unlocked: Achievement[];
  inProgress: Achievement[];
  locked: Achievement[];
  totalUnlocked: number;
  totalAvailable: number;
}

// Mock achievements for display
export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: '1',
    title: 'First Session',
    description: 'Complete your first learning session',
    icon: '🎯',
    category: 'learning',
    rarity: 'common',
    unlockedAt: new Date(),
    progress: 1,
    maxProgress: 1,
    pointReward: 10,
  },
  {
    id: '2',
    title: 'Helpful Tutor',
    description: 'Teach 10 sessions',
    icon: '👨‍🏫',
    category: 'teaching',
    rarity: 'rare',
    progress: 7,
    maxProgress: 10,
    pointReward: 50,
  },
  {
    id: '3',
    title: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '🔥',
    category: 'streak',
    rarity: 'epic',
    progress: 5,
    maxProgress: 7,
    pointReward: 100,
  },
  {
    id: '4',
    title: 'Master Educator',
    description: 'Receive 5-star rating on 50 sessions',
    icon: '⭐',
    category: 'teaching',
    rarity: 'legendary',
    progress: 12,
    maxProgress: 50,
    pointReward: 500,
  },
  {
    id: '5',
    title: 'Social Butterfly',
    description: 'Connect with 20 different learners',
    icon: '🦋',
    category: 'social',
    rarity: 'rare',
    pointReward: 75,
  },
];
