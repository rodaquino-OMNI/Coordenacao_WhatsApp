/**
 * NLP Analytics Service
 * Advanced Natural Language Processing with sentiment analysis, intent recognition, and entity extraction
 * Implements sophisticated conversation analytics and pattern recognition
 */

import { logger } from '../utils/logger';
import { RedisService } from './redisService';

export interface SentimentAnalysisResult {
  polarity: number; // -1 (negative) to 1 (positive)
  subjectivity: number; // 0 (objective) to 1 (subjective)
  emotion: EmotionType;
  confidence: number; // 0 to 1
  emotionalIntensity: number; // 0 to 10
  contextualSentiment: ContextualSentiment;
  emotionalMarkers: EmotionalMarker[];
}

export interface ContextualSentiment {
  healthAnxiety: number; // 0 to 1
  satisfaction: number; // 0 to 1
  urgency: number; // 0 to 1
  confusion: number; // 0 to 1
  trust: number; // 0 to 1
  engagement: number; // 0 to 1
  frustration: number; // 0 to 1
  hope: number; // 0 to 1
}

export interface EmotionalMarker {
  word: string;
  emotion: EmotionType;
  intensity: number;
  context: string;
  position: number;
}

export type EmotionType = 
  | 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'disgust' | 'trust' | 'anticipation'
  | 'anxiety' | 'worry' | 'relief' | 'confusion' | 'frustration' | 'hope' | 'neutral';

export interface IntentClassification {
  primaryIntent: HealthIntent;
  confidence: number;
  secondaryIntents: { intent: HealthIntent; confidence: number }[];
  urgencyLevel: UrgencyLevel;
  actionRequired: ActionType;
  escalationNeeded: boolean;
  contextFactors: ContextFactor[];
}

export type HealthIntent = 
  | 'symptom_reporting' | 'pain_description' | 'medication_inquiry' | 'appointment_request'
  | 'emergency_situation' | 'health_education' | 'lifestyle_advice' | 'preventive_care'
  | 'mental_health_support' | 'second_opinion' | 'test_results_inquiry' | 'general_wellness'
  | 'medical_history' | 'family_history' | 'side_effects_reporting' | 'treatment_compliance'
  | 'insurance_question' | 'cost_inquiry' | 'provider_recommendation' | 'routine_checkup';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical' | 'emergency';

export type ActionType = 
  | 'provide_information' | 'schedule_appointment' | 'escalate_to_human' | 'emergency_protocol'
  | 'collect_more_info' | 'provide_reassurance' | 'educational_content' | 'follow_up_needed';

export interface ContextFactor {
  type: 'temporal' | 'severity' | 'frequency' | 'duration' | 'location' | 'demographic';
  value: string;
  relevance: number; // 0 to 1
}

export interface AdvancedEntityExtraction {
  entities: HealthEntity[];
  relationships: EntityRelationship[];
  medicalConcepts: MedicalConcept[];
  riskFactors: RiskFactor[];
  temporalInformation: TemporalInfo[];
}

export interface HealthEntity {
  id: string;
  type: HealthEntityType;
  value: string;
  normalizedValue: string;
  confidence: number;
  startPos: number;
  endPos: number;
  context: string;
  attributes: EntityAttribute[];
  medicalCoding?: MedicalCoding[];
}

export type HealthEntityType = 
  | 'symptom' | 'condition' | 'medication' | 'procedure' | 'body_part' | 'vital_sign'
  | 'allergy' | 'family_history' | 'social_history' | 'occupation' | 'lifestyle_factor'
  | 'severity_indicator' | 'frequency_indicator' | 'duration' | 'dosage' | 'route_of_administration';

export interface EntityAttribute {
  name: string;
  value: string;
  confidence: number;
}

export interface MedicalCoding {
  system: 'ICD10' | 'SNOMED' | 'LOINC' | 'RxNorm' | 'CPT';
  code: string;
  description: string;
  confidence: number;
}

export interface EntityRelationship {
  sourceEntity: string;
  targetEntity: string;
  relationshipType: RelationshipType;
  confidence: number;
  evidenceText: string;
}

export type RelationshipType = 
  | 'causes' | 'treats' | 'worsens' | 'alleviates' | 'occurs_with' | 'precedes'
  | 'follows' | 'located_in' | 'affects' | 'indicates' | 'contradicts';

export interface MedicalConcept {
  concept: string;
  category: ConceptCategory;
  relevance: number;
  associatedEntities: string[];
  clinicalSignificance: ClinicalSignificance;
}

export type ConceptCategory = 
  | 'diagnosis' | 'treatment' | 'prevention' | 'risk_factor' | 'symptom_cluster'
  | 'medication_class' | 'procedure_type' | 'anatomy' | 'pathophysiology';

export type ClinicalSignificance = 'low' | 'medium' | 'high' | 'critical';

export interface RiskFactor {
  factor: string;
  category: RiskCategory;
  severity: number; // 0 to 10
  modifiable: boolean;
  associatedConditions: string[];
  recommendations: string[];
}

export type RiskCategory = 
  | 'cardiovascular' | 'metabolic' | 'respiratory' | 'mental_health' | 'oncological'
  | 'musculoskeletal' | 'neurological' | 'infectious' | 'behavioral' | 'environmental';

export interface TemporalInfo {
  timeExpression: string;
  normalizedTime: Date | string;
  temporalType: TemporalType;
  confidence: number;
  associatedEntity?: string;
}

