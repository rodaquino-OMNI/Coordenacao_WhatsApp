// Predictive Retention Types
export enum ChurnRiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum InterventionType {
  PERSONALIZED_CONTENT = 'personalized_content',
  SOCIAL_ENGAGEMENT = 'social_engagement',
  GAMIFICATION_BOOST = 'gamification_boost',
  HEALTH_COACH_CONTACT = 'health_coach_contact',
  EDUCATIONAL_CONTENT = 'educational_content',
  REWARD_INCENTIVE = 'reward_incentive',
  PEER_SUPPORT = 'peer_support',
  FAMILY_ENGAGEMENT = 'family_engagement'
}

export enum InterventionStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

export interface ChurnPrediction {
  userId: string;
  riskLevel: ChurnRiskLevel;
  churnProbability: number; // 0-1
  timeToChurn: number; // estimated days
  keyFactors: ChurnFactor[];
  predictionConfidence: number; // 0-1
  modelVersion: string;
  predictedAt: Date;
  lastEngagement: Date;
  interventionRecommendations: InterventionRecommendation[];
}

export interface ChurnFactor {
  factor: string;
  impact: number; // -1 to 1, negative = increases churn risk
  importance: number; // 0-1
  description: string;
  actionable: boolean;
}

export interface InterventionRecommendation {
  type: InterventionType;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  expectedEffectiveness: number; // 0-1
  effort: 'low' | 'medium' | 'high';
  timeframe: string;
  personalizedMessage?: string;
  triggerConditions?: TriggerCondition[];
}

export interface TriggerCondition {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  timeWindow: string;
}

export interface RetentionIntervention {
  id: string;
  userId: string;
  type: InterventionType;
  status: InterventionStatus;
  priority: string;
  triggeredBy: string;
  personalizedContent: PersonalizedContent;
  scheduledAt: Date;
  executedAt?: Date;
  completedAt?: Date;
  effectiveness: InterventionEffectiveness;
  followUpRequired: boolean;
  followUpAt?: Date;
  cost: number;
  createdAt: Date;
}

export interface PersonalizedContent {
  message: string;
  contentType: 'text' | 'image' | 'video' | 'interactive';
  tone: string;
  topics: string[];
  healthConditionSpecific: boolean;
  culturallyAdapted: boolean;
  literacyLevel: string;
  callToAction?: CallToAction;
}

export interface CallToAction {
  text: string;
  action: string;
  urgency: 'low' | 'medium' | 'high';
  incentive?: string;
}

export interface InterventionEffectiveness {
  opened: boolean;
  engaged: boolean;
  clickedThrough: boolean;
  completedAction: boolean;
  responseTime?: number; // minutes
  engagementDuration?: number; // minutes
  sentimentChange?: number; // -1 to 1
  immediateImpact: number; // 0-1
  weeklyImpact?: number; // 0-1
  monthlyImpact?: number; // 0-1
}

export interface RetentionMetrics {
  userId: string;
  period: string; // '7d', '30d', '90d'
  engagementScore: number; // 0-1
  sessionFrequency: number;
  averageSessionDuration: number;
  responseRate: number; // 0-1
  completionRate: number; // 0-1
  satisfactionScore: number; // 0-1
  healthOutcomeProgress: number; // 0-1
  socialEngagement: number; // 0-1
  calculatedAt: Date;
}

export interface RetentionCohort {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  userIds: string[];
  retentionRates: CohortRetentionRate[];
  characteristics: CohortCharacteristics;
  interventions: string[];
  benchmarkMetrics: BenchmarkMetrics;
}

export interface CohortRetentionRate {
  period: string; // 'week1', 'week2', 'month1', etc.
  retentionRate: number; // 0-1
  activeUsers: number;
  engagedUsers: number;
  churnedUsers: number;
}

export interface CohortCharacteristics {
  averageAge: number;
  genderDistribution: Record<string, number>;
  healthConditions: Record<string, number>;
  engagementPatterns: Record<string, number>;
  motivationTypes: Record<string, number>;
}

export interface BenchmarkMetrics {
  industryAverage: number;
  topQuartile: number;
  cohortPerformance: number;
  improvementPotential: number;
}

export interface PredictiveModel {
  id: string;
  name: string;
  version: string;
  type: 'churn_prediction' | 'engagement_scoring' | 'intervention_effectiveness';
  algorithm: string;
  features: ModelFeature[];
  performance: ModelPerformance;
  trainingData: TrainingDataInfo;
  lastTrained: Date;
  isActive: boolean;
  hyperparameters: Record<string, any>;
}

export interface ModelFeature {
  name: string;
  importance: number;
  type: 'numerical' | 'categorical' | 'boolean';
  description: string;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  validationMetrics: ValidationMetrics;
}

export interface ValidationMetrics {
  crossValidationScore: number;
  testSetPerformance: number;
  confusionMatrix: number[][];
  featureImportance: Record<string, number>;
}

export interface TrainingDataInfo {
  sampleSize: number;
  timeRange: string;
  features: string[];
  targetVariable: string;
  dataQuality: number; // 0-1
}