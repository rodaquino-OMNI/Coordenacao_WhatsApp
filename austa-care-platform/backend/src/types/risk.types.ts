/**
 * Advanced Medical Risk Assessment Types
 * Evidence-based risk algorithms for Brazilian healthcare context
 */

export interface RiskFactor {
  name: string;
  value: number | boolean | string;
  weight: number;
  category: 'symptom' | 'history' | 'lifestyle' | 'vital' | 'demographic';
  severity: 'mild' | 'moderate' | 'severe' | 'critical';
  evidenceLevel: 'A' | 'B' | 'C' | 'D'; // Evidence-based medicine levels
}

export interface CardiovascularRisk {
  overallScore: number;
  riskLevel: 'low' | 'intermediate' | 'high' | 'very_high';
  factors: {
    chestPain: boolean;
    shortnessOfBreath: boolean;
    palpitations: boolean;
    syncope: boolean;
    familyHistory: boolean;
    hypertension: boolean;
    diabetes: boolean;
    smoking: boolean;
    cholesterol: boolean;
    age: number;
    gender: 'M' | 'F';
  };
  framinghamScore: number;
  emergencyIndicators: string[];
  recommendations: string[];
  escalationRequired: boolean;
  timeToEscalation: number; // hours
}

export interface DiabetesRisk {
  overallScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  classicTriad: {
    polydipsia: boolean; // sede excessiva
    polyphagia: boolean; // fome excessiva
    polyuria: boolean;   // urina frequente
    triadComplete: boolean;
    triadScore: number;
  };
  additionalFactors: {
    weightLoss: boolean;
    fatigue: boolean;
    blurredVision: boolean;
    slowHealing: boolean;
    frequentInfections: boolean;
    familyHistory: boolean;
    obesity: boolean;
    age: number;
    gestationalDiabetes: boolean;
  };
  ketosisRisk: number;
  dkaRisk: number; // Diabetic ketoacidosis
  emergencyIndicators: string[];
  timeToEscalation: number;
}

export interface MentalHealthRisk {
  overallScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'severe';
  depressionIndicators: {
    persistentSadness: boolean;
    anhedonia: boolean; // loss of interest
    fatigue: boolean;
    sleepDisturbances: boolean;
    appetiteChanges: boolean;
    concentrationProblems: boolean;
    guilt: boolean;
    hopelessness: boolean;
    suicidalIdeation: boolean;
    phq9Score: number;
  };
  anxietyIndicators: {
    excessiveWorry: boolean;
    restlessness: boolean;
    fatigue: boolean;
    concentrationDifficulty: boolean;
    irritability: boolean;
    muscularTension: boolean;
    sleepProblems: boolean;
    gad7Score: number;
  };
  suicideRisk: {
    riskLevel: 'none' | 'low' | 'moderate' | 'high' | 'imminent';
    protectiveFactors: string[];
    riskFactors: string[];
    immediateIntervention: boolean;
  };
  escalationRequired: boolean;
  timeToEscalation: number;
}

export interface RespiratoryRisk {
  overallScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  asthmaIndicators: {
    wheezing: boolean;
    shortnessOfBreath: boolean;
    chestTightness: boolean;
    coughing: boolean;
    nighttimeSymptoms: boolean;
    exerciseTriggered: boolean;
    allergenTriggered: boolean;
    peakFlowReduction: boolean;
  };
  copdIndicators: {
    chronicCough: boolean;
    sputumProduction: boolean;
    dyspnea: boolean;
    smokingHistory: boolean;
    age: number;
    occupationalExposure: boolean;
  };
  sleepApneaIndicators: {
    snoring: boolean;
    breathingPauses: boolean;
    daytimeSleepiness: boolean;
    morningHeadaches: boolean;
    obesityBMI: number;
    neckCircumference: number;
    hypertension: boolean;
    berlinScore: number;
    stopBangScore: number;
  };
  emergencyIndicators: string[];
  timeToEscalation: number;
}

export interface CompositeRisk {
  overallScore: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
  multipleConditionsPenalty: number;
  synergyFactor: number;
  ageAdjustment: number;
  genderAdjustment: number;
  socioeconomicFactors: number;
  accessToCareFactor: number;
  prioritizedConditions: string[];
  emergencyEscalation: boolean;
  urgentEscalation: boolean;
  routineFollowup: boolean;
}

export interface AdvancedRiskAssessment {
  userId: string;
  assessmentId: string;
  timestamp: Date;
  cardiovascular: CardiovascularRisk;
  diabetes: DiabetesRisk;
  mentalHealth: MentalHealthRisk;
  respiratory: RespiratoryRisk;
  composite: CompositeRisk;
  emergencyAlerts: EmergencyAlert[];
  recommendations: ClinicalRecommendation[];
  followupSchedule: FollowupSchedule;
  escalationProtocol: EscalationProtocol;
}

export interface EmergencyAlert {
  id: string;
  severity: 'high' | 'critical' | 'immediate';
  condition: string;
  symptoms: string[];
  timeToAction: number; // minutes
  actions: string[];
  contactNumbers: string[];
  automated: boolean;
}

export interface ClinicalRecommendation {
  id: string;
  category: 'immediate' | 'urgent' | 'routine' | 'preventive';
  condition: string;
  recommendation: string;
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  timeframe: string;
  priority: number;
  costEffectiveness: 'high' | 'medium' | 'low';
}