export type TemporalType = 
  | 'onset_time' | 'duration' | 'frequency' | 'last_occurrence' | 'appointment_time'
  | 'medication_schedule' | 'symptom_pattern' | 'historical_event';

export interface ConversationQualityMetrics {
  clarity: number; // 0 to 10
  completeness: number; // 0 to 10
  relevance: number; // 0 to 10
  specificity: number; // 0 to 10
  coherence: number; // 0 to 10
  informationDensity: number; // 0 to 10
  clinicalUtility: number; // 0 to 10
  userEngagement: number; // 0 to 10
  overallQuality: number; // 0 to 10
  qualityFactors: QualityFactor[];
}

export interface QualityFactor {
  factor: string;
  impact: number; // -5 to 5
  explanation: string;
}

export interface ConversationInsights {
  keyTopics: TopicInsight[];
  emotionalJourney: EmotionalTrend[];
  riskProgression: RiskProgression;
  engagementPattern: EngagementPattern;
  communicationStyle: CommunicationStyle;
  recommendedActions: RecommendedAction[];
}

export interface TopicInsight {
  topic: string;
  frequency: number;
  importance: number;
  sentiment: number;
  firstMention: number; // Turn number
  lastMention: number; // Turn number
  evolution: 'improving' | 'worsening' | 'stable' | 'fluctuating';
}

export interface EmotionalTrend {
  turnNumber: number;
  overallSentiment: number;
  dominantEmotion: EmotionType;
  emotionalIntensity: number;
  emotionalStability: number;
}

export interface RiskProgression {
  initialRisk: number;
  currentRisk: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  criticalPoints: { turn: number; risk: number; trigger: string }[];
  predictedRisk: number;
}

export interface EngagementPattern {
  averageResponseLength: number;
  responseTimePattern: number[]; // Estimated response times
  engagementLevel: number; // 0 to 10
  participationQuality: number; // 0 to 10
  topicSwitchingRate: number;
  clarificationNeeds: number;
}

export interface CommunicationStyle {
  formalityLevel: number; // 0 to 10
  directnessPreference: number; // 0 to 10
  detailOrientation: number; // 0 to 10
  emotionalExpressiveness: number; // 0 to 10
  questioningStyle: 'direct' | 'exploratory' | 'hesitant' | 'assertive';
  preferredResponseLength: 'brief' | 'moderate' | 'detailed';
}

export interface RecommendedAction {
  action: ActionType;
  priority: number; // 0 to 10
  reasoning: string;
  expectedOutcome: string;
  confidence: number; // 0 to 1
}

export class NLPAnalyticsService {
  private redis: RedisService;
  private sentimentLexicon: Map<string, { polarity: number; emotion: EmotionType }>;
  private medicalTerms: Map<string, { category: HealthEntityType; codes: MedicalCoding[] }>;
  private intentPatterns: Map<HealthIntent, { keywords: string[]; patterns: RegExp[] }>;

  constructor() {
    this.redis = new RedisService();
    this.sentimentLexicon = new Map();
    this.medicalTerms = new Map();
    this.intentPatterns = new Map();
    this.initializeNLPResources();
  }

  /**
   * Initialize NLP resources and dictionaries
   */
  private async initializeNLPResources(): Promise<void> {
    try {
      await this.loadSentimentLexicon();
      await this.loadMedicalTerminology();
      await this.loadIntentPatterns();
      
      logger.info('NLP Analytics Service initialized with comprehensive resources');
    } catch (error) {
      logger.error('Error initializing NLP resources', error);
    }
  }

