import { BaseEngagementService, Repository, MockRepository } from '../base/BaseEngagementService';

export interface SocialInteraction {
  id?: string;
  fromUserId: string;
  toUserId: string;
  type: 'support' | 'encouragement' | 'advice' | 'sharing';
  content: string;
  timestamp: Date;
}

export interface CommunityGroup {
  id: string;
  name: string;
  description: string;
  members: string[];
  createdAt: Date;
}

export class SocialEngagementEngine extends BaseEngagementService {
  private socialInteractionRepository: Repository<SocialInteraction>;
  private communityGroupRepository: Repository<CommunityGroup>;

  constructor(
    socialInteractionRepository?: Repository<SocialInteraction>,
    communityGroupRepository?: Repository<CommunityGroup>
  ) {
    super({ name: 'SocialEngagementEngine', version: '1.0.0' });
    this.socialInteractionRepository = socialInteractionRepository || new MockRepository<SocialInteraction>();
    this.communityGroupRepository = communityGroupRepository || new MockRepository<CommunityGroup>();
  }

  protected async onInitialize(): Promise<void> {
    console.log('SocialEngagementEngine initialized');
  }

  async recordInteraction(interaction: Omit<SocialInteraction, 'id' | 'timestamp'>): Promise<SocialInteraction> {
    const newInteraction: SocialInteraction = {
      ...interaction,
      timestamp: new Date()
    };
    
    const saved = await this.socialInteractionRepository.save(newInteraction);
    this.emit('social_interaction', saved);
    
    return saved;
  }

  async createGroup(group: Omit<CommunityGroup, 'id' | 'createdAt'>): Promise<CommunityGroup> {
    const newGroup: CommunityGroup = {
      ...group,
      id: Date.now().toString(),
      createdAt: new Date()
    };
    
    return await this.communityGroupRepository.save(newGroup);
  }

  async joinGroup(userId: string, groupId: string): Promise<void> {
    const group = await this.communityGroupRepository.findOne({ where: { id: groupId } });
    if (group && !group.members.includes(userId)) {
      group.members.push(userId);
      await this.communityGroupRepository.save(group);
      this.emit('group_joined', { userId, groupId });
    }
  }

  async getSocialMetrics(userId: string): Promise<{
    interactionsGiven: number;
    interactionsReceived: number;
    supportLevel: number;
    communityEngagement: number;
  }> {
    const given = await this.socialInteractionRepository.count({ where: { fromUserId: userId } });
    const received = await this.socialInteractionRepository.count({ where: { toUserId: userId } });
    
    return {
      interactionsGiven: given,
      interactionsReceived: received,
      supportLevel: Math.min(1, (given + received) / 10),
      communityEngagement: Math.min(1, given / 5)
    };
  }
}

export const socialEngagementEngine = new SocialEngagementEngine();