import { OpenAIService } from './openaiService';
import { HealthPromptService } from './healthPromptService';
import { MissionService } from './missionService';
import { ConversationFlowEngine, ConversationState } from './conversationFlowEngine';
import { ConversationStateManager } from './conversationStateManager';
import { NLPAnalyticsService } from './nlpAnalyticsService';
import { AdaptiveMissionEngine } from './adaptiveMissionEngine';
import { PersonaType, ConversationContext } from '../types/ai';
import { logger } from '../utils/logger';

export interface WhatsAppMessageData {
  phone: string;
  message: string;
  senderName?: string;
  timestamp?: Date;
}

export interface WhatsAppResponse {
  message: string;
  shouldEscalate: boolean;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  escalationReason?: string;
  missionCompleted?: boolean;
  reward?: any;
  progressUpdate?: any;
  conversationInsights?: any;
  adaptations?: string[];
  qualityMetrics?: any;
  nextStepRecommendation?: string;
  sessionContinuity?: any;
}

export class WhatsAppAIIntegration {
  private openaiService: OpenAIService;
  private healthPromptService: HealthPromptService;
  private missionService: MissionService;
  private conversationFlowEngine: ConversationFlowEngine;
  private conversationStateManager: ConversationStateManager;
  private nlpAnalyticsService: NLPAnalyticsService;
  private adaptiveMissionEngine: AdaptiveMissionEngine;

  constructor() {
    this.openaiService = new OpenAIService();
    this.healthPromptService = new HealthPromptService();
    this.missionService = new MissionService();
    this.conversationFlowEngine = new ConversationFlowEngine();
    this.conversationStateManager = new ConversationStateManager();
    this.nlpAnalyticsService = new NLPAnalyticsService();
    this.adaptiveMissionEngine = new AdaptiveMissionEngine();
  }

