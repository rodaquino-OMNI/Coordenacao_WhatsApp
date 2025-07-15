/**
 * Conversation State Manager
 * Intelligent conversation state management with session recovery
 * Handles complex conversation history tracking and context preservation
 */

import { logger } from '../utils/logger';
import { RedisService } from './redisService';
import { ConversationState, ConversationTurn, ConversationContext, AdaptiveProfile } from './conversationFlowEngine';

export interface SessionRecoveryData {
  sessionId: string;
  userId: string;
  lastActiveNode: string;
  conversationSummary: string;
  contextSnapshot: ConversationContext;
  recoveryConfidence: number;
  timeGap: number; // minutes since last activity
  recoveryStrategies: RecoveryStrategy[];
}

export interface RecoveryStrategy {
  type: 'resume' | 'summarize' | 'restart' | 'clarify';
  confidence: number;
  message: string;
  conditions: string[];
}

export interface ConversationPattern {
  userId: string;
  patternType: 'engagement_decline' | 'topic_switch' | 'confusion_detected' | 'urgency_escalation';
  frequency: number;
  triggers: string[];
  adaptiveResponse: string;
  effectivenessScore: number;
}

export interface ContextualMemory {
  userId: string;
  shortTermMemory: MemoryItem[]; // Last 24 hours
  longTermMemory: MemoryItem[]; // Persistent across sessions
  semanticMemory: SemanticKnowledge[]; // Health concepts and relationships
  episodicMemory: EpisodicMemory[]; // Specific conversation episodes
}

export interface MemoryItem {
  id: string;
  type: 'health_fact' | 'personal_preference' | 'concern' | 'goal' | 'barrier';
  content: string;
  confidence: number;
  timestamp: Date;
  associatedNodes: string[];
  importance: number; // 0-10
  decay: number; // Memory decay factor
}

export interface SemanticKnowledge {
  concept: string;
  relationships: { concept: string; strength: number }[];
  userRelevance: number;
  lastAccessed: Date;
}

export interface EpisodicMemory {
  episodeId: string;
  summary: string;
  keyEvents: string[];
  emotions: string[];
  outcomes: string[];
  learnings: string[];
  timestamp: Date;
}

export interface ConversationContinuity {
  sessionId: string;
  userId: string;
  contextBridge: string; // Message to bridge sessions
  unfinishedTasks: UnfinishedTask[];
  pendingFollowUps: PendingFollowUp[];
  sessionGoals: SessionGoal[];
}

export interface UnfinishedTask {
  taskId: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedTime: number; // minutes
  dependencies: string[];
  lastProgress: string;
}

export interface PendingFollowUp {
  followUpId: string;
  originalContext: string;
  scheduledFor: Date;
  type: 'symptom_check' | 'medication_reminder' | 'appointment_follow_up' | 'goal_progress';
  urgency: number; // 0-10
}

export interface SessionGoal {
  goalId: string;
  description: string;
  progress: number; // 0-100%
  targetCompletion: Date;
  milestones: Milestone[];
}

export interface Milestone {
  milestoneId: string;
  description: string;
  completed: boolean;
  completedAt?: Date;
}

export class ConversationStateManager {
  private redis: RedisService;
  private contextualMemories: Map<string, ContextualMemory> = new Map();
  private conversationPatterns: Map<string, ConversationPattern[]> = new Map();
  private activeSessions: Map<string, ConversationContinuity> = new Map();

  constructor() {
    this.redis = new RedisService();
    this.initializeStateManager();
  }

  private async initializeStateManager(): Promise<void> {
    try {
      // Load existing patterns and memories from Redis
      await this.loadConversationPatterns();
      await this.loadContextualMemories();
      
      logger.info('Conversation State Manager initialized');
    } catch (error) {
      logger.error('Error initializing Conversation State Manager', error);
    }
  }

