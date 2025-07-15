/**
 * Advanced Conversation Flow Engine
 * Sophisticated conversation branching with 5-8 depth levels
 * Adaptive questioning based on previous responses
 * Context-aware follow-up system with natural conversation trees
 */

import { logger } from '../utils/logger';
import { RedisService } from './redisService';
import { PersonaType } from '../types/ai';

export interface ConversationNode {
  id: string;
  type: 'question' | 'information' | 'branch' | 'action' | 'assessment' | 'followup';
  content: string;
  persona?: PersonaType;
  depth: number;
  conditions?: ConversationCondition[];
  branches: ConversationBranch[];
  metadata: {
    category: string;
    importance: 'low' | 'medium' | 'high' | 'critical';
    expectedResponseTime?: number;
    adaptiveWeight?: number;
    riskFactors?: string[];
    contextTags?: string[];
  };
}

export interface ConversationBranch {
  id: string;
  condition: ConversationCondition;
  nextNodeId: string;
  weight: number;
  adaptiveFactors?: {
    timeOfDay?: boolean;
    previousResponses?: boolean;
    riskProfile?: boolean;
    urgencyLevel?: boolean;
  };
}

export interface ConversationCondition {
  type: 'keyword' | 'sentiment' | 'length' | 'pattern' | 'risk_score' | 'context' | 'time_based' | 'adaptive';
  operator: 'contains' | 'equals' | 'greater_than' | 'less_than' | 'matches' | 'sentiment_positive' | 'sentiment_negative' | 'risk_high' | 'context_matches';
  value: any;
  confidence?: number;
}

export interface ConversationState {
  userId: string;
  sessionId: string;
  currentNodeId: string;
  conversationHistory: ConversationTurn[];
  context: ConversationContext;
  adaptiveProfile: AdaptiveProfile;
  riskAssessment: RiskAssessment;
  metadata: {
    startTime: Date;
    lastActivity: Date;
    totalTurns: number;
    averageResponseTime: number;
    engagementScore: number;
    qualityScore: number;
  };
}

export interface ConversationTurn {
  id: string;
  nodeId: string;
  userMessage: string;
  botResponse: string;
  timestamp: Date;
  sentiment: SentimentAnalysis;
  entityExtractions: EntityExtraction[];
  adaptiveFactors: AdaptiveFactors;
  qualityMetrics: QualityMetrics;
}

export interface ConversationContext {
  currentMission?: string;
  completedMissions: string[];
  healthProfile: {
    symptoms: string[];
    medications: string[];
    conditions: string[];
    riskFactors: string[];
  };
  personalContext: {
    age?: number;
    gender?: string;
    lifestyle: string[];
    concerns: string[];
  };
  conversationStyle: {
    preferredDepth: 'shallow' | 'medium' | 'deep';
    communicationStyle: 'direct' | 'supportive' | 'detailed';
    responseLength: 'brief' | 'moderate' | 'detailed';
  };
}

export interface AdaptiveProfile {
  engagementPatterns: {
    preferredQuestionTypes: string[];
    averageResponseLength: number;
    timePatterns: Record<string, number>;
    topicAffinities: Record<string, number>;
  };
  learningPreferences: {
    informationProcessing: 'visual' | 'textual' | 'interactive';
    pacePreference: 'fast' | 'moderate' | 'slow';
    detailLevel: 'high' | 'medium' | 'low';
  };
  communicationProfile: {
    formalityLevel: number; // 0-10
    empathyNeed: number; // 0-10
    directnessPreference: number; // 0-10
  };
}

export interface SentimentAnalysis {
  polarity: number; // -1 to 1
  subjectivity: number; // 0 to 1
  emotion: 'joy' | 'sadness' | 'anger' | 'fear' | 'surprise' | 'neutral';
  confidence: number;
  contextualSentiment: {
    healthAnxiety: number;
    satisfaction: number;
    confusion: number;
    urgency: number;
  };
}

export interface EntityExtraction {
  type: 'symptom' | 'medication' | 'condition' | 'duration' | 'severity' | 'body_part' | 'temporal' | 'emotional_state';
  value: string;
  confidence: number;
  context: string;
  normalizedValue?: string;
}

export interface AdaptiveFactors {
  responseQuality: number; // 0-10
  engagementLevel: number; // 0-10
  informationDensity: number; // 0-10
  clarityScore: number; // 0-10
  contextRelevance: number; // 0-10;
}

export interface QualityMetrics {
  completeness: number; // 0-10
  relevance: number; // 0-10
  specificity: number; // 0-10
  coherence: number; // 0-10
  clinicalValue: number; // 0-10
}

export interface RiskAssessment {
  overallRisk: number; // 0-100
  riskCategories: {
    cardiovascular: number;
    mental: number;
    respiratory: number;
    metabolic: number;
    emergency: number;
  };
  urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedActions: string[];
  escalationTriggers: string[];
}

export interface ConversationAnalytics {
  pathEffectiveness: Record<string, number>;
  branchingSuccessRates: Record<string, number>;
  adaptiveImprovements: Record<string, number>;
  userSatisfactionByPath: Record<string, number>;
  conversationOutcomes: Record<string, number>;
}

