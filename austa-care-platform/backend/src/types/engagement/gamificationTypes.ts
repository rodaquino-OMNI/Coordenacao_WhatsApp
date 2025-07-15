// Gamification System Types
export enum RewardType {
  POINTS = 'points',
  BADGES = 'badges',
  ACHIEVEMENTS = 'achievements',
  HEALTH_INSIGHTS = 'health_insights',
  SOCIAL_RECOGNITION = 'social_recognition',
  PRACTICAL_BENEFITS = 'practical_benefits',
  CUSTOMIZATION = 'customization'
}

export enum AchievementCategory {
  CONSISTENCY = 'consistency',
  MILESTONE = 'milestone',
  IMPROVEMENT = 'improvement',
  SOCIAL = 'social',
  LEARNING = 'learning',
  HEALTH_OUTCOME = 'health_outcome'
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  criteria: AchievementCriteria;
  rewards: Reward[];
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon: string;
  isActive: boolean;
  personalityTypes: string[]; // Which personality types this appeals to
  healthConditions?: string[]; // Specific conditions this applies to
}

export interface AchievementCriteria {
  type: string;
  metric: string;
  threshold: number;
  timeframe?: string;
  streakRequired?: number;
  conditions?: Record<string, any>;
}

export interface Reward {
  type: RewardType;
  value: number | string;
  description: string;
  deliveryMethod: 'immediate' | 'delayed' | 'cumulative';
  expirationDate?: Date;
}

export interface UserProgress {
  userId: string;
  totalPoints: number;
  level: number;
  experiencePoints: number;
  nextLevelThreshold: number;
  achievements: UserAchievement[];
  badges: UserBadge[];
  streaks: UserStreak[];
  challenges: UserChallenge[];
  socialStats: SocialStats;
  personalizedRewards: PersonalizedReward[];
  lastUpdated: Date;
}

export interface UserAchievement {
  achievementId: string;
  unlockedAt: Date;
  progress: number; // 0-1
  isCompleted: boolean;
  rewards: Reward[];
  sharedSocially?: boolean;
}

export interface UserBadge {
  badgeId: string;
  earnedAt: Date;
  level: number;
  rarity: string;
  displayOrder: number;
}

export interface UserStreak {
  type: string;
  currentCount: number;
  bestCount: number;
  lastActivityDate: Date;
  isActive: boolean;
  milestones: StreakMilestone[];
}

export interface StreakMilestone {
  count: number;
  reward: Reward;
  achieved: boolean;
  achievedAt?: Date;
}

export interface UserChallenge {
  challengeId: string;
  startDate: Date;
  endDate: Date;
  progress: number; // 0-1
  isCompleted: boolean;
  participants?: string[]; // For group challenges
  ranking?: number;
  rewards: Reward[];
}

export interface SocialStats {
  friendsCount: number;
  challengesWon: number;
  helpfulVotes: number;
  storiesShared: number;
  mentorshipSessions: number;
  communityRank: number;
}

export interface PersonalizedReward {
  userId: string;
  rewardType: RewardType;
  reason: string;
  value: any;
  issuedAt: Date;
  claimedAt?: Date;
  expiresAt?: Date;
  personalityMatch: number; // 0-1, how well this matches their preferences
}

export interface GamificationEvent {
  userId: string;
  eventType: string;
  points: number;
  achievements?: string[];
  badges?: string[];
  streakUpdates?: Record<string, number>;
  socialImpact?: SocialImpact;
  timestamp: Date;
  context: Record<string, any>;
}

export interface SocialImpact {
  type: 'challenge_completion' | 'milestone_achievement' | 'helping_others' | 'story_sharing';
  visibility: 'private' | 'friends' | 'community' | 'public';
  recipients?: string[];
  message?: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  type: 'individual' | 'group' | 'community';
  category: string;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert';
  duration: number; // in days
  criteria: ChallengeCriteria;
  rewards: Reward[];
  participants: ChallengeParticipant[];
  maxParticipants?: number;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  personalityTargets: string[];
}

export interface ChallengeCriteria {
  metric: string;
  target: number;
  timeframe: string;
  conditions?: Record<string, any>;
}

export interface ChallengeParticipant {
  userId: string;
  joinedAt: Date;
  progress: number;
  ranking: number;
  isCompleted: boolean;
  completedAt?: Date;
}