  /**
   * Create or resume conversation session with intelligent context recovery
   */
  async createOrResumeSession(
    userId: string, 
    sessionId?: string
  ): Promise<{
    sessionId: string;
    isNewSession: boolean;
    recoveryData?: SessionRecoveryData;
    continuity: ConversationContinuity;
  }> {
    try {
      const finalSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check for existing session
      const existingSession = await this.getSessionData(userId, finalSessionId);
      
      if (existingSession && this.shouldResumeSession(existingSession)) {
        // Resume existing session
        const recoveryData = await this.generateRecoveryData(existingSession);
        const continuity = await this.buildSessionContinuity(existingSession);
        
        logger.info(`Resuming conversation session for user ${userId}`, {
          sessionId: finalSessionId,
          timeGap: recoveryData.timeGap,
          confidence: recoveryData.recoveryConfidence
        });
        
        return {
          sessionId: finalSessionId,
          isNewSession: false,
          recoveryData,
          continuity
        };
      } else {
        // Create new session
        const continuity = await this.initializeNewSession(userId, finalSessionId);
        
        logger.info(`Created new conversation session for user ${userId}`, {
          sessionId: finalSessionId
        });
        
        return {
          sessionId: finalSessionId,
          isNewSession: true,
          continuity
        };
      }
    } catch (error) {
      logger.error(`Error creating/resuming session for user ${userId}`, error);
      throw error;
    }
  }

  /**
   * Update conversation state with pattern detection
   */
  async updateConversationState(
    state: ConversationState,
    turn: ConversationTurn
  ): Promise<{
    updatedState: ConversationState;
    detectedPatterns: ConversationPattern[];
    memoryUpdates: MemoryItem[];
    recommendations: string[];
  }> {
    try {
      // Detect conversation patterns
      const detectedPatterns = await this.detectConversationPatterns(state, turn);
      
      // Update contextual memory
      const memoryUpdates = await this.updateContextualMemory(state.userId, turn);
      
      // Generate recommendations based on patterns
      const recommendations = await this.generateRecommendations(state, detectedPatterns);
      
      // Update adaptive profile
      await this.updateAdaptiveProfile(state, turn, detectedPatterns);
      
      // Save state with enhanced context
      await this.saveEnhancedState(state);
      
      logger.info(`Conversation state updated for user ${state.userId}`, {
        patternsDetected: detectedPatterns.length,
        memoryUpdates: memoryUpdates.length,
        recommendations: recommendations.length
      });
      
      return {
        updatedState: state,
        detectedPatterns,
        memoryUpdates,
        recommendations
      };
    } catch (error) {
      logger.error(`Error updating conversation state for user ${state.userId}`, error);
      throw error;
    }
  }

  /**
   * Generate session recovery strategies
   */
  private async generateRecoveryData(sessionData: any): Promise<SessionRecoveryData> {
    const timeGap = Math.floor((Date.now() - new Date(sessionData.lastActivity).getTime()) / (1000 * 60));
    
    const strategies: RecoveryStrategy[] = [];
    
    // Time-based recovery strategies
    if (timeGap < 30) {
      strategies.push({
        type: 'resume',
        confidence: 0.9,
        message: 'Vamos continuar de onde paramos.',
        conditions: ['short_break']
      });
    } else if (timeGap < 1440) { // Less than 24 hours
      strategies.push({
        type: 'summarize',
        confidence: 0.7,
        message: 'Vou fazer um resumo rápido da nossa última conversa.',
        conditions: ['medium_break']
      });
    } else {
      strategies.push({
        type: 'clarify',
        confidence: 0.5,
        message: 'Faz um tempo que não conversamos. Gostaria de retomar onde paramos ou começar algo novo?',
        conditions: ['long_break']
      });
    }
    
    // Context-based recovery strategies
    if (sessionData.urgencyLevel === 'high' || sessionData.urgencyLevel === 'critical') {
      strategies.unshift({
        type: 'clarify',
        confidence: 0.95,
        message: 'Vi que nossa última conversa envolvia uma questão importante de saúde. Como você está se sentindo agora?',
        conditions: ['urgent_context']
      });
    }
    
    const recoveryConfidence = Math.max(...strategies.map(s => s.confidence));
    
    return {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      lastActiveNode: sessionData.currentNodeId,
      conversationSummary: await this.generateConversationSummary(sessionData),
      contextSnapshot: sessionData.context,
      recoveryConfidence,
      timeGap,
      recoveryStrategies: strategies.sort((a, b) => b.confidence - a.confidence)
    };
  }

