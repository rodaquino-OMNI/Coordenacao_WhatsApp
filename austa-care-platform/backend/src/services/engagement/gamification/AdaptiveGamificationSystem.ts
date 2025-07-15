import { BaseEngagementService, Repository, MockRepository } from '../base/BaseEngagementService';

export interface UserProgress {
  id?: string;
  userId: string;
  level: number;
  points: number;
  badges: string[];
  achievements: string[];
  lastActivity: Date;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  points: number;
  criteria: any;
  unlocked: boolean;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  participants: string[];
  rewards: string[];
}

export class AdaptiveGamificationSystem extends BaseEngagementService {
  private userProgressRepository: Repository<UserProgress>;
  private achievementRepository: Repository<Achievement>;
  private challengeRepository: Repository<Challenge>;

  constructor(
    userProgressRepository?: Repository<UserProgress>,
    achievementRepository?: Repository<Achievement>,
    challengeRepository?: Repository<Challenge>
  ) {
    super({ name: 'AdaptiveGamificationSystem', version: '1.0.0' });
    this.userProgressRepository = userProgressRepository || new MockRepository<UserProgress>();
    this.achievementRepository = achievementRepository || new MockRepository<Achievement>();
    this.challengeRepository = challengeRepository || new MockRepository<Challenge>();
  }

  protected async onInitialize(): Promise<void> {
    console.log('AdaptiveGamificationSystem initialized');
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    let progress = await this.userProgressRepository.findOne({ where: { userId } });
    
    if (!progress) {
      progress = {
        userId,
        level: 1,
        points: 0,
        badges: [],
        achievements: [],
        lastActivity: new Date()
      };
      progress = await this.userProgressRepository.save(progress);
    }
    
    return progress;
  }

  async awardPoints(userId: string, points: number, reason: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId);
    progress.points += points;
    progress.lastActivity = new Date();
    
    // Check for level up
    const newLevel = Math.floor(progress.points / 100) + 1;
    if (newLevel > progress.level) {
      progress.level = newLevel;
      this.emit('level_up', { userId, newLevel, points: progress.points });
    }
    
    return await this.userProgressRepository.save(progress);
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserProgress> {
    const progress = await this.getUserProgress(userId);
    
    if (!progress.achievements.includes(achievementId)) {
      progress.achievements.push(achievementId);
      progress.lastActivity = new Date();
      
      this.emit('achievement_unlocked', { userId, achievementId });
      return await this.userProgressRepository.save(progress);
    }
    
    return progress;
  }

  async createChallenge(challenge: Omit<Challenge, 'id'>): Promise<Challenge> {
    const newChallenge: Challenge = {
      ...challenge,
      id: Date.now().toString()
    };
    
    return await this.challengeRepository.save(newChallenge);
  }

  async joinChallenge(userId: string, challengeId: string): Promise<void> {
    const challenge = await this.challengeRepository.findOne({ where: { id: challengeId } });
    if (challenge && !challenge.participants.includes(userId)) {
      challenge.participants.push(userId);
      await this.challengeRepository.save(challenge);
      this.emit('challenge_joined', { userId, challengeId });
    }
  }
}

export const adaptiveGamificationSystem = new AdaptiveGamificationSystem();