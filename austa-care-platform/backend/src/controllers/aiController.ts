import { Request, Response } from 'express';
import { OpenAIService } from '../services/openaiService';
import { HealthPromptService } from '../services/healthPromptService';
import { PersonaType, ConversationContext, AIResponse } from '../types/ai';
import { logger } from '../utils/logger';

export class AIController {
  private openaiService: OpenAIService;
  private healthPromptService: HealthPromptService;

  constructor() {
    this.openaiService = new OpenAIService();
    this.healthPromptService = new HealthPromptService();
  }

  /**
   * Generate AI response for chat
   */
  generateResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, message, persona, context } = req.body;

      // Validate required fields
      if (!userId || !message || !persona) {
        res.status(400).json({
          error: 'Missing required fields: userId, message, persona'
        });
        return;
      }

      // Validate persona
      if (!['zeca', 'ana'].includes(persona)) {
        res.status(400).json({
          error: 'Invalid persona. Must be "zeca" or "ana"'
        });
        return;
      }

      // Classify the health topic
      const classification = this.healthPromptService.classifyHealthTopic(message);
      
      // Find best template for the message
      const template = this.healthPromptService.findBestTemplate(message, persona as PersonaType);
      
      // Generate enhanced context if template found
      let enhancedContext = context;
      if (template) {
        enhancedContext = {
          ...context,
          suggestedTemplate: template,
          topicClassification: classification
        };
      }

      // Generate AI response
      const aiResponse = await this.openaiService.generateResponse(
        userId,
        message,
        persona as PersonaType,
        enhancedContext
      );

      // Log interaction for analytics
      logger.info('AI response generated', {
        userId,
        persona,
        messageLength: message.length,
        responseLength: aiResponse.content.length,
        tokenUsage: aiResponse.tokenUsage,
        cached: aiResponse.cached,
        classification: classification.category,
        urgencyLevel: classification.urgencyLevel
      });

      res.status(200).json({
        success: true,
        data: {
          response: aiResponse,
          classification,
          template: template ? {
            id: template.id,
            category: template.category,
            priority: template.priority
          } : null
        }
      });

    } catch (error) {
      logger.error('Error in generateResponse', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to generate AI response'
      });
    }
  };

  /**
   * Generate streaming AI response
   */
  generateStreamingResponse = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, message, persona, context } = req.body;

      // Validate required fields
      if (!userId || !message || !persona) {
        res.status(400).json({
          error: 'Missing required fields: userId, message, persona'
        });
        return;
      }

      // Set headers for Server-Sent Events
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial classification
      const classification = this.healthPromptService.classifyHealthTopic(message);
      res.write(`data: ${JSON.stringify({ type: 'classification', data: classification })}\n\n`);

      // Stream the response
      const aiResponse = await this.openaiService.generateStreamingResponse(
        userId,
        message,
        persona as PersonaType,
        context,
        (chunk: string) => {
          res.write(`data: ${JSON.stringify({ type: 'chunk', data: chunk })}\n\n`);
        }
      );

      // Send final response data
      res.write(`data: ${JSON.stringify({ type: 'complete', data: aiResponse })}\n\n`);
      res.end();

    } catch (error) {
      logger.error('Error in generateStreamingResponse', error);
      res.write(`data: ${JSON.stringify({ type: 'error', data: { message: 'Failed to generate response' } })}\n\n`);
      res.end();
    }
  };

  /**
   * Get conversation context
   */
  getConversationContext = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: 'Missing userId parameter'
        });
        return;
      }

      // This would typically fetch from database
      // For now, return basic structure
      const context: ConversationContext = {
        userId,
        sessionId: `session_${userId}_${Date.now()}`,
        lastInteraction: new Date(),
        previousMessages: [] // Would be fetched from database
      };

      res.status(200).json({
        success: true,
        data: context
      });

    } catch (error) {
      logger.error('Error in getConversationContext', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get conversation context'
      });
    }
  };

  /**
   * Clear conversation context
   */
  clearConversationContext = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          error: 'Missing userId parameter'
        });
        return;
      }

      await this.openaiService.clearConversationContext(userId);

      res.status(200).json({
        success: true,
        message: 'Conversation context cleared successfully'
      });

    } catch (error) {
      logger.error('Error in clearConversationContext', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to clear conversation context'
      });
    }
  };

  /**
   * Get token usage statistics
   */
  getTokenUsage = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { days = 7 } = req.query;

      if (!userId) {
        res.status(400).json({
          error: 'Missing userId parameter'
        });
        return;
      }

      const usage = await this.openaiService.getTokenUsage(userId, Number(days));

      res.status(200).json({
        success: true,
        data: {
          usage,
          summary: {
            totalDays: usage.length,
            totalTokens: usage.reduce((sum, day) => sum + day.totalTokens, 0),
            totalRequests: usage.reduce((sum, day) => sum + day.requestCount, 0),
            averageTokensPerRequest: usage.length > 0 
              ? usage.reduce((sum, day) => sum + day.totalTokens, 0) / usage.reduce((sum, day) => sum + day.requestCount, 0) 
              : 0
          }
        }
      });

    } catch (error) {
      logger.error('Error in getTokenUsage', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get token usage'
      });
    }
  };

  /**
   * Get persona information
   */
  getPersonaInfo = async (req: Request, res: Response): Promise<void> => {
    try {
      const { persona } = req.params;

      if (!persona || !['zeca', 'ana'].includes(persona)) {
        res.status(400).json({
          error: 'Invalid or missing persona. Must be "zeca" or "ana"'
        });
        return;
      }

      const personaInfo = this.openaiService.getPersonaInfo(persona as PersonaType);

      res.status(200).json({
        success: true,
        data: {
          ...personaInfo,
          // Don't expose the full system prompt for security
          systemPrompt: personaInfo.systemPrompt.substring(0, 200) + '...'
        }
      });

    } catch (error) {
      logger.error('Error in getPersonaInfo', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get persona information'
      });
    }
  };

  /**
   * Get health templates
   */
  getHealthTemplates = async (req: Request, res: Response): Promise<void> => {
    try {
      const { category, persona } = req.query;

      let templates;
      if (category) {
        templates = this.healthPromptService.getTemplatesByCategory(
          category as string,
          persona as PersonaType
        );
      } else {
        templates = this.healthPromptService.getAllTemplates();
      }

      const stats = this.healthPromptService.getTemplateStats();

      res.status(200).json({
        success: true,
        data: {
          templates,
          stats
        }
      });

    } catch (error) {
      logger.error('Error in getHealthTemplates', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to get health templates'
      });
    }
  };

  /**
   * Classify health topic
   */
  classifyHealthTopic = async (req: Request, res: Response): Promise<void> => {
    try {
      const { message } = req.body;

      if (!message) {
        res.status(400).json({
          error: 'Missing message field'
        });
        return;
      }

      const classification = this.healthPromptService.classifyHealthTopic(message);

      res.status(200).json({
        success: true,
        data: classification
      });

    } catch (error) {
      logger.error('Error in classifyHealthTopic', error);
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to classify health topic'
      });
    }
  };

  /**
   * Health check for AI services
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      // Test OpenAI connection with a simple request
      const testResponse = await this.openaiService.generateResponse(
        'health_check_user',
        'teste',
        'zeca'
      );

      const isHealthy = !!testResponse && !testResponse.fallback;

      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        data: {
          openai: isHealthy ? 'healthy' : 'unhealthy',
          templates: this.healthPromptService.getTemplateStats().total,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in AI health check', error);
      res.status(503).json({
        success: false,
        error: 'AI services unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  };
}