  /**
   * Detect conversation patterns for adaptive improvements
   */
  private async detectConversationPatterns(
    state: ConversationState,
    turn: ConversationTurn
  ): Promise<ConversationPattern[]> {
    const patterns: ConversationPattern[] = [];
    const userId = state.userId;
    
    // Pattern 1: Engagement decline detection
    const recentTurns = state.conversationHistory.slice(-5);
    if (recentTurns.length >= 3) {
      const engagementTrend = this.calculateEngagementTrend(recentTurns);
      if (engagementTrend < -0.3) {
        patterns.push({
          userId,
          patternType: 'engagement_decline',
          frequency: 1,
          triggers: ['short_responses', 'delayed_replies'],
          adaptiveResponse: 'Notei que você pode estar cansado(a). Quer que eu seja mais direto(a) ou fazemos uma pausa?',
          effectivenessScore: 0.8
        });
      }
    }
    
    // Pattern 2: Topic switching detection
    const topicChanges = this.detectTopicChanges(state.conversationHistory);
    if (topicChanges > 2 && state.conversationHistory.length > 5) {
      patterns.push({
        userId,
        patternType: 'topic_switch',
        frequency: topicChanges,
        triggers: ['context_shift', 'new_concerns'],
        adaptiveResponse: 'Vejo que você tem várias preocupações. Vamos focar em uma por vez?',
        effectivenessScore: 0.7
      });
    }
    
    // Pattern 3: Confusion detection
    const confusionIndicators = ['não entendi', 'como assim', 'pode explicar', 'confuso'];
    if (confusionIndicators.some(indicator => turn.userMessage.toLowerCase().includes(indicator))) {
      patterns.push({
        userId,
        patternType: 'confusion_detected',
        frequency: 1,
        triggers: ['unclear_response', 'technical_language'],
        adaptiveResponse: 'Desculpe se não fui claro(a). Vou explicar de forma mais simples.',
        effectivenessScore: 0.9
      });
    }
    
    // Pattern 4: Urgency escalation
    const urgencyKeywords = ['urgente', 'emergência', 'imediato', 'socorro', 'grave'];
    if (urgencyKeywords.some(keyword => turn.userMessage.toLowerCase().includes(keyword))) {
      patterns.push({
        userId,
        patternType: 'urgency_escalation',
        frequency: 1,
        triggers: ['emergency_keywords', 'high_stress'],
        adaptiveResponse: 'Entendo que é urgente. Vou priorizar sua situação.',
        effectivenessScore: 1.0
      });
    }
    
    // Store patterns for learning
    await this.storeConversationPatterns(userId, patterns);
    
    return patterns;
  }