export class ConversationFlowEngine {
  private redis: RedisService;
  private conversationTree: Map<string, ConversationNode> = new Map();
  private activeStates: Map<string, ConversationState> = new Map();
  private analytics: ConversationAnalytics;

  constructor() {
    this.redis = new RedisService();
    this.analytics = this.initializeAnalytics();
    this.initializeConversationTree();
  }

  /**
   * Initialize the sophisticated conversation tree with 5-8 depth levels
   */
  private initializeConversationTree(): void {
    const nodes: ConversationNode[] = [
      // DEPTH 1: Entry Points
      {
        id: 'welcome_assessment',
        type: 'question',
        content: 'Olá! Sou {persona_name} e estou aqui para te ajudar com sua saúde. Como você está se sentindo hoje?',
        depth: 1,
        branches: [
          {
            id: 'feeling_good',
            condition: { type: 'sentiment', operator: 'sentiment_positive', value: 0.3 },
            nextNodeId: 'wellness_exploration',
            weight: 0.4
          },
          {
            id: 'feeling_bad',
            condition: { type: 'sentiment', operator: 'sentiment_negative', value: -0.3 },
            nextNodeId: 'symptom_assessment',
            weight: 0.4
          },
          {
            id: 'neutral_response',
            condition: { type: 'sentiment', operator: 'equals', value: 'neutral' },
            nextNodeId: 'neutral_exploration',
            weight: 0.2
          }
        ],
        metadata: {
          category: 'initial_assessment',
          importance: 'critical',
          expectedResponseTime: 30,
          adaptiveWeight: 1.0,
          contextTags: ['greeting', 'mood_assessment']
        }
      },

      // DEPTH 2: Primary Branching
      {
        id: 'symptom_assessment',
        type: 'question',
        content: 'Entendo que você não está se sentindo muito bem. Pode me contar mais sobre o que está incomodando?',
        depth: 2,
        branches: [
          {
            id: 'pain_symptoms',
            condition: { type: 'keyword', operator: 'contains', value: ['dor', 'doendo', 'machucando'] },
            nextNodeId: 'pain_deep_dive',
            weight: 0.3
          },
          {
            id: 'emotional_symptoms',
            condition: { type: 'keyword', operator: 'contains', value: ['triste', 'ansioso', 'deprimido', 'estressado'] },
            nextNodeId: 'mental_health_assessment',
            weight: 0.25
          },
          {
            id: 'respiratory_symptoms',
            condition: { type: 'keyword', operator: 'contains', value: ['respirar', 'falta de ar', 'tosse'] },
            nextNodeId: 'respiratory_assessment',
            weight: 0.25
          },
          {
            id: 'general_symptoms',
            condition: { type: 'pattern', operator: 'matches', value: /.*/ },
            nextNodeId: 'general_symptom_exploration',
            weight: 0.2
          }
        ],
        metadata: {
          category: 'symptom_classification',
          importance: 'high',
          expectedResponseTime: 60,
          adaptiveWeight: 0.9,
          riskFactors: ['symptom_reporting'],
          contextTags: ['symptoms', 'health_concern']
        }
      },

      // DEPTH 3: Specialized Assessments
      {
        id: 'pain_deep_dive',
        type: 'assessment',
        content: 'Vou te fazer algumas perguntas sobre sua dor para entender melhor. Em uma escala de 0 a 10, como você classificaria sua dor?',
        depth: 3,
        branches: [
          {
            id: 'severe_pain',
            condition: { type: 'pattern', operator: 'matches', value: /[8-9]|10|muito forte|insuportável/ },
            nextNodeId: 'emergency_pain_protocol',
            weight: 0.4,
            adaptiveFactors: { urgencyLevel: true, riskProfile: true }
          },
          {
            id: 'moderate_pain',
            condition: { type: 'pattern', operator: 'matches', value: /[5-7]|média|moderada/ },
            nextNodeId: 'pain_characteristics',
            weight: 0.4
          },
          {
            id: 'mild_pain',
            condition: { type: 'pattern', operator: 'matches', value: /[1-4]|leve|pouca/ },
            nextNodeId: 'mild_pain_management',
            weight: 0.2
          }
        ],
        metadata: {
          category: 'pain_assessment',
          importance: 'high',
          expectedResponseTime: 45,
          adaptiveWeight: 0.8,
          riskFactors: ['severe_pain', 'chronic_pain'],
          contextTags: ['pain', 'severity_assessment']
        }
      },

      // DEPTH 4: Detailed Exploration
      {
        id: 'pain_characteristics',
        type: 'question',
        content: 'Agora me ajude a entender melhor essa dor. Ela é mais como uma pontada, queimação, peso ou aperto?',
        depth: 4,
        branches: [
          {
            id: 'chest_pain_characteristics',
            condition: { type: 'context', operator: 'context_matches', value: 'chest_area' },
            nextNodeId: 'cardiac_risk_assessment',
            weight: 0.5,
            adaptiveFactors: { riskProfile: true, urgencyLevel: true }
          },
          {
            id: 'abdominal_pain_characteristics',
            condition: { type: 'context', operator: 'context_matches', value: 'abdominal_area' },
            nextNodeId: 'digestive_assessment',
            weight: 0.3
          },
          {
            id: 'musculoskeletal_pain',
            condition: { type: 'keyword', operator: 'contains', value: ['músculo', 'articulação', 'osso'] },
            nextNodeId: 'musculoskeletal_assessment',
            weight: 0.2
          }
        ],
        metadata: {
          category: 'pain_characterization',
          importance: 'high',
          expectedResponseTime: 60,
          adaptiveWeight: 0.7,
          riskFactors: ['cardiac_symptoms', 'acute_abdomen'],
          contextTags: ['pain_type', 'anatomical_location']
        }
      },

      // DEPTH 5: Specialized Deep Dive
      {
        id: 'cardiac_risk_assessment',
        type: 'assessment',
        content: 'Preciso fazer algumas perguntas importantes sobre sua dor no peito. Você também sente falta de ar, náusea ou dor irradiando para o braço?',
        depth: 5,
        branches: [
          {
            id: 'high_cardiac_risk',
            condition: { type: 'keyword', operator: 'contains', value: ['sim', 'falta de ar', 'náusea', 'braço', 'formigamento'] },
            nextNodeId: 'emergency_cardiac_protocol',
            weight: 0.8,
            adaptiveFactors: { urgencyLevel: true, riskProfile: true }
          },
          {
            id: 'moderate_cardiac_risk',
            condition: { type: 'pattern', operator: 'matches', value: /talvez|às vezes|um pouco/ },
            nextNodeId: 'cardiac_follow_up',
            weight: 0.2
          }
        ],
        metadata: {
          category: 'cardiac_assessment',
          importance: 'critical',
          expectedResponseTime: 30,
          adaptiveWeight: 1.0,
          riskFactors: ['myocardial_infarction', 'acute_coronary_syndrome'],
          contextTags: ['cardiac_emergency', 'chest_pain', 'associated_symptoms']
        }
      },

      // DEPTH 6: Emergency Protocols
      {
        id: 'emergency_cardiac_protocol',
        type: 'action',
        content: '🚨 ATENÇÃO URGENTE: Os sintomas que você descreveu podem indicar um problema cardíaco sério. PROCURE ATENDIMENTO MÉDICO IMEDIATAMENTE! Ligue 192 (SAMU) agora mesmo.',
        depth: 6,
        branches: [
          {
            id: 'emergency_acknowledged',
            condition: { type: 'keyword', operator: 'contains', value: ['ok', 'entendi', 'vou', 'já'] },
            nextNodeId: 'emergency_support',
            weight: 1.0
          }
        ],
        metadata: {
          category: 'emergency_protocol',
          importance: 'critical',
          expectedResponseTime: 15,
          adaptiveWeight: 1.0,
          riskFactors: ['life_threatening'],
          contextTags: ['emergency', 'immediate_action', 'escalation']
        }
      },

      // DEPTH 7: Support and Follow-up
      {
        id: 'emergency_support',
        type: 'information',
        content: 'Estou acompanhando sua situação. Enquanto busca atendimento, mantenha-se calmo, evite esforços e, se possível, tenha alguém com você. Vou notificar nossa equipe médica.',
        depth: 7,
        branches: [
          {
            id: 'support_acknowledged',
            condition: { type: 'pattern', operator: 'matches', value: /.*/ },
            nextNodeId: 'emergency_monitoring',
            weight: 1.0
          }
        ],
        metadata: {
          category: 'emergency_support',
          importance: 'critical',
          expectedResponseTime: 10,
          adaptiveWeight: 1.0,
          riskFactors: ['ongoing_emergency'],
          contextTags: ['support', 'monitoring', 'escalated']
        }
      },

      // DEPTH 8: Monitoring and Recovery
      {
        id: 'emergency_monitoring',
        type: 'followup',
        content: 'Conseguiu chegar ao hospital? Nossa equipe está de prontidão para acompanhar sua situação.',
        depth: 8,
        branches: [],
        metadata: {
          category: 'emergency_monitoring',
          importance: 'critical',
          expectedResponseTime: 5,
          adaptiveWeight: 1.0,
          riskFactors: ['post_emergency'],
          contextTags: ['monitoring', 'recovery', 'follow_up']
        }
      },

      // Wellness Exploration Branch (for positive sentiment)
      {
        id: 'wellness_exploration',
        type: 'question',
        content: 'Que bom saber que você está bem! Vamos aproveitar para falar sobre prevenção e bem-estar. Há algo específico sobre sua saúde que gostaria de melhorar?',
        depth: 2,
        branches: [
          {
            id: 'fitness_interest',
            condition: { type: 'keyword', operator: 'contains', value: ['exercício', 'atividade física', 'fitness', 'academia'] },
            nextNodeId: 'fitness_assessment',
            weight: 0.3
          },
          {
            id: 'nutrition_interest',
            condition: { type: 'keyword', operator: 'contains', value: ['alimentação', 'dieta', 'peso', 'nutrição'] },
            nextNodeId: 'nutrition_assessment',
            weight: 0.3
          },
          {
            id: 'preventive_care',
            condition: { type: 'keyword', operator: 'contains', value: ['exames', 'check-up', 'prevenção'] },
            nextNodeId: 'preventive_care_planning',
            weight: 0.4
          }
        ],
        metadata: {
          category: 'wellness_planning',
          importance: 'medium',
          expectedResponseTime: 45,
          adaptiveWeight: 0.6,
          contextTags: ['wellness', 'prevention', 'health_optimization']
        }
      }
    ];

    nodes.forEach(node => {
      this.conversationTree.set(node.id, node);
    });

    logger.info(`Initialized conversation tree with ${nodes.length} nodes, max depth: 8`);
  }