export interface FollowupSchedule {
  immediate: FollowupAction[];
  within24h: FollowupAction[];
  within1week: FollowupAction[];
  within1month: FollowupAction[];
  routine: FollowupAction[];
}

export interface FollowupAction {
  action: string;
  specialistType?: string;
  urgency: 'routine' | 'urgent' | 'stat';
  automated: boolean;
  estimatedCost?: number;
}

export interface EscalationProtocol {
  immediate: boolean;
  urgent: boolean;
  timeToEscalation: number;
  escalationLevel: 'ai_only' | 'nurse_review' | 'physician_review' | 'emergency_services';
  notificationChannels: ('sms' | 'whatsapp' | 'call' | 'email')[];
  automaticScheduling: boolean;
}

export interface TemporalRiskProgression {
  assessments: AdvancedRiskAssessment[];
  trends: {
    condition: string;
    progression: 'improving' | 'stable' | 'worsening' | 'rapid_decline';
    timeframe: number; // days
    confidenceLevel: number;
  }[];
  predictiveModeling: {
    nextAssessmentRecommended: Date;
    riskProjection: number;
    interventionOpportunities: string[];
  };
}

export interface MedicalKnowledgeRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  symptoms: string[];
  riskFactors: string[];
  scoring: {
    basePoints: number;
    symptomMultipliers: Record<string, number>;
    ageFactors: Record<string, number>;
    genderFactors: Record<string, number>;
  };
  thresholds: {
    low: number;
    moderate: number;
    high: number;
    critical: number;
  };
  escalationCriteria: string[];
  evidenceSource: string;
  lastUpdated: Date;
}

export interface RiskCorrelationMatrix {
  correlations: Record<string, Record<string, number>>;
  compoundingFactors: {
    condition1: string;
    condition2: string;
    multiplicationFactor: number;
    evidenceLevel: string;
  }[];
  exclusivePairs: string[][];
  dominantConditions: string[];
}

export interface CompoundRiskAnalysis {
  primaryCondition: string;
  secondaryConditions: string[];
  riskMultiplier: number;
  synergyScore: number;
  temporalPattern: TemporalRiskPattern;
  predictiveModel: PredictiveRiskModel;
  interventionOpportunities: InterventionOpportunity[];
  riskMitigation: RiskMitigationStrategy[];
}

export interface TemporalRiskPattern {
  pattern: 'stable' | 'ascending' | 'accelerating' | 'critical_progression';
  timeframe: number; // days
  riskVelocity: number;
  projectedPeak: Date;
  interventionWindow: number; // days before critical
}

export interface PredictiveRiskModel {
  algorithmType: 'statistical' | 'ml_ensemble' | 'clinical_rules' | 'hybrid';
  confidence: number;
  predictions: {
    next7days: number;
    next30days: number;
    next90days: number;
    nextYear: number;
  };
  keyFactors: RiskFactor[];
  uncertaintyBounds: {
    lower: number;
    upper: number;
  };
}

export interface InterventionOpportunity {
  type: 'preventive' | 'therapeutic' | 'lifestyle' | 'medication';
  description: string;
  potentialRiskReduction: number;
  costEffectiveness: 'high' | 'medium' | 'low';
  timeToEffect: number; // days
  evidenceLevel: 'A' | 'B' | 'C' | 'D';
  prerequisites: string[];
  contraindications: string[];
}

export interface RiskMitigationStrategy {
  strategy: string;
  priority: 'immediate' | 'urgent' | 'routine';
  expectedRiskReduction: number;
  timeline: string;
  resources: string[];
  monitoringRequirements: string[];
  successMetrics?: SuccessMetric[];
}

export interface SuccessMetric {
  metric: string;
  target: number;
  unit: string;
  timeframe: string;
  measurement: 'percentage' | 'absolute' | 'qualitative';
}

// Note: QuestionnaireResponse is defined in questionnaire.types.ts
// Import from there to avoid duplication
// export interface QuestionnaireResponse { ... } // Moved to questionnaire.types.ts

export interface QuestionResponse {
  questionId: string;
  question: string;
  answer: string | number | boolean;
  type: 'boolean' | 'multiple_choice' | 'scale' | 'text' | 'numeric';
  medicalRelevance: {
    conditions: string[];
    weight: number;
    category: string;
  };
  timestamp: Date;
}

export interface ProcessedQuestionnaire {
  userId: string;
  questionnaireId: string;
  responses: QuestionResponse[];
  extractedSymptoms: ExtractedSymptom[];
  riskFactors: ExtractedRiskFactor[];
  emergencyFlags: EmergencyFlag[];
  completedAt: Date;
}

export interface ExtractedSymptom {
  symptom: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
  frequency: string;
  location?: string;
  associatedSymptoms: string[];
  medicalRelevance: string[];
}

export interface ExtractedRiskFactor {
  factor: string;
  value: string | number | boolean;
  significance: 'low' | 'moderate' | 'high' | 'critical';
  medicalConditions: string[];
  evidenceLevel: string;
}

export interface EmergencyFlag {
  flag: string;
  severity: 'warning' | 'urgent' | 'critical';
  condition: string;
  immediateAction: string;
  timeToAction: number; // minutes
}

// Base Risk Assessment interface
export interface RiskAssessment {
  id: string;
  userId: string;
  patientId?: string;
  assessmentType: 'basic' | 'advanced' | 'comprehensive';
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  riskScore: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  emergencyFlags: EmergencyFlag[];
  followupRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}