  /**
   * Perform comprehensive sentiment analysis
   */
  async analyzeSentiment(text: string, context?: any): Promise<SentimentAnalysisResult> {
    try {
      const words = this.tokenize(text.toLowerCase());
      const emotionalMarkers: EmotionalMarker[] = [];
      
      let totalPolarity = 0;
      let totalSubjectivity = 0;
      let emotionCounts = new Map<EmotionType, number>();
      let emotionalIntensity = 0;
      
      words.forEach((word, index) => {
        const sentimentInfo = this.sentimentLexicon.get(word);
        if (sentimentInfo) {
          totalPolarity += sentimentInfo.polarity;
          totalSubjectivity += 0.8; // Subjective words
          
          const emotion = sentimentInfo.emotion;
          emotionCounts.set(emotion, (emotionCounts.get(emotion) || 0) + 1);
          
          emotionalMarkers.push({
            word,
            emotion,
            intensity: Math.abs(sentimentInfo.polarity) * 10,
            context: this.getWordContext(words, index),
            position: index
          });
          
          emotionalIntensity += Math.abs(sentimentInfo.polarity);
        }
      });
      
      const wordCount = Math.max(words.length, 1);
      const polarity = Math.max(-1, Math.min(1, totalPolarity / wordCount));
      const subjectivity = Math.min(1, totalSubjectivity / wordCount);
      
      // Determine dominant emotion
      const dominantEmotion = Array.from(emotionCounts.entries())
        .sort(([, a], [, b]) => b - a)[0]?.[0] || 'neutral';
      
      // Calculate contextual sentiment
      const contextualSentiment = await this.calculateContextualSentiment(text, words);
      
      // Calculate confidence based on emotional markers and text length
      const confidence = Math.min(1, (emotionalMarkers.length * 0.2) + (Math.min(words.length, 20) * 0.03));
      
      const result: SentimentAnalysisResult = {
        polarity,
        subjectivity,
        emotion: dominantEmotion,
        confidence,
        emotionalIntensity: Math.min(10, emotionalIntensity),
        contextualSentiment,
        emotionalMarkers
      };
      
      // Cache result for performance
      await this.cacheSentimentResult(text, result);
      
      logger.debug('Sentiment analysis completed', {
        polarity,
        emotion: dominantEmotion,
        confidence,
        markersFound: emotionalMarkers.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error in sentiment analysis', error);
      throw error;
    }
  }

  /**
   * Classify health intent with sophisticated pattern matching
   */
  async classifyIntent(text: string, context?: any): Promise<IntentClassification> {
    try {
      const words = this.tokenize(text.toLowerCase());
      const intentScores = new Map<HealthIntent, number>();
      const contextFactors: ContextFactor[] = [];
      
      // Score each intent based on keyword matching and patterns
      for (const [intent, patterns] of this.intentPatterns.entries()) {
        let score = 0;
        
        // Keyword matching
        patterns.keywords.forEach(keyword => {
          if (words.includes(keyword)) {
            score += 1;
          }
          if (text.toLowerCase().includes(keyword)) {
            score += 0.5;
          }
        });
        
        // Pattern matching
        patterns.patterns.forEach(pattern => {
          if (pattern.test(text)) {
            score += 2;
          }
        });
        
        if (score > 0) {
          intentScores.set(intent, score);
        }
      }
      
      // Apply contextual boosting
      await this.applyContextualBoosting(intentScores, text, words, contextFactors);
      
      // Sort by score
      const sortedIntents = Array.from(intentScores.entries())
        .sort(([, a], [, b]) => b - a);
      
      const primaryIntent = sortedIntents[0]?.[0] || 'general_wellness';
      const primaryScore = sortedIntents[0]?.[1] || 0;
      const confidence = Math.min(1, primaryScore / 5);
      
      const secondaryIntents = sortedIntents
        .slice(1, 4)
        .map(([intent, score]) => ({
          intent,
          confidence: Math.min(1, score / 5)
        }));
      
      // Determine urgency and action
      const urgencyLevel = this.determineUrgencyLevel(primaryIntent, text, words);
      const actionRequired = this.determineActionRequired(primaryIntent, urgencyLevel);
      const escalationNeeded = this.shouldEscalate(primaryIntent, urgencyLevel, text);
      
      const result: IntentClassification = {
        primaryIntent,
        confidence,
        secondaryIntents,
        urgencyLevel,
        actionRequired,
        escalationNeeded,
        contextFactors
      };
      
      logger.debug('Intent classification completed', {
        primaryIntent,
        confidence,
        urgencyLevel,
        escalationNeeded
      });
      
      return result;
    } catch (error) {
      logger.error('Error in intent classification', error);
      throw error;
    }
  }

  /**
   * Advanced entity extraction with medical terminology
   */
  async extractEntities(text: string, context?: any): Promise<AdvancedEntityExtraction> {
    try {
      const entities: HealthEntity[] = [];
      const relationships: EntityRelationship[] = [];
      const medicalConcepts: MedicalConcept[] = [];
      const riskFactors: RiskFactor[] = [];
      const temporalInformation: TemporalInfo[] = [];
      
      const words = this.tokenize(text);
      const normalizedText = text.toLowerCase();
      
      // Extract health entities
      await this.extractHealthEntities(text, words, entities);
      
      // Extract temporal information
      await this.extractTemporalInfo(text, temporalInformation);
      
      // Identify relationships between entities
      await this.identifyEntityRelationships(entities, text, relationships);
      
      // Extract medical concepts
      await this.extractMedicalConcepts(entities, text, medicalConcepts);
      
      // Identify risk factors
      await this.identifyRiskFactors(entities, text, riskFactors);
      
      const result: AdvancedEntityExtraction = {
        entities,
        relationships,
        medicalConcepts,
        riskFactors,
        temporalInformation
      };
      
      logger.debug('Advanced entity extraction completed', {
        entitiesFound: entities.length,
        relationships: relationships.length,
        concepts: medicalConcepts.length,
        riskFactors: riskFactors.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error in entity extraction', error);
      throw error;
    }
  }

  /**
   * Assess conversation quality with multiple metrics
   */
  async assessConversationQuality(
    text: string,
    conversationHistory?: any[],
    context?: any
  ): Promise<ConversationQualityMetrics> {
    try {
      const words = this.tokenize(text);
      const qualityFactors: QualityFactor[] = [];
      
      // Clarity assessment
      const clarity = this.assessClarity(text, words, qualityFactors);
      
      // Completeness assessment
      const completeness = this.assessCompleteness(text, words, context, qualityFactors);
      
      // Relevance assessment
      const relevance = this.assessRelevance(text, context, qualityFactors);
      
      // Specificity assessment
      const specificity = this.assessSpecificity(text, words, qualityFactors);
      
      // Coherence assessment
      const coherence = this.assessCoherence(text, conversationHistory, qualityFactors);
      
      // Information density assessment
      const informationDensity = this.assessInformationDensity(text, words, qualityFactors);
      
      // Clinical utility assessment
      const clinicalUtility = await this.assessClinicalUtility(text, context, qualityFactors);
      
      // User engagement assessment
      const userEngagement = this.assessUserEngagement(text, conversationHistory, qualityFactors);
      
      // Calculate overall quality
      const metrics = [clarity, completeness, relevance, specificity, coherence, informationDensity, clinicalUtility, userEngagement];
      const overallQuality = metrics.reduce((sum, metric) => sum + metric, 0) / metrics.length;
      
      const result: ConversationQualityMetrics = {
        clarity,
        completeness,
        relevance,
        specificity,
        coherence,
        informationDensity,
        clinicalUtility,
        userEngagement,
        overallQuality,
        qualityFactors
      };
      
      logger.debug('Conversation quality assessment completed', {
        overallQuality,
        factorsIdentified: qualityFactors.length
      });
      
      return result;
    } catch (error) {
      logger.error('Error in conversation quality assessment', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive conversation insights
   */
  async generateConversationInsights(conversationHistory: any[]): Promise<ConversationInsights> {
    try {
      // Extract key topics
      const keyTopics = await this.extractKeyTopics(conversationHistory);
      
      // Analyze emotional journey
      const emotionalJourney = await this.analyzeEmotionalJourney(conversationHistory);
      
      // Track risk progression
      const riskProgression = await this.analyzeRiskProgression(conversationHistory);
      
      // Analyze engagement patterns
      const engagementPattern = await this.analyzeEngagementPattern(conversationHistory);
      
      // Determine communication style
      const communicationStyle = await this.analyzeCommunicationStyle(conversationHistory);
      
      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(
        keyTopics,
        emotionalJourney,
        riskProgression,
        engagementPattern
      );
      
      const insights: ConversationInsights = {
        keyTopics,
        emotionalJourney,
        riskProgression,
        engagementPattern,
        communicationStyle,
        recommendedActions
      };
      
      logger.info('Conversation insights generated', {
        topicsFound: keyTopics.length,
        emotionalTrends: emotionalJourney.length,
        recommendedActions: recommendedActions.length
      });
      
      return insights;
    } catch (error) {
      logger.error('Error generating conversation insights', error);
      throw error;
    }
  }

  // Private helper methods

  private tokenize(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);
  }

  private getWordContext(words: string[], index: number, windowSize: number = 2): string {
    const start = Math.max(0, index - windowSize);
    const end = Math.min(words.length, index + windowSize + 1);
    return words.slice(start, end).join(' ');
  }

  private async calculateContextualSentiment(text: string, words: string[]): Promise<ContextualSentiment> {
    const healthAnxietyWords = ['preocupado', 'ansioso', 'medo', 'receio', 'nervoso'];
    const satisfactionWords = ['bom', 'ótimo', 'satisfeito', 'feliz', 'contente'];
    const urgencyWords = ['urgente', 'imediato', 'agora', 'rápido', 'emergência'];
    const confusionWords = ['confuso', 'não entendi', 'como assim', 'dúvida'];
    const trustWords = ['confio', 'acredito', 'confiança', 'certeza'];
    const engagementWords = ['interessante', 'gostei', 'quero saber', 'continuar'];
    const frustrationWords = ['frustrado', 'irritado', 'cansado', 'difícil'];
    const hopeWords = ['esperança', 'otimista', 'melhora', 'recuperar'];
    
    return {
      healthAnxiety: this.calculateWordSetSentiment(words, healthAnxietyWords),
      satisfaction: this.calculateWordSetSentiment(words, satisfactionWords),
      urgency: this.calculateWordSetSentiment(words, urgencyWords),
      confusion: this.calculateWordSetSentiment(words, confusionWords),
      trust: this.calculateWordSetSentiment(words, trustWords),
      engagement: this.calculateWordSetSentiment(words, engagementWords),
      frustration: this.calculateWordSetSentiment(words, frustrationWords),
      hope: this.calculateWordSetSentiment(words, hopeWords)
    };
  }

  private calculateWordSetSentiment(words: string[], targetWords: string[]): number {
    const matches = words.filter(word => 
      targetWords.some(target => word.includes(target))
    ).length;
    return Math.min(1, matches / 5); // Normalize to 0-1
  }

  private async loadSentimentLexicon(): Promise<void> {
    // Simplified Portuguese sentiment lexicon
    const sentimentData: [string, number, EmotionType][] = [
      // Positive emotions
      ['bom', 0.7, 'joy'],
      ['ótimo', 0.9, 'joy'],
      ['excelente', 0.9, 'joy'],
      ['feliz', 0.8, 'joy'],
      ['contente', 0.6, 'joy'],
      ['satisfeito', 0.7, 'joy'],
      ['tranquilo', 0.5, 'trust'],
      ['calmo', 0.5, 'trust'],
      ['confiante', 0.6, 'trust'],
      ['esperançoso', 0.7, 'hope'],
      ['otimista', 0.7, 'hope'],
      ['animado', 0.6, 'anticipation'],
      
      // Negative emotions
      ['mal', -0.6, 'sadness'],
      ['ruim', -0.7, 'sadness'],
      ['péssimo', -0.9, 'sadness'],
      ['triste', -0.7, 'sadness'],
      ['deprimido', -0.8, 'sadness'],
      ['chateado', -0.5, 'sadness'],
      ['preocupado', -0.6, 'anxiety'],
      ['ansioso', -0.7, 'anxiety'],
      ['nervoso', -0.6, 'anxiety'],
      ['estressado', -0.7, 'anxiety'],
      ['com medo', -0.8, 'fear'],
      ['receoso', -0.6, 'fear'],
      ['irritado', -0.7, 'anger'],
      ['frustrado', -0.7, 'frustration'],
      ['bravo', -0.8, 'anger'],
      ['zangado', -0.7, 'anger'],
      
      // Symptom-related
      ['dor', -0.8, 'sadness'],
      ['doendo', -0.8, 'sadness'],
      ['machucando', -0.7, 'sadness'],
      ['desconforto', -0.6, 'sadness'],
      ['incomodando', -0.5, 'sadness'],
      
      // Neutral/factual
      ['normal', 0.0, 'neutral'],
      ['comum', 0.0, 'neutral'],
      ['regular', 0.0, 'neutral']
    ];
    
    sentimentData.forEach(([word, polarity, emotion]) => {
      this.sentimentLexicon.set(word, { polarity, emotion });
    });
    
    logger.info(`Loaded sentiment lexicon with ${sentimentData.length} entries`);
  }

  private async loadMedicalTerminology(): Promise<void> {
    // Simplified medical terminology
    const medicalTerms: [string, HealthEntityType, MedicalCoding[]][] = [
      ['dor de cabeça', 'symptom', [{ system: 'ICD10', code: 'R51', description: 'Headache', confidence: 0.9 }]],
      ['febre', 'symptom', [{ system: 'ICD10', code: 'R50', description: 'Fever', confidence: 0.9 }]],
      ['tosse', 'symptom', [{ system: 'ICD10', code: 'R05', description: 'Cough', confidence: 0.9 }]],
      ['náusea', 'symptom', [{ system: 'ICD10', code: 'R11', description: 'Nausea and vomiting', confidence: 0.9 }]],
      ['dor no peito', 'symptom', [{ system: 'ICD10', code: 'R07.9', description: 'Chest pain', confidence: 0.9 }]],
      ['falta de ar', 'symptom', [{ system: 'ICD10', code: 'R06.0', description: 'Dyspnea', confidence: 0.9 }]],
      ['tontura', 'symptom', [{ system: 'ICD10', code: 'R42', description: 'Dizziness', confidence: 0.9 }]],
      
      // Medications
      ['paracetamol', 'medication', [{ system: 'RxNorm', code: '161', description: 'Acetaminophen', confidence: 0.9 }]],
      ['ibuprofeno', 'medication', [{ system: 'RxNorm', code: '5640', description: 'Ibuprofen', confidence: 0.9 }]],
      ['dipirona', 'medication', [{ system: 'RxNorm', code: '6135', description: 'Metamizole', confidence: 0.9 }]],
      
      // Body parts
      ['cabeça', 'body_part', [{ system: 'SNOMED', code: '69536005', description: 'Head structure', confidence: 0.9 }]],
      ['peito', 'body_part', [{ system: 'SNOMED', code: '51185008', description: 'Thoracic structure', confidence: 0.9 }]],
      ['barriga', 'body_part', [{ system: 'SNOMED', code: '21082005', description: 'Abdominal structure', confidence: 0.9 }]],
      
      // Conditions
      ['diabetes', 'condition', [{ system: 'ICD10', code: 'E11', description: 'Type 2 diabetes mellitus', confidence: 0.9 }]],
      ['hipertensão', 'condition', [{ system: 'ICD10', code: 'I10', description: 'Essential hypertension', confidence: 0.9 }]],
      ['asma', 'condition', [{ system: 'ICD10', code: 'J45', description: 'Asthma', confidence: 0.9 }]]
    ];
    
    medicalTerms.forEach(([term, type, codes]) => {
      this.medicalTerms.set(term, { category: type, codes });
    });
    
    logger.info(`Loaded medical terminology with ${medicalTerms.length} entries`);
  }

  private async loadIntentPatterns(): Promise<void> {
    const intentPatterns: [HealthIntent, string[], RegExp[]][] = [
      [
        'symptom_reporting',
        ['dor', 'sentindo', 'sintoma', 'desconforto', 'mal'],
        [/estou sentindo/, /tenho uma? dor/, /sinto/, /incomoda/]
      ],
      [
        'emergency_situation',
        ['emergência', 'urgente', 'socorro', 'grave', 'imediato'],
        [/não consigo/, /muito forte/, /emergência/, /socorro/]
      ],
      [
        'appointment_request',
        ['agendar', 'marcar', 'consulta', 'horário', 'médico'],
        [/quero agendar/, /marcar consulta/, /preciso de horário/]
      ],
      [
        'medication_inquiry',
        ['medicamento', 'remédio', 'tomar', 'dosagem', 'efeito'],
        [/posso tomar/, /que medicamento/, /efeito colateral/]
      ],
      [
        'health_education',
        ['como', 'porque', 'explicar', 'entender', 'informação'],
        [/como funciona/, /por que/, /me explica/, /gostaria de saber/]
      ],
      [
        'mental_health_support',
        ['ansioso', 'deprimido', 'estressado', 'mental', 'psicológico'],
        [/me sinto/, /estou ansioso/, /deprimido/, /estresse/]
      ]
    ];
    
    intentPatterns.forEach(([intent, keywords, patterns]) => {
      this.intentPatterns.set(intent, { keywords, patterns });
    });
    
    logger.info(`Loaded intent patterns for ${intentPatterns.length} intents`);
  }

  // Additional helper methods for quality assessment
  private assessClarity(text: string, words: string[], qualityFactors: QualityFactor[]): number {
    let clarity = 5; // Base score
    
    // Positive factors
    if (words.length >= 10 && words.length <= 50) {
      clarity += 2;
      qualityFactors.push({ factor: 'appropriate_length', impact: 2, explanation: 'Message has appropriate length for clarity' });
    }
    
    // Negative factors
    const complexWords = words.filter(word => word.length > 10).length;
    if (complexWords > words.length * 0.3) {
      clarity -= 2;
      qualityFactors.push({ factor: 'complex_vocabulary', impact: -2, explanation: 'High percentage of complex words' });
    }
    
    return Math.max(0, Math.min(10, clarity));
  }

  private assessCompleteness(text: string, words: string[], context: any, qualityFactors: QualityFactor[]): number {
    let completeness = 5; // Base score
    
    // Check for complete sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 0) {
      completeness += 1;
      qualityFactors.push({ factor: 'complete_sentences', impact: 1, explanation: 'Contains complete sentences' });
    }
    
    // Check for specific details
    const specificWords = ['quando', 'onde', 'como', 'quanto', 'porque'];
    const specificity = specificWords.filter(word => text.toLowerCase().includes(word)).length;
    completeness += specificity * 0.5;
    
    return Math.max(0, Math.min(10, completeness));
  }

  private assessRelevance(text: string, context: any, qualityFactors: QualityFactor[]): number {
    let relevance = 7; // Assume relevant unless proven otherwise
    
    // This would be enhanced with actual context analysis
    // For now, basic health-related keyword checking
    const healthKeywords = ['saúde', 'médico', 'sintoma', 'tratamento', 'medicamento'];
    const healthMentions = healthKeywords.filter(keyword => text.toLowerCase().includes(keyword)).length;
    
    if (healthMentions > 0) {
      relevance += 1;
      qualityFactors.push({ factor: 'health_related', impact: 1, explanation: 'Contains health-related terms' });
    }
    
    return Math.max(0, Math.min(10, relevance));
  }

  private assessSpecificity(text: string, words: string[], qualityFactors: QualityFactor[]): number {
    let specificity = 5; // Base score
    
    // Check for specific medical terms
    const medicalTermsFound = Array.from(this.medicalTerms.keys())
      .filter(term => text.toLowerCase().includes(term)).length;
    
    specificity += medicalTermsFound * 0.5;
    
    if (medicalTermsFound > 0) {
      qualityFactors.push({ 
        factor: 'medical_terminology', 
        impact: medicalTermsFound * 0.5, 
        explanation: `Contains ${medicalTermsFound} medical terms` 
      });
    }
    
    return Math.max(0, Math.min(10, specificity));
  }

  private assessCoherence(text: string, conversationHistory?: any[], qualityFactors?: QualityFactor[]): number {
    let coherence = 7; // Base score for single message coherence
    
    // Check for logical flow within the message
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length > 1) {
      // Simple coherence check - would be enhanced with actual discourse analysis
      coherence += 1;
      qualityFactors?.push({ factor: 'multi_sentence', impact: 1, explanation: 'Multiple sentences with logical flow' });
    }
    
    return Math.max(0, Math.min(10, coherence));
  }

  private assessInformationDensity(text: string, words: string[], qualityFactors: QualityFactor[]): number {
    const contentWords = words.filter(word => 
      !['o', 'a', 'de', 'do', 'da', 'em', 'um', 'uma', 'para', 'com'].includes(word)
    );
    
    const density = contentWords.length / Math.max(words.length, 1);
    const score = density * 10;
    
    qualityFactors.push({ 
      factor: 'information_density', 
      impact: score - 5, 
      explanation: `Information density: ${(density * 100).toFixed(1)}%` 
    });
    
    return Math.max(0, Math.min(10, score));
  }

  private async assessClinicalUtility(text: string, context: any, qualityFactors: QualityFactor[]): Promise<number> {
    let utility = 5; // Base score
    
    // Check for actionable information
    const actionableKeywords = ['desde', 'há', 'durante', 'vezes por', 'escala de'];
    const actionableInfo = actionableKeywords.filter(keyword => text.toLowerCase().includes(keyword)).length;
    
    utility += actionableInfo * 1.5;
    
    if (actionableInfo > 0) {
      qualityFactors.push({ 
        factor: 'actionable_information', 
        impact: actionableInfo * 1.5, 
        explanation: `Contains ${actionableInfo} actionable elements` 
      });
    }
    
    return Math.max(0, Math.min(10, utility));
  }

  private assessUserEngagement(text: string, conversationHistory?: any[], qualityFactors?: QualityFactor[]): number {
    let engagement = 5; // Base score
    
    // Check message length as engagement indicator
    if (text.length > 50) {
      engagement += 2;
      qualityFactors?.push({ factor: 'detailed_response', impact: 2, explanation: 'Detailed response indicates engagement' });
    }
    
    // Check for questions or curiosity
    if (text.includes('?') || text.toLowerCase().includes('como') || text.toLowerCase().includes('porque')) {
      engagement += 1;
      qualityFactors?.push({ factor: 'curiosity_questions', impact: 1, explanation: 'Shows curiosity and engagement' });
    }
    
    return Math.max(0, Math.min(10, engagement));
  }

  // Placeholder methods for complex analysis - would be fully implemented
  private async extractHealthEntities(text: string, words: string[], entities: HealthEntity[]): Promise<void> {
    // Implementation would use advanced NER models
    // For now, basic dictionary matching
    Array.from(this.medicalTerms.entries()).forEach(([term, info]) => {
      if (text.toLowerCase().includes(term)) {
        entities.push({
          id: `entity_${entities.length}`,
          type: info.category,
          value: term,
          normalizedValue: term,
          confidence: 0.8,
          startPos: text.toLowerCase().indexOf(term),
          endPos: text.toLowerCase().indexOf(term) + term.length,
          context: text,
          attributes: [],
          medicalCoding: info.codes
        });
      }
    });
  }

  private async extractTemporalInfo(text: string, temporalInfo: TemporalInfo[]): Promise<void> {
    const temporalPatterns = [
      { pattern: /há (\d+) (dia|semana|mês|ano)s?/gi, type: 'onset_time' as TemporalType },
      { pattern: /desde (\w+)/gi, type: 'onset_time' as TemporalType },
      { pattern: /(\d+) vezes? por (dia|semana|mês)/gi, type: 'frequency' as TemporalType }
    ];
    
    temporalPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        temporalInfo.push({
          timeExpression: match[0],
          normalizedTime: match[0], // Would be properly normalized
          temporalType: type,
          confidence: 0.8
        });
      }
    });
  }

  private async identifyEntityRelationships(entities: HealthEntity[], text: string, relationships: EntityRelationship[]): Promise<void> {
    // Basic relationship identification - would be enhanced with advanced NLP
    for (let i = 0; i < entities.length - 1; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const entity1 = entities[i];
        const entity2 = entities[j];
        
        // Simple co-occurrence relationship
        if (Math.abs(entity1.startPos - entity2.startPos) < 50) {
          relationships.push({
            sourceEntity: entity1.id,
            targetEntity: entity2.id,
            relationshipType: 'occurs_with',
            confidence: 0.6,
            evidenceText: text.substring(
              Math.min(entity1.startPos, entity2.startPos),
              Math.max(entity1.endPos, entity2.endPos)
            )
          });
        }
      }
    }
  }

