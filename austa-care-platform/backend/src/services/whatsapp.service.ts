/**
 * Z-API WhatsApp Service
 * Comprehensive WhatsApp integration using Z-API
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import {
  ZAPIResponse,
  SendMessageResponse,
  SendTextMessageRequest,
  SendImageMessageRequest,
  SendDocumentMessageRequest,
  SendAudioMessageRequest,
  SendVideoMessageRequest,
  SendLocationMessageRequest,
  SendContactMessageRequest,
  SendButtonMessageRequest,
  SendListMessageRequest,
  SendTemplateMessageRequest,
  InstanceStatusResponse,
  QRCodeResponse,
  ZAPIError,
  RateLimitInfo,
  QueuedMessage,
  MessageQueueStats,
  ZAPIContact,
  ZAPIChat,
  InstanceInfo,
  MessageStatus
} from '@/types/whatsapp';

/**
 * WhatsApp Service class for Z-API integration
 */
export class WhatsAppService {
  private apiClient: AxiosInstance;
  private rateLimitInfo: RateLimitInfo | null = null;
  private messageQueue: Map<string, QueuedMessage> = new Map();
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.apiClient = this.createApiClient();
    this.setupInterceptors();
  }

  /**
   * Create configured axios client for Z-API
   */
  private createApiClient(): AxiosInstance {
    const client = axios.create({
      baseURL: `${config.zapi.baseUrl}/instances/${config.zapi.instanceId}/token/${config.zapi.token}`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    return client;
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for logging and rate limiting
    this.apiClient.interceptors.request.use(
      (config) => {
        logger.debug('Z-API Request', {
          method: config.method,
          url: config.url,
          data: config.data,
        });
        return config;
      },
      (error) => {
        logger.error('Z-API Request Error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for rate limiting and error handling
    this.apiClient.interceptors.response.use(
      (response: AxiosResponse<ZAPIResponse>) => {
        this.updateRateLimitInfo(response.headers);
        
        logger.debug('Z-API Response', {
          status: response.status,
          data: response.data,
        });

        // Handle Z-API error responses
        if (response.data.status === 'error') {
          throw new Error(response.data.error || response.data.message || 'Z-API Error');
        }

        return response;
      },
      async (error) => {
        logger.error('Z-API Response Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });

        // Handle rate limiting (429 Too Many Requests)
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          this.rateLimitInfo = {
            limit: config.zapi.rateLimit.requests,
            remaining: 0,
            reset: Date.now() + (retryAfter * 1000),
            retryAfter,
          };
          
          logger.warn('Rate limit exceeded, waiting for retry', { retryAfter });
          await this.delay(retryAfter * 1000);
          
          // Retry the request
          return this.apiClient.request(error.config);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Update rate limit information from response headers
   */
  private updateRateLimitInfo(headers: any): void {
    if (headers['x-ratelimit-limit']) {
      this.rateLimitInfo = {
        limit: parseInt(headers['x-ratelimit-limit']),
        remaining: parseInt(headers['x-ratelimit-remaining'] || '0'),
        reset: parseInt(headers['x-ratelimit-reset'] || '0'),
      };
    }
  }

  /**
   * Check if rate limit allows new requests
   */
  private canMakeRequest(): boolean {
    if (!this.rateLimitInfo) return true;
    
    if (this.rateLimitInfo.remaining <= 0) {
      const now = Date.now();
      if (now < this.rateLimitInfo.reset) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Wait for rate limit reset if needed
   */
  private async waitForRateLimit(): Promise<void> {
    if (!this.rateLimitInfo || this.canMakeRequest()) return;
    
    const waitTime = this.rateLimitInfo.reset - Date.now();
    if (waitTime > 0) {
      logger.info('Waiting for rate limit reset', { waitTime });
      await this.delay(waitTime);
    }
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Execute API request with retry mechanism
   */
  private async executeWithRetry<T>(
    operation: () => Promise<AxiosResponse<ZAPIResponse<T>>>,
    attempts: number = config.zapi.retry.attempts,
    delayMs: number = config.zapi.retry.delayMs
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        await this.waitForRateLimit();
        
        const response = await operation();
        return response.data.value;
      } catch (error) {
        lastError = error as Error;
        
        logger.warn(`API request attempt ${attempt} failed`, {
          error: lastError.message,
          attempt,
          maxAttempts: attempts,
        });

        // Don't retry on client errors (4xx except 429)
        if (error.response?.status >= 400 && error.response?.status < 500 && error.response?.status !== 429) {
          throw lastError;
        }

        if (attempt < attempts) {
          const exponentialDelay = delayMs * Math.pow(2, attempt - 1);
          await this.delay(exponentialDelay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Get instance status
   */
  async getInstanceStatus(): Promise<InstanceStatusResponse> {
    return this.executeWithRetry(() => 
      this.apiClient.get<ZAPIResponse<InstanceStatusResponse>>('/status')
    );
  }

  /**
   * Get QR Code for instance connection
   */
  async getQRCode(): Promise<QRCodeResponse> {
    return this.executeWithRetry(() => 
      this.apiClient.get<ZAPIResponse<QRCodeResponse>>('/qr-code')
    );
  }

  /**
   * Send text message
   */
  async sendTextMessage(request: SendTextMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-text', {
          phone: this.formatPhoneNumber(request.phone),
          message: request.message,
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Text message sent successfully', {
        messageId,
        phone: request.phone,
        messageLength: request.message.length,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send text message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send image message
   */
  async sendImageMessage(request: SendImageMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-image', {
          phone: this.formatPhoneNumber(request.phone),
          image: request.image,
          caption: request.caption || '',
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Image message sent successfully', {
        messageId,
        phone: request.phone,
        hasCaption: !!request.caption,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send image message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send document message
   */
  async sendDocumentMessage(request: SendDocumentMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-document', {
          phone: this.formatPhoneNumber(request.phone),
          document: request.document,
          fileName: request.fileName,
          caption: request.caption || '',
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Document message sent successfully', {
        messageId,
        phone: request.phone,
        fileName: request.fileName,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send document message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send audio message
   */
  async sendAudioMessage(request: SendAudioMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-audio', {
          phone: this.formatPhoneNumber(request.phone),
          audio: request.audio,
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Audio message sent successfully', {
        messageId,
        phone: request.phone,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send audio message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send video message
   */
  async sendVideoMessage(request: SendVideoMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-video', {
          phone: this.formatPhoneNumber(request.phone),
          video: request.video,
          caption: request.caption || '',
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Video message sent successfully', {
        messageId,
        phone: request.phone,
        hasCaption: !!request.caption,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send video message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send location message
   */
  async sendLocationMessage(request: SendLocationMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-location', {
          phone: this.formatPhoneNumber(request.phone),
          latitude: request.latitude,
          longitude: request.longitude,
          name: request.name || '',
          address: request.address || '',
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Location message sent successfully', {
        messageId,
        phone: request.phone,
        latitude: request.latitude,
        longitude: request.longitude,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send location message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send contact message
   */
  async sendContactMessage(request: SendContactMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-contact', {
          phone: this.formatPhoneNumber(request.phone),
          contactName: request.contactName,
          contactPhone: this.formatPhoneNumber(request.contactPhone),
          contactOrganization: request.contactOrganization || '',
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Contact message sent successfully', {
        messageId,
        phone: request.phone,
        contactName: request.contactName,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send contact message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send button message
   */
  async sendButtonMessage(request: SendButtonMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-button-list', {
          phone: this.formatPhoneNumber(request.phone),
          message: request.message,
          buttonText: request.buttonText,
          buttons: request.buttons,
          footer: request.footer || '',
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Button message sent successfully', {
        messageId,
        phone: request.phone,
        buttonCount: request.buttons.length,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send button message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send list message
   */
  async sendListMessage(request: SendListMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-option-list', {
          phone: this.formatPhoneNumber(request.phone),
          message: request.message,
          buttonText: request.buttonText,
          sections: request.sections,
          footer: request.footer || '',
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('List message sent successfully', {
        messageId,
        phone: request.phone,
        sectionCount: request.sections.length,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send list message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Send template message
   */
  async sendTemplateMessage(request: SendTemplateMessageRequest): Promise<SendMessageResponse> {
    const messageId = this.generateMessageId();
    
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<SendMessageResponse>>('/send-template', {
          phone: this.formatPhoneNumber(request.phone),
          templateName: request.templateName,
          language: request.language || 'pt_BR',
          variables: request.variables || [],
          delayMessage: request.delayMessage || 0,
        })
      );

      logger.info('Template message sent successfully', {
        messageId,
        phone: request.phone,
        templateName: request.templateName,
      });

      return response;
    } catch (error) {
      logger.error('Failed to send template message', {
        messageId,
        phone: request.phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get all contacts
   */
  async getContacts(): Promise<ZAPIContact[]> {
    try {
      return await this.executeWithRetry(() =>
        this.apiClient.get<ZAPIResponse<ZAPIContact[]>>('/contacts')
      );
    } catch (error) {
      logger.error('Failed to get contacts', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get all chats
   */
  async getChats(): Promise<ZAPIChat[]> {
    try {
      return await this.executeWithRetry(() =>
        this.apiClient.get<ZAPIResponse<ZAPIChat[]>>('/chats')
      );
    } catch (error) {
      logger.error('Failed to get chats', { error: (error as Error).message });
      throw error;
    }
  }

  /**
   * Get chat messages
   */
  async getChatMessages(phone: string, limit: number = 50): Promise<any[]> {
    try {
      return await this.executeWithRetry(() =>
        this.apiClient.get<ZAPIResponse<any[]>>(`/chat-messages/${this.formatPhoneNumber(phone)}`, {
          params: { limit }
        })
      );
    } catch (error) {
      logger.error('Failed to get chat messages', {
        phone,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(phone: string, messageId: string): Promise<boolean> {
    try {
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<{ success: boolean }>>('/read-message', {
          phone: this.formatPhoneNumber(phone),
          messageId,
        })
      );

      logger.info('Message marked as read', { phone, messageId });
      return response.success;
    } catch (error) {
      logger.error('Failed to mark message as read', {
        phone,
        messageId,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Set typing indicator
   */
  async setTyping(phone: string, typing: boolean = true): Promise<boolean> {
    try {
      const endpoint = typing ? '/start-typing' : '/stop-typing';
      const response = await this.executeWithRetry(() =>
        this.apiClient.post<ZAPIResponse<{ success: boolean }>>(endpoint, {
          phone: this.formatPhoneNumber(phone),
        })
      );

      logger.debug('Typing indicator set', { phone, typing });
      return response.success;
    } catch (error) {
      logger.error('Failed to set typing indicator', {
        phone,
        typing,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Format phone number for Z-API
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    const cleaned = phone.replace(/\D/g, '');
    
    // Add country code if not present (Brazil +55)
    if (!cleaned.startsWith('55') && cleaned.length === 11) {
      return `55${cleaned}`;
    }
    
    return cleaned;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): RateLimitInfo | null {
    return this.rateLimitInfo;
  }

  /**
   * Add message to queue for retry
   */
  addToQueue(message: Omit<QueuedMessage, 'id' | 'createdAt' | 'updatedAt'>): string {
    const id = this.generateMessageId();
    const queuedMessage: QueuedMessage = {
      ...message,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.messageQueue.set(id, queuedMessage);
    this.scheduleRetry(id);
    
    logger.info('Message added to queue', { id, type: message.type, phone: message.phone });
    return id;
  }

  /**
   * Process message queue
   */
  private scheduleRetry(messageId: string): void {
    const message = this.messageQueue.get(messageId);
    if (!message || message.status !== 'pending') return;

    const delay = message.nextRetry.getTime() - Date.now();
    
    const timeout = setTimeout(async () => {
      await this.processQueuedMessage(messageId);
    }, Math.max(delay, 0));

    this.retryTimeouts.set(messageId, timeout);
  }

  /**
   * Process a queued message
   */
  private async processQueuedMessage(messageId: string): Promise<void> {
    const message = this.messageQueue.get(messageId);
    if (!message) return;

    try {
      message.status = 'processing';
      message.updatedAt = new Date();

      // Process message based on type
      switch (message.type) {
        case 'text':
          await this.sendTextMessage(message.payload);
          break;
        case 'image':
          await this.sendImageMessage(message.payload);
          break;
        case 'document':
          await this.sendDocumentMessage(message.payload);
          break;
        default:
          throw new Error(`Unsupported message type: ${message.type}`);
      }

      message.status = 'sent';
      message.updatedAt = new Date();
      
      logger.info('Queued message processed successfully', { messageId, type: message.type });
    } catch (error) {
      message.attempts++;
      message.error = (error as Error).message;
      message.updatedAt = new Date();

      if (message.attempts >= message.maxAttempts) {
        message.status = 'failed';
        logger.error('Queued message failed permanently', {
          messageId,
          attempts: message.attempts,
          error: message.error,
        });
      } else {
        message.status = 'pending';
        message.nextRetry = new Date(Date.now() + (config.zapi.retry.delayMs * Math.pow(2, message.attempts)));
        this.scheduleRetry(messageId);
        
        logger.warn('Queued message failed, scheduling retry', {
          messageId,
          attempts: message.attempts,
          nextRetry: message.nextRetry,
        });
      }
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(): MessageQueueStats {
    const messages = Array.from(this.messageQueue.values());
    
    return {
      pending: messages.filter(m => m.status === 'pending').length,
      processing: messages.filter(m => m.status === 'processing').length,
      sent: messages.filter(m => m.status === 'sent').length,
      failed: messages.filter(m => m.status === 'failed').length,
      total: messages.length,
    };
  }

  /**
   * Clear completed messages from queue
   */
  clearCompletedMessages(): number {
    const completed = Array.from(this.messageQueue.entries())
      .filter(([, message]) => message.status === 'sent' || message.status === 'failed');
    
    completed.forEach(([id]) => {
      this.messageQueue.delete(id);
      const timeout = this.retryTimeouts.get(id);
      if (timeout) {
        clearTimeout(timeout);
        this.retryTimeouts.delete(id);
      }
    });

    logger.info('Cleared completed messages from queue', { count: completed.length });
    return completed.length;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    // Clear all timeouts
    this.retryTimeouts.forEach(timeout => clearTimeout(timeout));
    this.retryTimeouts.clear();
    this.messageQueue.clear();
    
    logger.info('WhatsApp service destroyed');
  }
}

// Create singleton instance
export const whatsappService = new WhatsAppService();