  /**
   * Process user message and determine next conversation step
   */
  async processMessage(
    userId: string,
    message: string,
    persona: PersonaType,
    sessionId?: string
  ): Promise<{
    response: string;
    nextNode: ConversationNode;
    state: ConversationState;
    analytics: Partial<ConversationAnalytics>;
  }> {
    try {
      // Get or create conversation state
      let state = await this.getConversationState(userId, sessionId);
      if (!state) {
        state = await this.initializeConversationState(userId, sessionId);
      }

      // Analyze the message
      const sentimentAnalysis = await this.analyzeSentiment(message);
      const entityExtractions = await this.extractEntities(message);
      const adaptiveFactors = await this.calculateAdaptiveFactors(message, state);
      const qualityMetrics = await this.assessResponseQuality(message, state);

      // Get current node
      const currentNode = this.conversationTree.get(state.currentNodeId);
      if (!currentNode) {
        throw new Error(`Invalid current node: ${state.currentNodeId}`);
      }

      // Find next node based on sophisticated branching logic
      const nextNode = await this.findNextNode(
        currentNode,
        message,
        state,
        sentimentAnalysis,
        entityExtractions
      );

      // Create conversation turn
      const turn: ConversationTurn = {
        id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nodeId: currentNode.id,
        userMessage: message,
        botResponse: '', // Will be filled after response generation
        timestamp: new Date(),
        sentiment: sentimentAnalysis,
        entityExtractions,
        adaptiveFactors,
        qualityMetrics
      };

      // Update conversation state
      state.conversationHistory.push(turn);
      state.currentNodeId = nextNode.id;
      state.lastActivity = new Date();
      state.metadata.totalTurns++;
      state.metadata.engagementScore = this.calculateEngagementScore(state);
      state.metadata.qualityScore = this.calculateQualityScore(state);

      // Update adaptive profile
      await this.updateAdaptiveProfile(state, turn);

      // Update risk assessment
      state.riskAssessment = await this.updateRiskAssessment(state, entityExtractions);

      // Generate personalized response
      const response = await this.generatePersonalizedResponse(nextNode, state, persona);
      turn.botResponse = response;

      // Save state
      await this.saveConversationState(state);

      // Update analytics
      await this.updateAnalytics(currentNode.id, nextNode.id, state);

      logger.info(`Conversation processed for user ${userId}`, {
        currentNode: currentNode.id,
        nextNode: nextNode.id,
        depth: nextNode.depth,
        sentiment: sentimentAnalysis.emotion,
        riskLevel: state.riskAssessment.urgencyLevel
      });

      return {
        response,
        nextNode,
        state,
        analytics: this.analytics
      };

    } catch (error) {
      logger.error(`Error processing conversation for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Find next conversation node using sophisticated branching logic
   */
  private async findNextNode(
    currentNode: ConversationNode,
    message: string,
    state: ConversationState,
    sentiment: SentimentAnalysis,
    entities: EntityExtraction[]
  ): Promise<ConversationNode> {
    
    // Calculate branch weights with adaptive factors
    const branchScores = await Promise.all(
      currentNode.branches.map(async (branch) => {
        let score = branch.weight;
        
        // Apply condition matching
        const conditionMatch = await this.evaluateCondition(
          branch.condition,
          message,
          sentiment,
          entities,
          state
        );
        
        if (!conditionMatch) {
          return { branch, score: 0 };
        }

        // Apply adaptive factors
        if (branch.adaptiveFactors) {
          if (branch.adaptiveFactors.timeOfDay) {
            score *= this.getTimeOfDayMultiplier();
          }
          
          if (branch.adaptiveFactors.previousResponses) {
            score *= this.getPreviousResponseMultiplier(state);
          }
          
          if (branch.adaptiveFactors.riskProfile) {
            score *= this.getRiskProfileMultiplier(state.riskAssessment);
          }
          
          if (branch.adaptiveFactors.urgencyLevel) {
            score *= this.getUrgencyMultiplier(state.riskAssessment.urgencyLevel);
          }
        }

        return { branch, score };
      })
    );

    // Select branch with highest score
    const selectedBranch = branchScores
      .filter(bs => bs.score > 0)
      .sort((a, b) => b.score - a.score)[0];

    if (!selectedBranch) {
      // Fallback to default node
      return this.conversationTree.get('general_symptom_exploration') || currentNode;
    }

    const nextNode = this.conversationTree.get(selectedBranch.branch.nextNodeId);
    if (!nextNode) {
      throw new Error(`Next node not found: ${selectedBranch.branch.nextNodeId}`);
    }

    return nextNode;
  }

  /**
   * Evaluate conversation condition with sophisticated logic
   */
  private async evaluateCondition(
    condition: ConversationCondition,
    message: string,
    sentiment: SentimentAnalysis,
    entities: EntityExtraction[],
    state: ConversationState
  ): Promise<boolean> {
    const messageText = message.toLowerCase();

    switch (condition.type) {
      case 'keyword':
        if (condition.operator === 'contains') {
          const keywords = Array.isArray(condition.value) ? condition.value : [condition.value];
          return keywords.some(keyword => messageText.includes(keyword.toLowerCase()));
        }
        break;

      case 'sentiment':
        switch (condition.operator) {
          case 'sentiment_positive':
            return sentiment.polarity >= condition.value;
          case 'sentiment_negative':
            return sentiment.polarity <= condition.value;
          default:
            return sentiment.emotion === condition.value;
        }

      case 'pattern':
        if (condition.operator === 'matches') {
          const regex = new RegExp(condition.value, 'i');
          return regex.test(messageText);
        }
        break;

      case 'risk_score':
        if (condition.operator === 'greater_than') {
          return state.riskAssessment.overallRisk > condition.value;
        }
        break;

      case 'context':
        if (condition.operator === 'context_matches') {
          return this.checkContextMatch(condition.value, state, entities);
        }
        break;

      case 'adaptive':
        return this.evaluateAdaptiveCondition(condition, state);
    }

    return false;
  }

  /**
   * Generate personalized response based on node and state
   */
  private async generatePersonalizedResponse(
    node: ConversationNode,
    state: ConversationState,
    persona: PersonaType
  ): Promise<string> {
    let response = node.content;

    // Replace persona placeholders
    const personaName = persona === 'ana' ? 'Ana' : 'Zeca';
    response = response.replace('{persona_name}', personaName);

    // Add persona-specific tone adjustments
    if (persona === 'ana') {
      response = this.addAnaPersonality(response, state);
    } else {
      response = this.addZecaPersonality(response, state);
    }

    // Add adaptive personalization based on user profile
    response = await this.addAdaptivePersonalization(response, state);

    // Add context-aware elements
    response = this.addContextualElements(response, state);

    return response;
  }

  private addAnaPersonality(response: string, state: ConversationState): string {
    // Ana's empathetic, caring tone
    const empathyPhrases = [
      'Querida,', 'Amor,', 'Entendo perfeitamente,', 'Sei como é difícil,'
    ];
    
    const supportivePhrases = [
      '💕 Estou aqui para te apoiar.', 
      '✨ Você está fazendo a coisa certa buscando ajuda.',
      '🤗 Lembre-se que você não está sozinha.'
    ];

    // Add empathy based on sentiment and risk
    if (state.riskAssessment.urgencyLevel === 'high' || state.riskAssessment.urgencyLevel === 'critical') {
      const randomEmpathy = empathyPhrases[Math.floor(Math.random() * empathyPhrases.length)];
      response = `${randomEmpathy} ${response}`;
    }

    // Add supportive closing for longer conversations
    if (state.metadata.totalTurns > 3) {
      const randomSupport = supportivePhrases[Math.floor(Math.random() * supportivePhrases.length)];
      response += `\n\n${randomSupport}`;
    }

    return response;
  }

  private addZecaPersonality(response: string, state: ConversationState): string {
    // Zeca's direct, friendly, masculine tone
    const friendlyOpeners = [
      'Cara,', 'Irmão,', 'Beleza,', 'Entendi,'
    ];
    
    const motivationalPhrases = [
      '💪 Você está no caminho certo.',
      '👊 Vamos resolver isso juntos.',
      '🎯 Foco na solução!'
    ];

    // Add friendly approach for general wellness
    if (state.riskAssessment.urgencyLevel === 'low') {
      const randomOpener = friendlyOpeners[Math.floor(Math.random() * friendlyOpeners.length)];
      response = `${randomOpener} ${response}`;
    }

    // Add motivation for preventive care
    if (state.context.currentMission?.includes('wellness')) {
      const randomMotivation = motivationalPhrases[Math.floor(Math.random() * motivationalPhrases.length)];
      response += `\n\n${randomMotivation}`;
    }

    return response;
  }

  private async addAdaptivePersonalization(response: string, state: ConversationState): Promise<string> {
    // Adapt based on user's communication style preferences
    const profile = state.adaptiveProfile;

    // Adjust response length based on user preference
    if (profile.communicationProfile.directnessPreference > 7) {
      // User prefers direct communication - make response more concise
      response = this.makeResponseMoreDirect(response);
    } else if (profile.communicationProfile.empathyNeed > 7) {
      // User needs more empathy - add emotional support
      response = this.addEmotionalSupport(response);
    }

    // Adjust formality based on user pattern
    if (profile.communicationProfile.formalityLevel > 6) {
      response = this.increaseFormalityLevel(response);
    }

    return response;
  }

  private addContextualElements(response: string, state: ConversationState): string {
    // Add time-sensitive elements
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      response += '\n\n⏰ Notei que você está acordado(a) tarde/cedo. Como anda seu sono?';
    }

    // Add mission progress context
    if (state.context.completedMissions.length > 0) {
      const completedCount = state.context.completedMissions.length;
      response += `\n\n📈 Parabéns! Você já completou ${completedCount} ${completedCount === 1 ? 'missão' : 'missões'} de saúde.`;
    }

    return response;
  }

  // Utility methods for response personalization
  private makeResponseMoreDirect(response: string): string {
    return response
      .replace(/por favor,?\s*/gi, '')
      .replace(/gostaria de|poderia/gi, 'pode')
      .replace(/se possível,?\s*/gi, '');
  }

  private addEmotionalSupport(response: string): string {
    const supportPhrases = [
      'Entendo que pode ser preocupante.',
      'Você está sendo muito corajoso(a) ao buscar ajuda.',
      'Estou aqui para te apoiar nesse processo.'
    ];
    
    const randomSupport = supportPhrases[Math.floor(Math.random() * supportPhrases.length)];
    return `${randomSupport} ${response}`;
  }

  private increaseFormalityLevel(response: string): string {
    return response
      .replace(/você/gi, 'Você')
      .replace(/cara|amor|querida?/gi, '')
      .replace(/beleza|ok/gi, 'Perfeito');
  }

  // Analytics and state management methods
  private async analyzeSentiment(message: string): Promise<SentimentAnalysis> {
    // Simplified sentiment analysis - in production, use advanced NLP
    const positiveWords = ['bem', 'bom', 'ótimo', 'excelente', 'feliz', 'tranquilo'];
    const negativeWords = ['mal', 'ruim', 'péssimo', 'triste', 'ansioso', 'preocupado', 'dor'];
    
    const messageWords = message.toLowerCase().split(/\s+/);
    let positiveCount = 0;
    let negativeCount = 0;
    
    messageWords.forEach(word => {
      if (positiveWords.some(pw => word.includes(pw))) positiveCount++;
      if (negativeWords.some(nw => word.includes(nw))) negativeCount++;
    });
    
    const polarity = (positiveCount - negativeCount) / Math.max(messageWords.length, 1);
    const emotion = polarity > 0.1 ? 'joy' : polarity < -0.1 ? 'sadness' : 'neutral';
    
    return {
      polarity: Math.max(-1, Math.min(1, polarity)),
      subjectivity: 0.5, // Simplified
      emotion,
      confidence: 0.7,
      contextualSentiment: {
        healthAnxiety: negativeWords.filter(w => ['preocupado', 'ansioso', 'medo'].includes(w)).length > 0 ? 0.8 : 0.2,
        satisfaction: positiveCount > 0 ? 0.8 : 0.2,
        confusion: messageWords.includes('não') && messageWords.includes('entendi') ? 0.9 : 0.1,
        urgency: ['urgente', 'imediato', 'agora', 'rápido'].some(w => message.toLowerCase().includes(w)) ? 0.9 : 0.1
      }
    };
  }

  private async extractEntities(message: string): Promise<EntityExtraction[]> {
    const entities: EntityExtraction[] = [];
    const messageText = message.toLowerCase();

    // Symptom extraction
    const symptoms = ['dor', 'febre', 'tosse', 'náusea', 'tontura', 'cansaço', 'falta de ar'];
    symptoms.forEach(symptom => {
      if (messageText.includes(symptom)) {
        entities.push({
          type: 'symptom',
          value: symptom,
          confidence: 0.8,
          context: message,
          normalizedValue: symptom
        });
      }
    });

    // Body part extraction
    const bodyParts = ['cabeça', 'peito', 'barriga', 'perna', 'braço', 'costa', 'garganta'];
    bodyParts.forEach(part => {
      if (messageText.includes(part)) {
        entities.push({
          type: 'body_part',
          value: part,
          confidence: 0.9,
          context: message,
          normalizedValue: part
        });
      }
    });

    // Duration extraction
    const durationPatterns = [/(\d+)\s*(dia|semana|mês|hora)/gi];
    durationPatterns.forEach(pattern => {
      const matches = message.match(pattern);
      if (matches) {
        matches.forEach(match => {
          entities.push({
            type: 'duration',
            value: match,
            confidence: 0.9,
            context: message,
            normalizedValue: match
          });
        });
      }
    });

    return entities;
  }

  private async calculateAdaptiveFactors(message: string, state: ConversationState): Promise<AdaptiveFactors> {
    const messageLength = message.length;
    const wordCount = message.split(/\s+/).length;
    
    return {
      responseQuality: Math.min(10, Math.max(1, messageLength / 10)),
      engagementLevel: Math.min(10, wordCount / 2),
      informationDensity: Math.min(10, state.conversationHistory.length),
      clarityScore: messageLength > 5 ? 8 : 4,
      contextRelevance: state.metadata.totalTurns > 0 ? 7 : 5
    };
  }

  private async assessResponseQuality(message: string, state: ConversationState): Promise<QualityMetrics> {
    return {
      completeness: message.length > 20 ? 8 : 5,
      relevance: 7, // Would be calculated based on context
      specificity: message.split(/\s+/).length > 5 ? 7 : 4,
      coherence: 8, // Would use NLP analysis
      clinicalValue: state.riskAssessment.overallRisk > 50 ? 9 : 6
    };
  }

  private calculateEngagementScore(state: ConversationState): number {
    const turns = state.conversationHistory.length;
    const avgResponseTime = state.metadata.averageResponseTime;
    const qualitySum = state.conversationHistory.reduce((sum, turn) => 
      sum + turn.adaptiveFactors.engagementLevel, 0);
    
    return Math.min(10, (qualitySum / Math.max(turns, 1)) * (avgResponseTime < 60 ? 1.2 : 0.8));
  }

  private calculateQualityScore(state: ConversationState): number {
    const qualitySum = state.conversationHistory.reduce((sum, turn) => 
      sum + (turn.qualityMetrics.completeness + turn.qualityMetrics.relevance + 
             turn.qualityMetrics.specificity + turn.qualityMetrics.coherence) / 4, 0);
    
    return qualitySum / Math.max(state.conversationHistory.length, 1);
  }

  // State management methods
  private async getConversationState(userId: string, sessionId?: string): Promise<ConversationState | null> {
    try {
      const key = `conversation_state:${userId}:${sessionId || 'default'}`;
      const stateData = await this.redis.get(key);
      return stateData ? JSON.parse(stateData) : null;
    } catch (error) {
      logger.error(`Error getting conversation state for ${userId}`, error);
      return null;
    }
  }

  private async initializeConversationState(userId: string, sessionId?: string): Promise<ConversationState> {
    const state: ConversationState = {
      userId,
      sessionId: sessionId || `session_${Date.now()}`,
      currentNodeId: 'welcome_assessment',
      conversationHistory: [],
      context: {
        completedMissions: [],
        healthProfile: {
          symptoms: [],
          medications: [],
          conditions: [],
          riskFactors: []
        },
        personalContext: {
          lifestyle: [],
          concerns: []
        },
        conversationStyle: {
          preferredDepth: 'medium',
          communicationStyle: 'supportive',
          responseLength: 'moderate'
        }
      },
      adaptiveProfile: {
        engagementPatterns: {
          preferredQuestionTypes: [],
          averageResponseLength: 0,
          timePatterns: {},
          topicAffinities: {}
        },
        learningPreferences: {
          informationProcessing: 'textual',
          pacePreference: 'moderate',
          detailLevel: 'medium'
        },
        communicationProfile: {
          formalityLevel: 5,
          empathyNeed: 5,
          directnessPreference: 5
        }
      },
      riskAssessment: {
        overallRisk: 0,
        riskCategories: {
          cardiovascular: 0,
          mental: 0,
          respiratory: 0,
          metabolic: 0,
          emergency: 0
        },
        urgencyLevel: 'low',
        recommendedActions: [],
        escalationTriggers: []
      },
      metadata: {
        startTime: new Date(),
        lastActivity: new Date(),
        totalTurns: 0,
        averageResponseTime: 0,
        engagementScore: 0,
        qualityScore: 0
      }
    };

    await this.saveConversationState(state);
    return state;
  }

  private async saveConversationState(state: ConversationState): Promise<void> {
    try {
      const key = `conversation_state:${state.userId}:${state.sessionId}`;
      await this.redis.setex(key, 86400 * 7, JSON.stringify(state)); // 7 days expiry
      
      // Also save to active states for quick access
      this.activeStates.set(state.userId, state);
    } catch (error) {
      logger.error(`Error saving conversation state for ${state.userId}`, error);
      throw error;
    }
  }

  // Additional utility methods
  private initializeAnalytics(): ConversationAnalytics {
    return {
      pathEffectiveness: {},
      branchingSuccessRates: {},
      adaptiveImprovements: {},
      userSatisfactionByPath: {},
      conversationOutcomes: {}
    };
  }

  private getTimeOfDayMultiplier(): number {
    const hour = new Date().getHours();
    if (hour >= 6 && hour <= 9) return 1.2; // Morning boost
    if (hour >= 22 || hour <= 6) return 0.8; // Late night reduction
    return 1.0;
  }

  private getPreviousResponseMultiplier(state: ConversationState): number {
    const recentTurns = state.conversationHistory.slice(-3);
    const avgQuality = recentTurns.reduce((sum, turn) => 
      sum + turn.adaptiveFactors.responseQuality, 0) / Math.max(recentTurns.length, 1);
    
    return 0.5 + (avgQuality / 20); // Range: 0.5 - 1.0
  }

  private getRiskProfileMultiplier(riskAssessment: RiskAssessment): number {
    switch (riskAssessment.urgencyLevel) {
      case 'critical': return 2.0;
      case 'high': return 1.5;
      case 'medium': return 1.2;
      default: return 1.0;
    }
  }

  private getUrgencyMultiplier(urgencyLevel: string): number {
    return this.getRiskProfileMultiplier({ urgencyLevel } as RiskAssessment);
  }

  private checkContextMatch(contextValue: string, state: ConversationState, entities: EntityExtraction[]): boolean {
    // Check if context matches based on entity extractions and conversation history
    switch (contextValue) {
      case 'chest_area':
        return entities.some(e => e.type === 'body_part' && ['peito', 'tórax', 'coração'].includes(e.value));
      case 'abdominal_area':
        return entities.some(e => e.type === 'body_part' && ['barriga', 'abdomen', 'estômago'].includes(e.value));
      default:
        return false;
    }
  }

  private evaluateAdaptiveCondition(condition: ConversationCondition, state: ConversationState): boolean {
    // Implement adaptive condition evaluation based on user patterns
    // This is a placeholder for sophisticated adaptive logic
    return Math.random() > 0.5; // Simplified random for now
  }

  private async updateAdaptiveProfile(state: ConversationState, turn: ConversationTurn): Promise<void> {
    // Update user's adaptive profile based on conversation patterns
    const profile = state.adaptiveProfile;
    
    // Update engagement patterns
    profile.engagementPatterns.averageResponseLength = 
      (profile.engagementPatterns.averageResponseLength * (state.metadata.totalTurns - 1) + 
       turn.userMessage.length) / state.metadata.totalTurns;
    
    // Update communication profile based on message characteristics
    if (turn.userMessage.length < 20) {
      profile.communicationProfile.directnessPreference = Math.min(10, 
        profile.communicationProfile.directnessPreference + 0.1);
    }
    
    if (turn.sentiment.contextualSentiment.healthAnxiety > 0.7) {
      profile.communicationProfile.empathyNeed = Math.min(10, 
        profile.communicationProfile.empathyNeed + 0.2);
    }
  }

  private async updateRiskAssessment(state: ConversationState, entities: EntityExtraction[]): Promise<RiskAssessment> {
    const currentRisk = state.riskAssessment;
    
    // Update risk based on symptoms and entities
    entities.forEach(entity => {
      if (entity.type === 'symptom') {
        switch (entity.value) {
          case 'dor no peito':
            currentRisk.riskCategories.cardiovascular += 20;
            break;
          case 'falta de ar':
            currentRisk.riskCategories.respiratory += 15;
            currentRisk.riskCategories.cardiovascular += 10;
            break;
          case 'ansioso':
          case 'deprimido':
            currentRisk.riskCategories.mental += 15;
            break;
        }
      }
    });

    // Calculate overall risk
    const maxCategoryRisk = Math.max(...Object.values(currentRisk.riskCategories));
    currentRisk.overallRisk = Math.min(100, maxCategoryRisk);

    // Update urgency level
    if (currentRisk.overallRisk >= 80) {
      currentRisk.urgencyLevel = 'critical';
    } else if (currentRisk.overallRisk >= 60) {
      currentRisk.urgencyLevel = 'high';
    } else if (currentRisk.overallRisk >= 30) {
      currentRisk.urgencyLevel = 'medium';
    } else {
      currentRisk.urgencyLevel = 'low';
    }

    return currentRisk;
  }

  private async updateAnalytics(currentNodeId: string, nextNodeId: string, state: ConversationState): Promise<void> {
    // Update conversation analytics for continuous improvement
    const transitionKey = `${currentNodeId}->${nextNodeId}`;
    
    this.analytics.pathEffectiveness[transitionKey] = 
      (this.analytics.pathEffectiveness[transitionKey] || 0) + 1;
    
    this.analytics.branchingSuccessRates[currentNodeId] = 
      (this.analytics.branchingSuccessRates[currentNodeId] || 0) + 1;
    
    // Store analytics in Redis for persistence
    try {
      await this.redis.setex(
        'conversation_analytics', 
        86400 * 30, 
        JSON.stringify(this.analytics)
      );
    } catch (error) {
      logger.error('Error updating conversation analytics', error);
    }
  }

  /**
   * Public methods for external access
   */

  /**
   * Get conversation analytics
   */
  async getConversationAnalytics(): Promise<ConversationAnalytics> {
    return this.analytics;
  }

  /**
   * Reset conversation for user
   */
  async resetConversation(userId: string, sessionId?: string): Promise<void> {
    const key = `conversation_state:${userId}:${sessionId || 'default'}`;
    await this.redis.del(key);
    this.activeStates.delete(userId);
    
    logger.info(`Conversation reset for user ${userId}`);
  }

  /**
   * Get conversation statistics
   */
  async getConversationStatistics(): Promise<{
    totalActiveConversations: number;
    averageDepth: number;
    riskDistribution: Record<string, number>;
    engagementMetrics: Record<string, number>;
  }> {
    const activeStates = Array.from(this.activeStates.values());
    
    return {
      totalActiveConversations: activeStates.length,
      averageDepth: activeStates.reduce((sum, state) => 
        sum + (this.conversationTree.get(state.currentNodeId)?.depth || 0), 0) / 
        Math.max(activeStates.length, 1),
      riskDistribution: this.calculateRiskDistribution(activeStates),
      engagementMetrics: this.calculateEngagementMetrics(activeStates)
    };
  }

  private calculateRiskDistribution(states: ConversationState[]): Record<string, number> {
    const distribution: Record<string, number> = {
      low: 0, medium: 0, high: 0, critical: 0
    };
    
    states.forEach(state => {
      distribution[state.riskAssessment.urgencyLevel]++;
    });
    
    return distribution;
  }

  private calculateEngagementMetrics(states: ConversationState[]): Record<string, number> {
    return {
      averageEngagement: states.reduce((sum, state) => 
        sum + state.metadata.engagementScore, 0) / Math.max(states.length, 1),
      averageQuality: states.reduce((sum, state) => 
        sum + state.metadata.qualityScore, 0) / Math.max(states.length, 1),
      totalConversationTurns: states.reduce((sum, state) => 
        sum + state.metadata.totalTurns, 0)
    };
  }
}