  private async extractMedicalConcepts(entities: HealthEntity[], text: string, concepts: MedicalConcept[]): Promise<void> {
    // Group related entities into medical concepts
    const symptomEntities = entities.filter(e => e.type === 'symptom');
    if (symptomEntities.length > 1) {
      concepts.push({
        concept: 'symptom_cluster',
        category: 'symptom_cluster',
        relevance: 0.8,
        associatedEntities: symptomEntities.map(e => e.id),
        clinicalSignificance: 'medium'
      });
    }
  }

  private async identifyRiskFactors(entities: HealthEntity[], text: string, riskFactors: RiskFactor[]): Promise<void> {
    // Identify potential risk factors from entities
    const riskIndicators = [
      { entity: 'dor no peito', category: 'cardiovascular' as RiskCategory, severity: 8 },
      { entity: 'falta de ar', category: 'cardiovascular' as RiskCategory, severity: 7 },
      { entity: 'diabetes', category: 'metabolic' as RiskCategory, severity: 6 }
    ];
    
    riskIndicators.forEach(indicator => {
      if (entities.some(e => e.value === indicator.entity)) {
        riskFactors.push({
          factor: indicator.entity,
          category: indicator.category,
          severity: indicator.severity,
          modifiable: true,
          associatedConditions: [],
          recommendations: [`Evaluate ${indicator.entity} symptoms`]
        });
      }
    });
  }