  /**
   * Process incoming WhatsApp message with advanced AI and conversation flow
   */
  async processIncomingMessage(messageData: WhatsAppMessageData): Promise<WhatsAppResponse> {
    try {
      const { phone, message, senderName } = messageData;
      
      logger.info('Processing WhatsApp message with advanced AI flow', {
        phone: phone.substring(0, 5) + '***',
        messageLength: message.length,
        senderName
      });

      // Get user profile and determine persona
      const userProfile = await this.getUserProfile(phone);
      const persona: PersonaType = this.determinePersona(userProfile);
      
      // Create or resume conversation session
      const sessionResult = await this.conversationStateManager.createOrResumeSession(phone);
      let sessionContinuity = sessionResult.continuity;
      
      // Comprehensive NLP analysis
      const nlpAnalysis = await this.nlpAnalyticsService.analyzeMessage(message, {
        userProfile,
        sessionHistory: sessionResult.continuity
      });

      // Check for immediate escalation needs
      if (nlpAnalysis.intent.escalationNeeded || nlpAnalysis.intent.urgencyLevel === 'emergency') {
        logger.warn('Message requires immediate human intervention', {
          phone: phone.substring(0, 5) + '***',
          intent: nlpAnalysis.intent.primaryIntent,
          urgency: nlpAnalysis.intent.urgencyLevel
        });
        
        return {
          message: await this.getAdvancedEmergencyResponse(persona, nlpAnalysis),
          shouldEscalate: true,
          urgency: nlpAnalysis.intent.urgencyLevel,
          escalationReason: `${nlpAnalysis.intent.primaryIntent} with ${nlpAnalysis.intent.urgencyLevel} urgency`,
          conversationInsights: nlpAnalysis,
          sessionContinuity
        };
      }

      // Process conversation through advanced flow engine
      const conversationResult = await this.conversationFlowEngine.processMessage(
        phone,
        message,
        persona,
        sessionResult.sessionId
      );

      // Update conversation state with pattern detection
      const stateUpdateResult = await this.conversationStateManager.updateConversationState(
        conversationResult.state,
        conversationResult.state.conversationHistory[conversationResult.state.conversationHistory.length - 1]
      );

      // Get adaptive mission for user
      const adaptiveMissionResult = await this.adaptiveMissionEngine.getNextAdaptiveMission(
        phone,
        userProfile,
        conversationResult.state
      );

      // Process adaptive mission step if applicable
      let missionProgressResult = null;
      let adaptations: string[] = [];
      
      if (adaptiveMissionResult.mission) {
        const currentStep = adaptiveMissionResult.mission.adaptiveSteps[0]; // Simplified - would get actual current step
        
        // Adapt mission step based on context
        const stepAdaptationResult = await this.adaptiveMissionEngine.adaptMissionStep(
          currentStep.id,
          adaptiveMissionResult.mission.id,
          phone,
          {
            conversationState: conversationResult.state,
            sentiment: nlpAnalysis.sentiment,
            intent: nlpAnalysis.intent,
            entities: nlpAnalysis.entities,
            userResponse: message
          }
        );

        adaptations = [stepAdaptationResult.adaptationReason];

        // Update mission progress with dynamic scoring
        missionProgressResult = await this.adaptiveMissionEngine.updateMissionProgress(
          phone,
          adaptiveMissionResult.mission.id,
          currentStep.id,
          {
            content: message,
            quality: nlpAnalysis.quality,
            timeSpent: Math.floor(Math.random() * 300), // Would calculate actual time
            conversationState: conversationResult.state,
            sentiment: nlpAnalysis.sentiment,
            intent: nlpAnalysis.intent,
            entities: nlpAnalysis.entities
          }
        );
      }

      // Enhanced response generation
      let finalResponse = conversationResult.response;
      
      // Add session continuity bridge if resuming
      if (!sessionResult.isNewSession && sessionResult.recoveryData) {
        finalResponse = `${sessionResult.recoveryData.contextBridge}\n\n${finalResponse}`;
      }

      // Add adaptive recommendations
      if (missionProgressResult?.nextStepRecommendation) {
        finalResponse += `\n\n${missionProgressResult.nextStepRecommendation}`;
      }

      // Add conversational patterns adaptation
      if (stateUpdateResult.recommendations.length > 0) {
        const recommendation = stateUpdateResult.recommendations[0];
        if (recommendation.includes('shorter')) {
          finalResponse = this.simplifyResponse(finalResponse);
        }
      }

      // Risk assessment and escalation check
      const shouldEscalate = conversationResult.state.riskAssessment.urgencyLevel === 'critical' ||
                            conversationResult.state.riskAssessment.urgencyLevel === 'high';

      // Comprehensive logging
      logger.info('Advanced WhatsApp AI response generated', {
        phone: phone.substring(0, 5) + '***',
        persona,
        conversationDepth: conversationResult.nextNode.depth,
        nlpConfidence: nlpAnalysis.intent.confidence,
        riskLevel: conversationResult.state.riskAssessment.urgencyLevel,
        adaptationsApplied: adaptations.length,
        qualityScore: nlpAnalysis.quality.overallQuality,
        sentimentPolarity: nlpAnalysis.sentiment.polarity,
        shouldEscalate
      });

      return {
        message: finalResponse,
        shouldEscalate,
        urgency: conversationResult.state.riskAssessment.urgencyLevel,
        escalationReason: shouldEscalate ? 'High risk assessment detected' : undefined,
        missionCompleted: missionProgressResult?.progressSummary?.adaptationsCount > 0,
        reward: missionProgressResult?.pointsAwarded ? {
          healthPoints: missionProgressResult.pointsAwarded,
          unlockMessage: `Você ganhou ${missionProgressResult.pointsAwarded} pontos!`
        } : undefined,
        progressUpdate: missionProgressResult?.progressSummary,
        conversationInsights: {
          sentiment: nlpAnalysis.sentiment,
          intent: nlpAnalysis.intent,
          quality: nlpAnalysis.quality,
          patterns: stateUpdateResult.detectedPatterns
        },
        adaptations,
        qualityMetrics: nlpAnalysis.quality,
        nextStepRecommendation: missionProgressResult?.nextStepRecommendation,
        sessionContinuity
      };

    } catch (error) {
      logger.error('Error processing WhatsApp message with advanced AI', error);
      
      // Enhanced fallback response
      const fallbackMessage = await this.generateIntelligentFallback(messageData, error);
      
      return {
        message: fallbackMessage,
        shouldEscalate: false,
        conversationInsights: { error: 'Processing failed, using fallback' }
      };
    }
  }

  /**
   * Get user profile from phone number
   */
  private async getUserProfile(phoneNumber: string): Promise<any> {
    try {
      // TODO: Implement database lookup
      // For now, return basic profile structure
      return {
        userId: phoneNumber,
        phoneNumber,
        gender: 'M', // Default, should be determined from database or onboarding
        preferences: {
          preferredPersona: null // Let system auto-determine
        }
      };
    } catch (error) {
      logger.error(`Error getting user profile for ${phoneNumber}`, error);
      return {
        userId: phoneNumber,
        phoneNumber,
        gender: 'M',
        preferences: {}
      };
    }
  }

  /**
   * Determine which persona to use based on user profile
   */
  private determinePersona(userProfile: any): PersonaType {
    // Use user preference if available
    if (userProfile.preferences?.preferredPersona) {
      return userProfile.preferences.preferredPersona;
    }
    
    // Default based on gender
    return userProfile.gender === 'F' ? 'ana' : 'zeca';
  }

