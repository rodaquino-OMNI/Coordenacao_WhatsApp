import OpenAI from 'openai';

export type PersonaType = 'zeca' | 'ana';

export interface PersonaConfig {
  name: string;
  gender: 'masculino' | 'feminino';
  personality: string;
  description: string;
  systemPrompt: string;
  fallbackResponses: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  persona?: PersonaType;
}

export interface UserProfile {
  userId: string;
  name?: string;
  age?: number;
  gender: 'M' | 'F';
  healthConditions?: string[];
  preferences?: {
    communicationStyle?: 'formal' | 'casual';
    healthTopics?: string[];
    preferredPersona?: PersonaType;
  };
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  type: 'onboarding' | 'health_check' | 'education' | 'appointment';
  status: 'pending' | 'in_progress' | 'completed';
  steps?: MissionStep[];
  completedAt?: Date;
}

export interface MissionStep {
  id: string;
  title: string;
  description: string;
  type: 'question' | 'action' | 'information';
  completed: boolean;
  response?: string;
}

export interface ConversationContext {
  userId: string;
  sessionId: string;
  previousMessages?: ConversationMessage[];
  currentMission?: Mission;
  currentStep?: MissionStep;
  userProfile?: UserProfile;
  lastInteraction: Date;
  metadata?: {
    platform?: 'whatsapp' | 'web' | 'mobile';
    deviceInfo?: string;
    location?: {
      country?: string;
      region?: string;
    };
  };
}

export interface AIResponse {
  content: string;
  persona: PersonaType;
  timestamp: Date;
  tokenUsage?: OpenAI.Completions.CompletionUsage;
  cached: boolean;
  fallback?: boolean;
  responseTime: number;
  streamed?: boolean;
  metadata?: {
    moderationFlags?: string[];
    confidence?: number;
    relevanceScore?: number;
  };
}

export interface TokenUsage {
  userId: string;
  date: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
  requestCount: number;
  totalResponseTime: number;
  averageResponseTime?: number;
  cost?: number;
}

export interface HealthPromptTemplate {
  id: string;
  name: string;
  category: 'symptom_inquiry' | 'appointment_scheduling' | 'health_education' | 'emergency_guidance' | 'general_wellness';
  persona: PersonaType | 'both';
  template: string;
  variables: string[];
  triggers: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AIServiceConfig {
  maxContextMessages: number;
  cacheExpirySeconds: number;
  tokenUsageTrackingEnabled: boolean;
  contentModerationEnabled: boolean;
  streamingEnabled: boolean;
  fallbackResponsesEnabled: boolean;
  costOptimizationEnabled: boolean;
}

export interface ConversationAnalytics {
  totalConversations: number;
  averageMessagesPerConversation: number;
  mostUsedPersona: PersonaType;
  averageResponseTime: number;
  totalTokensUsed: number;
  cacheHitRate: number;
  moderationFlags: number;
  userSatisfactionScore?: number;
}

export interface HealthTopicClassification {
  category: 'general' | 'symptoms' | 'preventive_care' | 'mental_health' | 'nutrition' | 'exercise' | 'medication' | 'emergency';
  subcategory?: string;
  confidence: number;
  keywords: string[];
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresHumanIntervention: boolean;
}

export interface SmartResponseFeatures {
  contextAwareness: boolean;
  personalizedRecommendations: boolean;
  proactiveHealthReminders: boolean;
  multiModalSupport: boolean;
  continuousLearning: boolean;
  emotionalIntelligence: boolean;
}