  // Conversation analysis methods (simplified implementations)
  private async extractKeyTopics(conversationHistory: any[]): Promise<TopicInsight[]> {
    // Would implement sophisticated topic modeling
    return [];
  }

  private async analyzeEmotionalJourney(conversationHistory: any[]): Promise<EmotionalTrend[]> {
    // Would analyze emotional progression through conversation
    return [];
  }

  private async analyzeRiskProgression(conversationHistory: any[]): Promise<RiskProgression> {
    // Would track how risk assessment changes over time
    return {
      initialRisk: 0,
      currentRisk: 0,
      riskTrend: 'stable',
      criticalPoints: [],
      predictedRisk: 0
    };
  }

  private async analyzeEngagementPattern(conversationHistory: any[]): Promise<EngagementPattern> {
    // Would analyze user engagement patterns
    return {
      averageResponseLength: 0,
      responseTimePattern: [],
      engagementLevel: 5,
      participationQuality: 5,
      topicSwitchingRate: 0,
      clarificationNeeds: 0
    };
  }

  private async analyzeCommunicationStyle(conversationHistory: any[]): Promise<CommunicationStyle> {
    // Would analyze user's communication preferences
    return {
      formalityLevel: 5,
      directnessPreference: 5,
      detailOrientation: 5,
      emotionalExpressiveness: 5,
      questioningStyle: 'exploratory',
      preferredResponseLength: 'moderate'
    };
  }