  /**
   * Check if a step is completed based on the user's message
   */
  private async isStepCompleted(message: string, step: any): Promise<boolean> {
    try {
      // Basic completion detection - this could be enhanced with AI
      const messageLength = message.trim().length;
      
      // Step is considered completed if user provides a meaningful response
      if (step.type === 'question' && messageLength > 10) {
        return true;
      }
      
      if (step.type === 'action' && (
        message.toLowerCase().includes('enviei') ||
        message.toLowerCase().includes('foto') ||
        message.toLowerCase().includes('documento')
      )) {
        return true;
      }
      
      if (step.type === 'information' && (
        message.toLowerCase().includes('entendi') ||
        message.toLowerCase().includes('ok') ||
        message.toLowerCase().includes('vamos') ||
        messageLength > 5
      )) {
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Error checking step completion', error);
      return false;
    }
  }

  /**
   * Generate celebration message for mission completion
   */
  private generateCelebrationMessage(reward: any, persona: PersonaType): string {
    const personaEmoji = persona === 'ana' ? '💕' : '💪';
    
    let message = `\n${personaEmoji} **${reward.unlockMessage}**\n\n`;
    message += `✅ +${reward.healthPoints} HealthPoints conquistados!\n`;
    
    if (reward.badge) {
      message += `🏆 Badge "${reward.badge}" desbloqueado!\n`;
    }
    
    if (reward.benefits && reward.benefits.length > 0) {
      message += `\n🎁 **Recompensas desbloqueadas:**\n`;
      reward.benefits.forEach((benefit: string) => {
        message += `- ${benefit}\n`;
      });
    }
    
    return message;
  }

  /**
   * Get emergency response based on classification
   */
  private getEmergencyResponse(persona: PersonaType, classification: any): string {
    const isAna = persona === 'ana';
    const greeting = isAna ? 'Querida' : 'Cara';
    const concern = isAna ? 'Estou preocupada' : 'Estou preocupado';
    
    return `🚨 **${greeting}, ${concern} com você!**

Esta situação pode necessitar atendimento médico imediato!

📞 **Procure ajuda AGORA:**
- SAMU: 192
- Emergência: 193
- Hospital mais próximo

${isAna ? '💕' : '💪'} **Posso te ajudar a:**
- Localizar o hospital mais próximo
- Entrar em contato com sua família
- Falar com nossa equipe médica

**NÃO ESPERE - BUSQUE ATENDIMENTO MÉDICO IMEDIATAMENTE!**

Vou notificar nossa equipe de saúde sobre sua situação.`;
  }

  /**
   * Process image message (for document OCR)
   */
  async processImageMessage(messageData: WhatsAppMessageData & { imageUrl: string }): Promise<WhatsAppResponse> {
    try {
      const { phone, imageUrl } = messageData;
      
      logger.info('Processing WhatsApp image message', {
        phone: phone.substring(0, 5) + '***',
        imageUrl: imageUrl.substring(0, 50) + '...'
      });

      // TODO: Implement OCR processing for medical documents
      // This would extract information from exams, prescriptions, etc.
      
      const persona = this.determinePersona(await this.getUserProfile(phone));
      const responseMessage = persona === 'ana' 
        ? '📸 Recebi sua imagem, querida! Estou analisando o documento. Em alguns instantes te dou um retorno!'
        : '📸 Imagem recebida! Estou processando o documento. Já volto com as informações!';

      return {
        message: responseMessage,
        shouldEscalate: false
      };

    } catch (error) {
      logger.error('Error processing WhatsApp image message', error);
      
      return {
        message: 'Recebi sua imagem, mas tive dificuldade para processar. Pode tentar enviar novamente?',
        shouldEscalate: false
      };
    }
  }

  /**
   * Handle escalation to human team
   */
  async handleEscalation(phone: string, reason: string, urgency: string): Promise<void> {
    try {
      logger.warn('Escalating to healthcare team', {
        phone: phone.substring(0, 5) + '***',
        reason,
        urgency
      });

      // TODO: Implement escalation system
      // - Send alert to healthcare team dashboard
      // - Create ticket in CRM system
      // - Send notifications via Slack/email
      // - Update user status in database
      
    } catch (error) {
      logger.error('Error handling escalation', error);
    }
  }

  /**
   * Get user mission progress
   */
  async getUserMissionProgress(phone: string): Promise<any> {
    try {
      return await this.missionService.getUserProgress(phone);
    } catch (error) {
      logger.error(`Error getting mission progress for ${phone}`, error);
      return null;
    }
  }

  /**
   * Reset user progress (for testing or restart)
   */
  async resetUserProgress(phone: string): Promise<void> {
    try {
      await this.missionService.resetUserProgress(phone);
      await this.openaiService.clearConversationContext(phone);
      
      logger.info(`User progress reset for ${phone.substring(0, 5)}***`);
    } catch (error) {
      logger.error(`Error resetting user progress for ${phone}`, error);
      throw error;
    }
  }
}