  /**
   * Update contextual memory with new information
   */
  private async updateContextualMemory(userId: string, turn: ConversationTurn): Promise<MemoryItem[]> {
    const memoryUpdates: MemoryItem[] = [];
    
    // Extract health facts from entities
    turn.entityExtractions.forEach(entity => {
      if (entity.type === 'symptom' || entity.type === 'condition' || entity.type === 'medication') {
        memoryUpdates.push({
          id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'health_fact',
          content: `User reported ${entity.type}: ${entity.value}`,
          confidence: entity.confidence,
          timestamp: new Date(),
          associatedNodes: [turn.nodeId],
          importance: entity.type === 'symptom' ? 8 : 6,
          decay: 0.95 // Slow decay for health facts
        });
      }
    });
    
    // Extract personal preferences from conversation
    const preferenceKeywords = {
      'gosto': 'preference',
      'prefiro': 'preference',
      'não gosto': 'aversion',
      'odeio': 'aversion'
    };
    
    Object.entries(preferenceKeywords).forEach(([keyword, type]) => {
      if (turn.userMessage.toLowerCase().includes(keyword)) {
        memoryUpdates.push({
          id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'personal_preference',
          content: `User expressed ${type} in: ${turn.userMessage}`,
          confidence: 0.7,
          timestamp: new Date(),
          associatedNodes: [turn.nodeId],
          importance: 5,
          decay: 0.9
        });
      }
    });
    
    // Extract concerns and goals
    const concernKeywords = ['preocupado', 'medo', 'ansioso', 'receio'];
    if (concernKeywords.some(keyword => turn.userMessage.toLowerCase().includes(keyword))) {
      memoryUpdates.push({
        id: `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'concern',
        content: `User expressed concern: ${turn.userMessage}`,
        confidence: 0.8,
        timestamp: new Date(),
        associatedNodes: [turn.nodeId],
        importance: 7,
        decay: 0.85
      });
    }
    
    // Store memory updates
    await this.storeMemoryUpdates(userId, memoryUpdates);
    
    return memoryUpdates;
  }

  /**
   * Generate adaptive recommendations based on patterns
   */
  private async generateRecommendations(
    state: ConversationState,
    patterns: ConversationPattern[]
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    patterns.forEach(pattern => {
      switch (pattern.patternType) {
        case 'engagement_decline':
          recommendations.push('Consider switching to shorter, more direct questions');
          recommendations.push('Offer the option to take a break or resume later');
          break;
          
        case 'topic_switch':
          recommendations.push('Acknowledge multiple concerns but suggest prioritizing');
          recommendations.push('Create a structured agenda for addressing all topics');
          break;
          
        case 'confusion_detected':
          recommendations.push('Simplify language and avoid technical terms');
          recommendations.push('Provide examples and analogies');
          break;
          
        case 'urgency_escalation':
          recommendations.push('Immediately assess if emergency intervention is needed');
          recommendations.push('Escalate to human support if appropriate');
          break;
      }
    });
    
    // User-specific recommendations based on adaptive profile
    const profile = state.adaptiveProfile;
    
    if (profile.communicationProfile.directnessPreference > 7) {
      recommendations.push('Maintain direct communication style');
    }
    
    if (profile.communicationProfile.empathyNeed > 7) {
      recommendations.push('Increase empathetic language and emotional support');
    }
    
    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Build session continuity for seamless conversation flow
   */
  private async buildSessionContinuity(sessionData: any): Promise<ConversationContinuity> {
    const unfinishedTasks = await this.identifyUnfinishedTasks(sessionData);
    const pendingFollowUps = await this.identifyPendingFollowUps(sessionData);
    const sessionGoals = await this.identifySessionGoals(sessionData);
    
    const contextBridge = await this.generateContextBridge(sessionData, unfinishedTasks);
    
    return {
      sessionId: sessionData.sessionId,
      userId: sessionData.userId,
      contextBridge,
      unfinishedTasks,
      pendingFollowUps,
      sessionGoals
    };
  }

  /**
   * Generate context bridge message for session continuity
   */
  private async generateContextBridge(sessionData: any, unfinishedTasks: UnfinishedTask[]): Promise<string> {
    const timeGap = Math.floor((Date.now() - new Date(sessionData.lastActivity).getTime()) / (1000 * 60));
    
    let bridge = '';
    
    if (timeGap < 30) {
      bridge = 'Vamos continuar nossa conversa.';
    } else if (timeGap < 1440) {
      bridge = 'Bem-vindo(a) de volta! ';
      if (unfinishedTasks.length > 0) {
        bridge += `Tínhamos falado sobre ${unfinishedTasks[0].description}.`;
      }
    } else {
      bridge = 'Oi! Faz um tempo que não conversamos. ';
      if (sessionData.urgencyLevel === 'high') {
        bridge += 'Como você está se sentindo em relação àquele assunto que discutimos?';
      } else {
        bridge += 'Gostaria de retomar nossa conversa ou há algo novo?';
      }
    }
    
    return bridge;
  }

  // Utility methods
  private shouldResumeSession(sessionData: any): boolean {
    const timeGap = Date.now() - new Date(sessionData.lastActivity).getTime();
    const maxGap = 7 * 24 * 60 * 60 * 1000; // 7 days
    
    return timeGap < maxGap && sessionData.conversationHistory.length > 0;
  }

  private calculateEngagementTrend(turns: ConversationTurn[]): number {
    if (turns.length < 2) return 0;
    
    const engagementScores = turns.map(turn => turn.adaptiveFactors.engagementLevel);
    const firstHalf = engagementScores.slice(0, Math.floor(engagementScores.length / 2));
    const secondHalf = engagementScores.slice(Math.floor(engagementScores.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, score) => sum + score, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, score) => sum + score, 0) / secondHalf.length;
    
    return (secondAvg - firstAvg) / Math.max(firstAvg, 1);
  }

  private detectTopicChanges(history: ConversationTurn[]): number {
    // Simplified topic change detection
    // In production, this would use more sophisticated NLP
    let changes = 0;
    
    for (let i = 1; i < history.length; i++) {
      const currentEntities = history[i].entityExtractions.map(e => e.type);
      const previousEntities = history[i - 1].entityExtractions.map(e => e.type);
      
      const overlap = currentEntities.filter(entity => previousEntities.includes(entity));
      if (overlap.length / Math.max(currentEntities.length, 1) < 0.3) {
        changes++;
      }
    }
    
    return changes;
  }

  private async generateConversationSummary(sessionData: any): Promise<string> {
    const history = sessionData.conversationHistory || [];
    const keyTopics = this.extractKeyTopics(history);
    const mainConcerns = this.extractMainConcerns(history);
    
    let summary = 'Resumo da conversa anterior: ';
    
    if (keyTopics.length > 0) {
      summary += `Discutimos sobre ${keyTopics.join(', ')}. `;
    }
    
    if (mainConcerns.length > 0) {
      summary += `Suas principais preocupações foram: ${mainConcerns.join(', ')}.`;
    }
    
    return summary;
  }

  private extractKeyTopics(history: ConversationTurn[]): string[] {
    const topicCounts: Record<string, number> = {};
    
    history.forEach(turn => {
      turn.entityExtractions.forEach(entity => {
        if (entity.type === 'symptom' || entity.type === 'condition') {
          topicCounts[entity.value] = (topicCounts[entity.value] || 0) + 1;
        }
      });
    });
    
    return Object.entries(topicCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([topic]) => topic);
  }

  private extractMainConcerns(history: ConversationTurn[]): string[] {
    const concerns: string[] = [];
    const concernKeywords = ['preocupado', 'medo', 'ansioso', 'receio'];
    
    history.forEach(turn => {
      concernKeywords.forEach(keyword => {
        if (turn.userMessage.toLowerCase().includes(keyword)) {
          // Extract the concern context
          const words = turn.userMessage.split(/\s+/);
          const keywordIndex = words.findIndex(word => word.toLowerCase().includes(keyword));
          if (keywordIndex !== -1 && keywordIndex < words.length - 1) {
            concerns.push(words.slice(keywordIndex, keywordIndex + 3).join(' '));
          }
        }
      });
    });
    
    return [...new Set(concerns)];
  }

  // Data persistence methods
  private async getSessionData(userId: string, sessionId: string): Promise<any> {
    try {
      const key = `conversation_state:${userId}:${sessionId}`;
      const data = await this.redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error(`Error getting session data for ${userId}:${sessionId}`, error);
      return null;
    }
  }

  private async saveEnhancedState(state: ConversationState): Promise<void> {
    try {
      const key = `conversation_state:${state.userId}:${state.sessionId}`;
      await this.redis.setex(key, 86400 * 7, JSON.stringify(state));
    } catch (error) {
      logger.error(`Error saving enhanced state for ${state.userId}`, error);
      throw error;
    }
  }

  private async initializeNewSession(userId: string, sessionId: string): Promise<ConversationContinuity> {
    const continuity: ConversationContinuity = {
      sessionId,
      userId,
      contextBridge: 'Olá! Como posso ajudar você hoje?',
      unfinishedTasks: [],
      pendingFollowUps: [],
      sessionGoals: []
    };
    
    this.activeSessions.set(userId, continuity);
    return continuity;
  }

  private async updateAdaptiveProfile(
    state: ConversationState,
    turn: ConversationTurn,
    patterns: ConversationPattern[]
  ): Promise<void> {
    // Update profile based on detected patterns
    patterns.forEach(pattern => {
      switch (pattern.patternType) {
        case 'engagement_decline':
          state.adaptiveProfile.communicationProfile.directnessPreference = 
            Math.min(10, state.adaptiveProfile.communicationProfile.directnessPreference + 0.5);
          break;
        case 'confusion_detected':
          state.adaptiveProfile.learningPreferences.detailLevel = 'low';
          break;
        case 'urgency_escalation':
          state.adaptiveProfile.communicationProfile.empathyNeed = 
            Math.min(10, state.adaptiveProfile.communicationProfile.empathyNeed + 1);
          break;
      }
    });
  }

  private async identifyUnfinishedTasks(sessionData: any): Promise<UnfinishedTask[]> {
    // Analyze conversation history to identify incomplete tasks
    // This is a simplified implementation
    return [];
  }

  private async identifyPendingFollowUps(sessionData: any): Promise<PendingFollowUp[]> {
    // Identify follow-ups based on conversation content
    // This is a simplified implementation
    return [];
  }

  private async identifySessionGoals(sessionData: any): Promise<SessionGoal[]> {
    // Extract session goals from conversation history
    // This is a simplified implementation
    return [];
  }

  private async loadConversationPatterns(): Promise<void> {
    try {
      const patternsData = await this.redis.get('conversation_patterns');
      if (patternsData) {
        const patterns = JSON.parse(patternsData);
        Object.entries(patterns).forEach(([userId, userPatterns]) => {
          this.conversationPatterns.set(userId, userPatterns as ConversationPattern[]);
        });
      }
    } catch (error) {
      logger.error('Error loading conversation patterns', error);
    }
  }

  private async loadContextualMemories(): Promise<void> {
    try {
      const memoriesData = await this.redis.get('contextual_memories');
      if (memoriesData) {
        const memories = JSON.parse(memoriesData);
        Object.entries(memories).forEach(([userId, userMemory]) => {
          this.contextualMemories.set(userId, userMemory as ContextualMemory);
        });
      }
    } catch (error) {
      logger.error('Error loading contextual memories', error);
    }
  }

  private async storeConversationPatterns(userId: string, patterns: ConversationPattern[]): Promise<void> {
    try {
      this.conversationPatterns.set(userId, patterns);
      const allPatterns = Object.fromEntries(this.conversationPatterns);
      await this.redis.setex('conversation_patterns', 86400 * 30, JSON.stringify(allPatterns));
    } catch (error) {
      logger.error(`Error storing conversation patterns for ${userId}`, error);
    }
  }

  private async storeMemoryUpdates(userId: string, memoryUpdates: MemoryItem[]): Promise<void> {
    try {
      let userMemory = this.contextualMemories.get(userId);
      if (!userMemory) {
        userMemory = {
          userId,
          shortTermMemory: [],
          longTermMemory: [],
          semanticMemory: [],
          episodicMemory: []
        };
      }
      
      // Add to short-term memory
      userMemory.shortTermMemory.push(...memoryUpdates);
      
      // Promote important memories to long-term
      memoryUpdates.forEach(item => {
        if (item.importance >= 7) {
          userMemory!.longTermMemory.push(item);
        }
      });
      
      this.contextualMemories.set(userId, userMemory);
      
      const allMemories = Object.fromEntries(this.contextualMemories);
      await this.redis.setex('contextual_memories', 86400 * 30, JSON.stringify(allMemories));
    } catch (error) {
      logger.error(`Error storing memory updates for ${userId}`, error);
    }
  }

  /**
   * Public interface methods
   */

  /**
   * Get user's conversation patterns
   */
  async getUserConversationPatterns(userId: string): Promise<ConversationPattern[]> {
    return this.conversationPatterns.get(userId) || [];
  }

  /**
   * Get user's contextual memory
   */
  async getUserContextualMemory(userId: string): Promise<ContextualMemory | null> {
    return this.contextualMemories.get(userId) || null;
  }

  /**
   * Reset user's conversation state and memory
   */
  async resetUserState(userId: string): Promise<void> {
    try {
      // Clear Redis data
      const keys = await this.redis.keys(`conversation_state:${userId}:*`);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
      
      // Clear local caches
      this.conversationPatterns.delete(userId);
      this.contextualMemories.delete(userId);
      this.activeSessions.delete(userId);
      
      logger.info(`User state reset for ${userId}`);
    } catch (error) {
      logger.error(`Error resetting user state for ${userId}`, error);
      throw error;
    }
  }

  /**
   * Get conversation state statistics
   */
  async getStateStatistics(): Promise<{
    activeUsers: number;
    totalPatterns: number;
    memoryUsage: number;
    averageSessionLength: number;
  }> {
    return {
      activeUsers: this.activeSessions.size,
      totalPatterns: Array.from(this.conversationPatterns.values()).reduce((sum, patterns) => sum + patterns.length, 0),
      memoryUsage: Array.from(this.contextualMemories.values()).reduce((sum, memory) => 
        sum + memory.shortTermMemory.length + memory.longTermMemory.length, 0),
      averageSessionLength: 0 // Would calculate from session data
    };
  }
}