  private async generateRecommendedActions(
    keyTopics: TopicInsight[],
    emotionalJourney: EmotionalTrend[],
    riskProgression: RiskProgression,
    engagementPattern: EngagementPattern
  ): Promise<RecommendedAction[]> {
    // Would generate context-aware action recommendations
    return [];
  }

  // Utility methods
  private async applyContextualBoosting(
    intentScores: Map<HealthIntent, number>,
    text: string,
    words: string[],
    contextFactors: ContextFactor[]
  ): Promise<void> {
    // Apply various contextual boosts to intent scores
    
    // Time-based boosting
    const hour = new Date().getHours();
    if ((hour < 6 || hour > 22) && intentScores.has('emergency_situation')) {
      intentScores.set('emergency_situation', (intentScores.get('emergency_situation') || 0) + 1);
      contextFactors.push({
        type: 'temporal',
        value: 'late_night_early_morning',
        relevance: 0.7
      });
    }
    
    // Severity boosting
    const severityWords = ['muito', 'extremamente', 'insuportável', 'terrível'];
    if (severityWords.some(word => text.toLowerCase().includes(word))) {
      intentScores.forEach((score, intent) => {
        if (['symptom_reporting', 'emergency_situation'].includes(intent)) {
          intentScores.set(intent, score + 1.5);
        }
      });
      
      contextFactors.push({
        type: 'severity',
        value: 'high_severity_indicators',
        relevance: 0.9
      });
    }
  }

