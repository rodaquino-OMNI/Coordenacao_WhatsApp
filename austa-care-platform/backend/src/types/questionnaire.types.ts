/**
 * Comprehensive Medical Questionnaire Types
 * Supporting sophisticated risk assessment and symptom collection
 */

export interface QuestionnaireQuestion {
  id: string;
  type: 'boolean' | 'multiple_choice' | 'scale' | 'text' | 'numeric' | 'conditional';
  text: string;
  description?: string;
  required: boolean;
  category: 'symptoms' | 'history' | 'lifestyle' | 'demographics' | 'social';
  medicalDomain: 'cardiovascular' | 'diabetes' | 'mental_health' | 'respiratory' | 'general';
  options?: QuestionOption[];
  validation?: QuestionValidation;
  dependencies?: QuestionDependency[];
  riskWeight: number;
  emergencyTrigger?: boolean;
  followupQuestions?: string[];
}

export interface QuestionOption {
  value: string | number;
  text: string;
  riskScore: number;
  followupQuestions?: string[];
  emergencyFlag?: boolean;
}

export interface QuestionValidation {
  min?: number;
  max?: number;
  pattern?: string;
  customValidator?: string;
  errorMessage: string;
}

export interface QuestionDependency {
  questionId: string;
  condition: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains';
  value: string | number | boolean;
  action: 'show' | 'hide' | 'require' | 'disable';
}

export interface QuestionnaireSection {
  id: string;
  title: string;
  description: string;
  order: number;
  questions: QuestionnaireQuestion[];
  condition?: SectionCondition;
  estimatedTime: number; // minutes
}

export interface SectionCondition {
  dependsOn: string; // question or section ID
  condition: string;
  value: any;
}

export interface MedicalQuestionnaire {
  id: string;
  title: string;
  description: string;
  version: string;
  type: 'screening' | 'diagnostic' | 'follow_up' | 'emergency' | 'comprehensive';
  targetDemographic: {
    minAge?: number;
    maxAge?: number;
    gender?: 'M' | 'F' | 'all';
    conditions?: string[];
  };
  sections: QuestionnaireSection[];
  estimatedDuration: number; // minutes
  validFrom: Date;
  validUntil?: Date;
  medicalReviewRequired: boolean;
  emergencyProtocol: EmergencyProtocol;
  scoringAlgorithm: ScoringAlgorithm;
}

export interface EmergencyProtocol {
  enabled: boolean;
  triggerQuestions: string[];
  escalationRules: EscalationRule[];
  emergencyContacts: EmergencyContact[];
  automatedActions: AutomatedAction[];
}

export interface EscalationRule {
  condition: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeToEscalation: number; // minutes
  escalationLevel: 'ai' | 'nurse' | 'physician' | 'emergency';
  notifications: NotificationChannel[];
}

export interface EmergencyContact {
  type: 'emergency_services' | 'medical_team' | 'family' | 'caregiver';
  name: string;
  phone: string;
  priority: number;
}

export interface AutomatedAction {
  trigger: string;
  action: 'schedule_appointment' | 'send_alert' | 'recommend_service' | 'escalate';
  parameters: Record<string, any>;
}

export interface NotificationChannel {
  type: 'sms' | 'whatsapp' | 'call' | 'email' | 'push';
  template: string;
  priority: number;
}

export interface ScoringAlgorithm {
  type: 'weighted_sum' | 'clinical_rules' | 'ml_model' | 'composite';
  parameters: Record<string, any>;
  thresholds: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  outputFormat: 'score' | 'risk_level' | 'recommendations' | 'all';
}

// Brazilian Healthcare Context - Evidence-Based Questions

export interface BrazilianMedicalQuestions {
  // Diabetes Screening - Based on SBD Guidelines
  diabetesScreening: QuestionnaireQuestion[];
  
  // Hypertension Assessment - Based on SBC Guidelines
  hypertensionAssessment: QuestionnaireQuestion[];
  
  // Mental Health Screening - PHQ-9/GAD-7 adapted for Brazil
  mentalHealthScreening: QuestionnaireQuestion[];
  
  // Cardiovascular Risk - Framingham adapted for Brazilian population
  cardiovascularRisk: QuestionnaireQuestion[];
  
  // Sleep Disorders - STOP-BANG adapted
  sleepAssessment: QuestionnaireQuestion[];
  
  // Women's Health - Specific to Brazilian guidelines
  womensHealth: QuestionnaireQuestion[];
  
  // Men's Health - Prostate, cardiovascular focus
  mensHealth: QuestionnaireQuestion[];
}

