import { BaseEngagementService, Repository, MockRepository } from '../base/BaseEngagementService';
import { UserBehaviorProfile, EngagementEvent } from '../../../types/engagement/behavioralTypes';

export class BehavioralIntelligenceEngine extends BaseEngagementService {
  private userBehaviorRepository: Repository<UserBehaviorProfile>;
  private engagementEventRepository: Repository<EngagementEvent>;

  constructor(
    userBehaviorRepository?: Repository<UserBehaviorProfile>,
    engagementEventRepository?: Repository<EngagementEvent>
  ) {
    super({ name: 'BehavioralIntelligenceEngine', version: '1.0.0' });
    this.userBehaviorRepository = userBehaviorRepository || new MockRepository<UserBehaviorProfile>();
    this.engagementEventRepository = engagementEventRepository || new MockRepository<EngagementEvent>();
  }

  protected async onInitialize(): Promise<void> {
    console.log('BehavioralIntelligenceEngine initialized');
  }

  async analyzeBehavior(userId: string): Promise<UserBehaviorProfile> {
    const existingProfile = await this.userBehaviorRepository.findOne({ where: { userId } });
    
    if (existingProfile) {
      return existingProfile;
    }

    // Create a new behavior profile
    const profile: UserBehaviorProfile = {
      userId,
      engagementLevel: 0.5,
      communicationPreference: 'SUPPORTIVE' as any,
      healthLiteracyLevel: 'INTERMEDIATE' as any,
      culturalContext: 'WESTERN' as any,
      motivationFactors: ['health_improvement'],
      stressIndicators: [],
      copingMechanisms: [],
      socialSupport: 'moderate',
      technologyComfort: 'comfortable',
      preferredContactTimes: ['morning'],
      responsePatterns: [],
      goalAlignment: 0.5,
      adaptationSpeed: 0.5,
      lastUpdated: new Date()
    };

    return await this.userBehaviorRepository.save(profile);
  }

  async updateBehaviorProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<UserBehaviorProfile> {
    const existing = await this.userBehaviorRepository.findOne({ where: { userId } });
    if (!existing) {
      throw new Error(`User profile not found: ${userId}`);
    }

    const updated = { ...existing, ...updates, lastUpdated: new Date() };
    return await this.userBehaviorRepository.save(updated);
  }

  async trackEngagementEvent(event: EngagementEvent): Promise<void> {
    await this.engagementEventRepository.save(event);
    
    // Update behavior profile based on engagement
    const profile = await this.analyzeBehavior(event.userId);
    
    // Simple engagement level calculation
    const newEngagementLevel = Math.min(1, profile.engagementLevel + 0.1);
    
    await this.updateBehaviorProfile(event.userId, {
      engagementLevel: newEngagementLevel
    });
  }
}

export const behavioralIntelligenceEngine = new BehavioralIntelligenceEngine();