  private determineUrgencyLevel(intent: HealthIntent, text: string, words: string[]): UrgencyLevel {
    const emergencyKeywords = ['emergência', 'urgente', 'socorro', 'grave', 'imediato'];
    const highUrgencyKeywords = ['dor forte', 'não consigo', 'muito mal', 'piorando'];
    
    if (intent === 'emergency_situation' || emergencyKeywords.some(k => text.toLowerCase().includes(k))) {
      return 'emergency';
    }
    
    if (highUrgencyKeywords.some(k => text.toLowerCase().includes(k))) {
      return 'high';
    }
    
    if (['symptom_reporting', 'pain_description'].includes(intent)) {
      return 'medium';
    }
    
    return 'low';
  }

  private determineActionRequired(intent: HealthIntent, urgencyLevel: UrgencyLevel): ActionType {
    if (urgencyLevel === 'emergency') {
      return 'emergency_protocol';
    }
    
    if (urgencyLevel === 'high') {
      return 'escalate_to_human';
    }
    
    const actionMap: Record<HealthIntent, ActionType> = {
      'symptom_reporting': 'collect_more_info',
      'appointment_request': 'schedule_appointment',
      'health_education': 'educational_content',
      'medication_inquiry': 'provide_information',
      'mental_health_support': 'provide_reassurance',
      'emergency_situation': 'emergency_protocol',
      'pain_description': 'collect_more_info',
      'preventive_care': 'educational_content',
      'lifestyle_advice': 'educational_content',
      'second_opinion': 'escalate_to_human',
      'test_results_inquiry': 'escalate_to_human',
      'general_wellness': 'provide_information',
      'medical_history': 'collect_more_info',
      'family_history': 'collect_more_info',
      'side_effects_reporting': 'escalate_to_human',
      'treatment_compliance': 'provide_reassurance',
      'insurance_question': 'provide_information',
      'cost_inquiry': 'provide_information',
      'provider_recommendation': 'provide_information',
      'routine_checkup': 'schedule_appointment'
    };
    
    return actionMap[intent] || 'provide_information';
  }