export interface DiabetesQuestions {
  // Classic Triad Questions
  polydipsia: QuestionnaireQuestion;
  polyphagia: QuestionnaireQuestion;
  polyuria: QuestionnaireQuestion;
  
  // Additional Risk Factors
  weightLoss: QuestionnaireQuestion;
  fatigue: QuestionnaireQuestion;
  blurredVision: QuestionnaireQuestion;
  familyHistory: QuestionnaireQuestion;
  gestationalDiabetes: QuestionnaireQuestion;
  
  // Emergency Indicators
  ketosisSymptoms: QuestionnaireQuestion;
  severeDehydration: QuestionnaireQuestion;
}

export interface HypertensionQuestions {
  // Primary Symptoms
  headache: QuestionnaireQuestion;
  dizziness: QuestionnaireQuestion;
  chestPain: QuestionnaireQuestion;
  shortnessOfBreath: QuestionnaireQuestion;
  
  // Risk Factors
  familyHistory: QuestionnaireQuestion;
  smoking: QuestionnaireQuestion;
  alcohol: QuestionnaireQuestion;
  stress: QuestionnaireQuestion;
  
  // Complications
  visualDisturbances: QuestionnaireQuestion;
  kidney: QuestionnaireQuestion;
}

export interface MentalHealthQuestions {
  // PHQ-9 Adapted
  depressedMood: QuestionnaireQuestion;
  anhedonia: QuestionnaireQuestion;
  sleepIssues: QuestionnaireQuestion;
  fatigue: QuestionnaireQuestion;
  appetite: QuestionnaireQuestion;
  selfWorth: QuestionnaireQuestion;
  concentration: QuestionnaireQuestion;
  psychomotor: QuestionnaireQuestion;
  suicidalIdeation: QuestionnaireQuestion;
  
  // GAD-7 Adapted
  anxiety: QuestionnaireQuestion;
  worry: QuestionnaireQuestion;
  restlessness: QuestionnaireQuestion;
  irritability: QuestionnaireQuestion;
  
  // Brazilian Cultural Context
  familySupport: QuestionnaireQuestion;
  religiousCoping: QuestionnaireQuestion;
  socioeconomicStress: QuestionnaireQuestion;
}

export interface SleepApneaQuestions {
  // STOP-BANG Components
  snoring: QuestionnaireQuestion;
  tired: QuestionnaireQuestion;
  observed: QuestionnaireQuestion;
  pressure: QuestionnaireQuestion;
  bmi: QuestionnaireQuestion;
  age: QuestionnaireQuestion;
  neck: QuestionnaireQuestion;
  gender: QuestionnaireQuestion;
  
  // Additional Brazilian Context
  workShift: QuestionnaireQuestion;
  alcoholConsumption: QuestionnaireQuestion;
}

export interface QuestionnaireAnalytics {
  completionRate: number;
  averageCompletionTime: number;
  questionDifficulty: Record<string, number>;
  emergencyTriggerRate: number;
  riskDistribution: Record<string, number>;
  userFeedback: QuestionnaireFeedback[];
}

export interface QuestionnaireFeedback {
  userId: string;
  questionnaireId: string;
  rating: number;
  comments: string;
  suggestions: string[];
  timestamp: Date;
}

export interface QuestionnaireResponse {
  id: string;
  userId: string;
  questionnaireId: string;
  responses: Record<string, any>;
  completedAt: Date;
  completionTime: number; // seconds
  emergencyFlags: string[];
  riskScores: Record<string, number>;
  recommendations: string[];
  followupRequired: boolean;
  // Additional properties for individual response items
  answer?: any;
  type?: string;
  medicalRelevance?: {
    conditions?: string[];
    [key: string]: any;
  };
}

export interface DynamicQuestionnaireFlow {
  currentQuestion: string;
  answeredQuestions: string[];
  skippedQuestions: string[];
  remainingQuestions: string[];
  emergencyTriggered: boolean;
  estimatedTimeRemaining: number;
  completionPercentage: number;
  adaptiveLogic: AdaptiveLogic;
}

export interface AdaptiveLogic {
  skipConditions: SkipCondition[];
  emergencyExit: EmergencyExit;
  personalization: PersonalizationRule[];
}

export interface SkipCondition {
  questionId: string;
  condition: string;
  targetQuestion: string;
  reason: string;
}

export interface EmergencyExit {
  triggered: boolean;
  reason: string;
  immediateActions: string[];
  escalationLevel: string;
}

export interface PersonalizationRule {
  condition: string;
  modification: 'skip' | 'add' | 'modify' | 'prioritize';
  target: string;
  value: any;
}