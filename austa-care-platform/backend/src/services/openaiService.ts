import OpenAI from 'openai';
import { config } from '../config/config';
import { logger } from '../utils/logger';
import { RedisService } from './redisService';
import { PersonaType, ConversationContext, AIResponse, TokenUsage, PersonaConfig } from '../types/ai';

export class OpenAIService {
  private client: OpenAI;
  private redis: RedisService;
  private tokenUsage: Map<string, TokenUsage> = new Map();

  // Persona configurations
  private personas: Record<PersonaType, PersonaConfig> = {
    zeca: {
      name: 'Zeca',
      gender: 'masculino',
      personality: 'amigável, encorajador e motivador',
      description: 'Assistente virtual masculino especializado em saúde masculina',
      systemPrompt: `Você é o Zeca, um assistente virtual de saúde especializado em cuidados masculinos. 

CARACTERÍSTICAS:
- Personalidade amigável, encorajadora e motivadora
- Fala de forma natural em português brasileiro
- Especialista em saúde masculina e bem-estar
- Usa linguagem acessível mas profissional
- Demonstra empatia e compreensão

RESPONSABILIDADES:
- Orientar homens sobre cuidados de saúde preventivos
- Auxiliar no agendamento de consultas e exames
- Fornecer informações sobre sintomas comuns
- Incentivar hábitos saudáveis e autocuidado
- Guiar usuários através das missões de onboarding
- Educar sobre saúde de forma natural na conversa

DIRETRIZES:
- Sempre use "você" em vez de tratamentos formais
- Seja direto mas empático
- Use exemplos práticos do dia a dia
- Encoraje a busca por ajuda profissional quando necessário
- Mantenha o foco na prevenção e bem-estar
- Responda sempre em português brasileiro
- Seja positivo e motivador

LIMITAÇÕES:
- Não dê diagnósticos médicos
- Não prescreva medicamentos
- Sempre recomende consulta médica para casos específicos
- Mantenha informações confidenciais`,
      fallbackResponses: [
        'Olá! Sou o Zeca, seu assistente de saúde. Como posso te ajudar hoje?',
        'Desculpe, tive um problema técnico. Mas estou aqui para te ajudar com suas questões de saúde!',
        'Opa, parece que houve uma falha no sistema. Vamos continuar nossa conversa sobre saúde?'
      ]
    },
    ana: {
      name: 'Ana',
      gender: 'feminino',
      personality: 'empática, cuidadosa e acolhedora',
      description: 'Assistente virtual feminina especializada em saúde feminina',
      systemPrompt: `Você é a Ana, uma assistente virtual de saúde especializada em cuidados femininos.

CARACTERÍSTICAS:
- Personalidade empática, cuidadosa e acolhedora
- Fala de forma natural em português brasileiro
- Especialista em saúde feminina e bem-estar
- Usa linguagem carinhosa mas profissional
- Demonstra compreensão e apoio emocional

RESPONSABILIDADES:
- Orientar mulheres sobre cuidados de saúde preventivos
- Auxiliar no agendamento de consultas e exames
- Fornecer informações sobre sintomas comuns
- Apoiar em questões de saúde íntima e reprodutiva
- Guiar usuárias através das missões de onboarding
- Educar sobre saúde de forma natural na conversa

DIRETRIZES:
- Sempre use "você" em vez de tratamentos formais
- Seja acolhedora e compreensiva
- Use linguagem carinhosa e empática
- Encoraje o autocuidado e a prevenção
- Seja sensível a questões íntimas
- Responda sempre em português brasileiro
- Ofereça apoio emocional quando apropriado

LIMITAÇÕES:
- Não dê diagnósticos médicos
- Não prescreva medicamentos
- Sempre recomende consulta médica para casos específicos
- Mantenha informações confidenciais
- Seja sensível a questões delicadas`,
      fallbackResponses: [
        'Oi querida! Sou a Ana, sua assistente de saúde. Como posso te ajudar hoje?',
        'Desculpe, tive um probleminha técnico. Mas estou aqui para te acompanhar em seus cuidados de saúde!',
        'Ops, parece que houve uma falha no sistema. Vamos continuar nossa conversa sobre seu bem-estar?'
      ]
    }
  };

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openai.apiKey,
    });
    this.redis = new RedisService();
    this.initializeTokenTracking();
  }

  /**
   * Initialize token usage tracking
   */
  private initializeTokenTracking(): void {
    setInterval(() => {
      this.saveTokenUsage();
    }, 300000); // Save every 5 minutes
  }

  /**
   * Generate AI response with persona
   */
  async generateResponse(
    userId: string,
    message: string,
    persona: PersonaType,
    context?: ConversationContext
  ): Promise<AIResponse> {
    try {
      const personaConfig = this.personas[persona];
      const conversationContext = context || await this.getConversationContext(userId);
      
      // Check cache first
      const cacheKey = this.generateCacheKey(message, persona, conversationContext);
      const cachedResponse = await this.getCachedResponse(cacheKey);
      
      if (cachedResponse) {
        logger.info(`Cache hit for user ${userId}`, { persona, cacheKey });
        return cachedResponse;
      }

      // Content moderation check
      const moderationResult = await this.moderateContent(message);
      if (moderationResult.flagged) {
        logger.warn(`Content flagged for user ${userId}`, { 
          message: message.substring(0, 100),
          categories: moderationResult.categories 
        });
        return this.getFallbackResponse(persona, 'moderation');
      }

      // Prepare messages for OpenAI
      const messages = this.buildMessages(personaConfig, conversationContext, message);

      // Generate response
      const startTime = Date.now();
      const completion = await this.client.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        user: userId,
      });

      const response = completion.choices[0]?.message?.content;
      if (!response) {
        throw new Error('No response generated from OpenAI');
      }

      // Track token usage
      const tokenUsage = completion.usage;
      if (tokenUsage) {
        await this.trackTokenUsage(userId, tokenUsage, Date.now() - startTime);
      }

      // Update conversation context
      await this.updateConversationContext(userId, message, response, persona);

      // Cache the response
      const aiResponse: AIResponse = {
        content: response,
        persona,
        timestamp: new Date(),
        tokenUsage: tokenUsage || undefined,
        cached: false,
        responseTime: Date.now() - startTime
      };

      await this.cacheResponse(cacheKey, aiResponse);

      logger.info(`AI response generated for user ${userId}`, {
        persona,
        tokenUsage,
        responseTime: aiResponse.responseTime
      });

      return aiResponse;

    } catch (error) {
      logger.error(`Error generating AI response for user ${userId}`, error);
      return this.getFallbackResponse(persona, 'error');
    }
  }

  /**
   * Generate streaming response
   */
  async generateStreamingResponse(
    userId: string,
    message: string,
    persona: PersonaType,
    context?: ConversationContext,
    onChunk?: (chunk: string) => void
  ): Promise<AIResponse> {
    try {
      const personaConfig = this.personas[persona];
      const conversationContext = context || await this.getConversationContext(userId);
      
      // Content moderation check
      const moderationResult = await this.moderateContent(message);
      if (moderationResult.flagged) {
        return this.getFallbackResponse(persona, 'moderation');
      }

      // Prepare messages
      const messages = this.buildMessages(personaConfig, conversationContext, message);

      const startTime = Date.now();
      const stream = await this.client.chat.completions.create({
        model: config.openai.model,
        messages,
        max_tokens: config.openai.maxTokens,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1,
        user: userId,
        stream: true,
      });

      let fullResponse = '';
      let tokenCount = 0;

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          tokenCount++;
          
          if (onChunk) {
            onChunk(content);
          }
        }
      }

      // Update conversation context
      await this.updateConversationContext(userId, message, fullResponse, persona);

      const aiResponse: AIResponse = {
        content: fullResponse,
        persona,
        timestamp: new Date(),
        tokenUsage: { 
          prompt_tokens: 0, 
          completion_tokens: tokenCount, 
          total_tokens: tokenCount 
        },
        cached: false,
        responseTime: Date.now() - startTime,
        streamed: true
      };

      logger.info(`Streaming AI response generated for user ${userId}`, {
        persona,
        responseTime: aiResponse.responseTime,
        tokenCount
      });

      return aiResponse;

    } catch (error) {
      logger.error(`Error generating streaming AI response for user ${userId}`, error);
      return this.getFallbackResponse(persona, 'error');
    }
  }

  /**
   * Build messages array for OpenAI API
   */
  private buildMessages(
    personaConfig: PersonaConfig,
    context: ConversationContext,
    currentMessage: string
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: personaConfig.systemPrompt
      }
    ];

    // Add context from previous conversations
    if (context.previousMessages && context.previousMessages.length > 0) {
      context.previousMessages.slice(-10).forEach(msg => { // Last 10 messages for context
        messages.push({
          role: msg.role === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });
    }

    // Add current user mission context if available
    if (context.currentMission) {
      const missionContext = `Contexto da missão atual: O usuário está na missão "${context.currentMission.title}" - ${context.currentMission.description}.`;
      
      if (context.currentStep) {
        messages.push({
          role: 'system',
          content: `${missionContext} Passo atual: "${context.currentStep.title}" - ${context.currentStep.description}. Conduza a conversa para completar este passo específico de forma natural e envolvente, seguindo o estilo do questionário gamificado da AUSTA.`
        });
      } else {
        messages.push({
          role: 'system',
          content: `${missionContext} Ajude-o a completar esta missão de forma natural na conversa.`
        });
      }
    }

    // Add user profile context
    if (context.userProfile) {
      const profileContext = `Perfil do usuário: ${context.userProfile.gender === 'M' ? 'Homem' : 'Mulher'}, ${context.userProfile.age} anos.`;
      if (context.userProfile.healthConditions && context.userProfile.healthConditions.length > 0) {
        const conditions = context.userProfile.healthConditions.join(', ');
        messages.push({
          role: 'system',
          content: `${profileContext} Condições de saúde: ${conditions}. Seja sensível a essas condições.`
        });
      } else {
        messages.push({
          role: 'system',
          content: profileContext
        });
      }
    }

    // Add current message
    messages.push({
      role: 'user',
      content: currentMessage
    });

    return messages;
  }

  /**
   * Content moderation
   */
  private async moderateContent(content: string): Promise<{ flagged: boolean; categories: string[] }> {
    try {
      const moderation = await this.client.moderations.create({
        input: content,
      });

      const result = moderation.results[0];
      const flaggedCategories = Object.entries(result.categories)
        .filter(([_, flagged]) => flagged)
        .map(([category]) => category);

      return {
        flagged: result.flagged,
        categories: flaggedCategories
      };
    } catch (error) {
      logger.error('Error in content moderation', error);
      return { flagged: false, categories: [] };
    }
  }

  /**
   * Get conversation context from Redis
   */
  private async getConversationContext(userId: string): Promise<ConversationContext> {
    try {
      const contextKey = `conversation:${userId}`;
      const context = await this.redis.get(contextKey);
      
      if (context) {
        return JSON.parse(context);
      }

      return {
        userId,
        previousMessages: [],
        lastInteraction: new Date(),
        sessionId: `session_${userId}_${Date.now()}`
      };
    } catch (error) {
      logger.error(`Error getting conversation context for user ${userId}`, error);
      return {
        userId,
        previousMessages: [],
        lastInteraction: new Date(),
        sessionId: `session_${userId}_${Date.now()}`
      };
    }
  }

  /**
   * Update conversation context
   */
  private async updateConversationContext(
    userId: string,
    userMessage: string,
    aiResponse: string,
    persona: PersonaType
  ): Promise<void> {
    try {
      const context = await this.getConversationContext(userId);
      
      // Add messages to context
      context.previousMessages = context.previousMessages || [];
      context.previousMessages.push(
        { role: 'user', content: userMessage, timestamp: new Date() },
        { role: 'assistant', content: aiResponse, timestamp: new Date(), persona }
      );

      // Keep only last 20 messages to control memory usage
      if (context.previousMessages.length > 20) {
        context.previousMessages = context.previousMessages.slice(-20);
      }

      context.lastInteraction = new Date();

      const contextKey = `conversation:${userId}`;
      await this.redis.setex(contextKey, 86400, JSON.stringify(context)); // 24h expiry

    } catch (error) {
      logger.error(`Error updating conversation context for user ${userId}`, error);
    }
  }

  /**
   * Generate cache key for responses
   */
  private generateCacheKey(message: string, persona: PersonaType, context: ConversationContext): string {
    const messageHash = Buffer.from(message.toLowerCase().trim()).toString('base64');
    const contextHash = context.currentMission?.id || 'no_mission';
    return `ai_response:${persona}:${contextHash}:${messageHash}`;
  }

  /**
   * Get cached response
   */
  private async getCachedResponse(cacheKey: string): Promise<AIResponse | null> {
    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        const response = JSON.parse(cached);
        response.cached = true;
        response.timestamp = new Date(response.timestamp);
        return response;
      }
      return null;
    } catch (error) {
      logger.error('Error getting cached response', error);
      return null;
    }
  }

  /**
   * Cache response
   */
  private async cacheResponse(cacheKey: string, response: AIResponse): Promise<void> {
    try {
      // Cache for 1 hour for common responses
      await this.redis.setex(cacheKey, 3600, JSON.stringify(response));
    } catch (error) {
      logger.error('Error caching response', error);
    }
  }

  /**
   * Get fallback response
   */
  private getFallbackResponse(persona: PersonaType, reason: 'error' | 'moderation'): AIResponse {
    const personaConfig = this.personas[persona];
    const fallbackMessages = personaConfig.fallbackResponses;
    
    let content: string;
    if (reason === 'moderation') {
      content = persona === 'ana' 
        ? 'Desculpe, não posso responder a essa mensagem. Vamos focar em conversar sobre saúde e bem-estar?'
        : 'Desculpe, não posso responder a essa mensagem. Que tal conversarmos sobre saúde e cuidados preventivos?';
    } else {
      content = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];
    }

    return {
      content,
      persona,
      timestamp: new Date(),
      cached: false,
      fallback: true,
      responseTime: 0
    };
  }

  /**
   * Track token usage
   */
  private async trackTokenUsage(
    userId: string,
    usage: OpenAI.Completions.CompletionUsage,
    responseTime: number
  ): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      const usageKey = `token_usage:${userId}:${today}`;
      
      const existingUsage = await this.redis.get(usageKey);
      let tokenData: TokenUsage;
      
      if (existingUsage) {
        tokenData = JSON.parse(existingUsage);
        tokenData.totalTokens += usage.total_tokens;
        tokenData.promptTokens += usage.prompt_tokens;
        tokenData.completionTokens += usage.completion_tokens;
        tokenData.requestCount += 1;
        tokenData.totalResponseTime += responseTime;
      } else {
        tokenData = {
          userId,
          date: today,
          totalTokens: usage.total_tokens,
          promptTokens: usage.prompt_tokens,
          completionTokens: usage.completion_tokens,
          requestCount: 1,
          totalResponseTime: responseTime
        };
      }

      await this.redis.setex(usageKey, 86400 * 7, JSON.stringify(tokenData)); // 7 days expiry

      // Store in memory for quick access
      this.tokenUsage.set(userId, tokenData);

    } catch (error) {
      logger.error(`Error tracking token usage for user ${userId}`, error);
    }
  }

  /**
   * Save token usage to persistent storage
   */
  private async saveTokenUsage(): Promise<void> {
    try {
      // This could be implemented to save to database
      logger.info('Token usage data saved', { activeUsers: this.tokenUsage.size });
    } catch (error) {
      logger.error('Error saving token usage', error);
    }
  }

  /**
   * Get token usage stats for a user
   */
  async getTokenUsage(userId: string, days: number = 7): Promise<TokenUsage[]> {
    try {
      const usage: TokenUsage[] = [];
      const today = new Date();
      
      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const usageKey = `token_usage:${userId}:${dateStr}`;
        const dayUsage = await this.redis.get(usageKey);
        
        if (dayUsage) {
          usage.push(JSON.parse(dayUsage));
        }
      }
      
      return usage;
    } catch (error) {
      logger.error(`Error getting token usage for user ${userId}`, error);
      return [];
    }
  }

  /**
   * Clear conversation context
   */
  async clearConversationContext(userId: string): Promise<void> {
    try {
      const contextKey = `conversation:${userId}`;
      await this.redis.del(contextKey);
      logger.info(`Conversation context cleared for user ${userId}`);
    } catch (error) {
      logger.error(`Error clearing conversation context for user ${userId}`, error);
    }
  }

  /**
   * Get persona information
   */
  getPersonaInfo(persona: PersonaType): PersonaConfig {
    return this.personas[persona];
  }

  /**
   * Update persona configuration (for A/B testing or improvements)
   */
  updatePersonaConfig(persona: PersonaType, updates: Partial<PersonaConfig>): void {
    this.personas[persona] = { ...this.personas[persona], ...updates };
    logger.info(`Persona ${persona} configuration updated`);
  }
}