  private shouldEscalate(intent: HealthIntent, urgencyLevel: UrgencyLevel, text: string): boolean {
    if (urgencyLevel === 'emergency' || urgencyLevel === 'critical') {
      return true;
    }
    
    const escalationIntents: HealthIntent[] = [
      'emergency_situation', 'second_opinion', 'test_results_inquiry', 'side_effects_reporting'
    ];
    
    return escalationIntents.includes(intent);
  }

  private async cacheSentimentResult(text: string, result: SentimentAnalysisResult): Promise<void> {
    try {
      const cacheKey = `sentiment_cache:${Buffer.from(text).toString('base64')}`;
      await this.redis.setex(cacheKey, 3600, JSON.stringify(result)); // 1 hour cache
    } catch (error) {
      logger.error('Error caching sentiment result', error);
    }
  }

  /**
   * Public interface methods
   */

  /**
   * Analyze complete message with all NLP features
   */
  async analyzeMessage(
    text: string,
    context?: any
  ): Promise<{
    sentiment: SentimentAnalysisResult;
    intent: IntentClassification;
    entities: AdvancedEntityExtraction;
    quality: ConversationQualityMetrics;
  }> {
    try {
      const [sentiment, intent, entities, quality] = await Promise.all([
        this.analyzeSentiment(text, context),
        this.classifyIntent(text, context),
        this.extractEntities(text, context),
        this.assessConversationQuality(text, undefined, context)
      ]);
      
      return { sentiment, intent, entities, quality };
    } catch (error) {
      logger.error('Error in comprehensive message analysis', error);
      throw error;
    }
  }

  /**
   * Get NLP service statistics
   */
  async getNLPStatistics(): Promise<{
    lexiconSize: number;
    medicalTermsCount: number;
    intentPatternsCount: number;
    processingSpeed: number;
  }> {
    return {
      lexiconSize: this.sentimentLexicon.size,
      medicalTermsCount: this.medicalTerms.size,
      intentPatternsCount: this.intentPatterns.size,
      processingSpeed: 0 // Would track actual processing metrics
    };
  }
}