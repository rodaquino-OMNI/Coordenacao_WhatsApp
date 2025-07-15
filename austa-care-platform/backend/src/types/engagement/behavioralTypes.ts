// Behavioral Intelligence Types
export enum EngagementPattern {
  HIGHLY_ENGAGED = 'highly_engaged',
  MODERATELY_ENGAGED = 'moderately_engaged',
  SPORADICALLY_ENGAGED = 'sporadically_engaged',
  DISENGAGED = 'disengaged',
  RE_ENGAGING = 're_engaging'
}

export enum MotivationType {
  INTRINSIC = 'intrinsic',
  EXTRINSIC = 'extrinsic',
  SOCIAL = 'social',
  ACHIEVEMENT = 'achievement',
  FEAR_BASED = 'fear_based',
  CURIOSITY_DRIVEN = 'curiosity_driven'
}

export enum CommunicationStyle {
  DIRECT = 'direct',
  SUPPORTIVE = 'supportive',
  ANALYTICAL = 'analytical',
  EMPATHETIC = 'empathetic',
  HUMOROUS = 'humorous',
  PROFESSIONAL = 'professional'
}

export enum RiskTolerance {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  VERY_LOW = 'very_low'
}

export enum LiteracyLevel {
  BASIC = 'basic',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export enum CulturalContext {
  INDIVIDUALISTIC = 'individualistic',
  COLLECTIVISTIC = 'collectivistic',
  HIERARCHICAL = 'hierarchical',
  EGALITARIAN = 'egalitarian'
}

export interface UserBehaviorProfile {
  userId: string;
  engagementPattern: EngagementPattern;
  motivationType: MotivationType;
  communicationPreference: CommunicationStyle;
  riskTolerance: RiskTolerance;
  healthLiteracyLevel: LiteracyLevel;
  culturalContext: CulturalContext;
  preferredContactTimes: ContactTime[];
  responseTimePattern: number; // Average response time in minutes
  sessionLengthPreference: number; // Preferred session length in minutes
  topicInterests: string[];
  avoidanceTopics: string[];
  lastProfileUpdate: Date;
  confidenceScore: number; // 0-1, how confident we are in this profile
}

export interface ContactTime {
  dayOfWeek: number; // 0-6, Sunday = 0
  startHour: number; // 0-23
  endHour: number; // 0-23
  timezone: string;
}

export interface BehavioralInsight {
  userId: string;
  insightType: string;
  insight: string;
  confidence: number;
  generatedAt: Date;
  actionable: boolean;
  suggestedActions?: string[];
}

export interface EngagementEvent {
  userId: string;
  eventType: string;
  timestamp: Date;
  sessionId: string;
  duration?: number;
  quality?: number; // 0-1 engagement quality score
  context: Record<string, any>;
  sentiment?: number; // -1 to 1
  topics?: string[];
}

export interface BehaviorAnalysisResult {
  profile: UserBehaviorProfile;
  insights: BehavioralInsight[];
  recommendations: EngagementRecommendation[];
  riskScore: number; // 0-1, risk of disengagement
  lastAnalysis: Date;
}

export interface EngagementRecommendation {
  type: string;
  priority: 'high' | 'medium' | 'low';
  action: string;
  rationale: string;
  expectedImpact: number; // 0-1
  timeframe: string;
  metrics: string[];
}