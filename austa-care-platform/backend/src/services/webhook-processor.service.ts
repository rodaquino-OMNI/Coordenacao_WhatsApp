/**
 * Webhook Processor Service
 * Handles incoming Z-API webhook events and processes them accordingly
 */

import { logger } from '@/utils/logger';
import { whatsappService } from './whatsapp.service';
import {
  ZAPIWebhookPayload,
  WebhookEventType,
  WebhookEvent,
  MessageStatus,
} from '@/types/whatsapp';
import { EventEmitter } from 'events';

/**
 * Webhook Processor Service
 */
export class WebhookProcessorService extends EventEmitter {
  private messageHandlers: Map<string, (payload: ZAPIWebhookPayload) => Promise<void>> = new Map();
  private statusHandlers: Map<string, (payload: ZAPIWebhookPayload) => Promise<void>> = new Map();

  constructor() {
    super();
    this.setupDefaultHandlers();
  }

  /**
   * Setup default message and status handlers
   */
  private setupDefaultHandlers(): void {
    // Text message handler
    this.messageHandlers.set('text', this.handleTextMessage.bind(this));
    
    // Image message handler
    this.messageHandlers.set('image', this.handleImageMessage.bind(this));
    
    // Document message handler
    this.messageHandlers.set('document', this.handleDocumentMessage.bind(this));
    
    // Audio message handler
    this.messageHandlers.set('audio', this.handleAudioMessage.bind(this));
    
    // Video message handler
    this.messageHandlers.set('video', this.handleVideoMessage.bind(this));
    
    // Location message handler
    this.messageHandlers.set('location', this.handleLocationMessage.bind(this));
    
    // Contact message handler
    this.messageHandlers.set('contact', this.handleContactMessage.bind(this));
    
    // Button response handler
    this.messageHandlers.set('buttonsResponseMessage', this.handleButtonResponse.bind(this));
    
    // List response handler
    this.messageHandlers.set('listResponseMessage', this.handleListResponse.bind(this));

    // Status handlers
    this.statusHandlers.set('DeliveryCallback', this.handleDeliveryStatus.bind(this));
    this.statusHandlers.set('ReadCallback', this.handleReadStatus.bind(this));
  }

  /**
   * Process incoming webhook payload
   */
  async processWebhook(payload: ZAPIWebhookPayload): Promise<void> {
    try {
      logger.info('Processing webhook payload', {
        type: payload.type,
        instanceId: payload.instanceId,
        phone: payload.phone,
        fromMe: payload.fromMe,
        messageId: payload.messageId,
      });

      // Create webhook event
      const event: WebhookEvent = {
        type: this.mapToEventType(payload),
        instanceId: payload.instanceId,
        timestamp: payload.momment || Date.now(),
        data: payload,
      };

      // Emit the event for external listeners
      this.emit('webhook.received', event);

      // Process based on callback type
      if (payload.type === 'ReceivedCallback' && !payload.fromMe) {
        await this.processIncomingMessage(payload);
      } else if (payload.type === 'DeliveryCallback' || payload.type === 'ReadCallback') {
        await this.processStatusUpdate(payload);
      }

      // Emit processed event
      this.emit('webhook.processed', event);

      logger.debug('Webhook processed successfully', {
        type: payload.type,
        messageId: payload.messageId,
      });
    } catch (error) {
      logger.error('Webhook processing error', {
        error: (error as Error).message,
        payload: this.sanitizePayload(payload),
      });
      
      // Emit error event
      this.emit('webhook.error', {
        error: error as Error,
        payload,
      });
      
      throw error;
    }
  }

  /**
   * Process incoming messages
   */
  private async processIncomingMessage(payload: ZAPIWebhookPayload): Promise<void> {
    // Determine message type
    const messageType = this.getMessageType(payload);
    
    // Get appropriate handler
    const handler = this.messageHandlers.get(messageType);
    
    if (handler) {
      await handler(payload);
    } else {
      logger.warn('No handler found for message type', { messageType });
      await this.handleUnknownMessage(payload);
    }

    // Mark message as read (optional)
    if (payload.phone && payload.messageId) {
      try {
        await whatsappService.markAsRead(payload.phone, payload.messageId);
      } catch (error) {
        logger.warn('Failed to mark message as read', {
          phone: payload.phone,
          messageId: payload.messageId,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Process status updates
   */
  private async processStatusUpdate(payload: ZAPIWebhookPayload): Promise<void> {
    const handler = this.statusHandlers.get(payload.type);
    
    if (handler) {
      await handler(payload);
    } else {
      logger.warn('No handler found for status type', { type: payload.type });
    }
  }

  /**
   * Handle text messages
   */
  private async handleTextMessage(payload: ZAPIWebhookPayload): Promise<void> {
    const message = payload.text?.message;
    
    if (!message) {
      logger.warn('Text message without content', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received text message', {
      phone: payload.phone,
      senderName: payload.senderName,
      messageLength: message.length,
      messagePreview: message.substring(0, 100),
    });

    // Emit text message event
    this.emit('message.text', {
      phone: payload.phone,
      senderName: payload.senderName,
      message,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });

    // Auto-reply logic can go here
    await this.processAutoReply(payload, message);
  }

  /**
   * Handle image messages
   */
  private async handleImageMessage(payload: ZAPIWebhookPayload): Promise<void> {
    const image = payload.image;
    
    if (!image) {
      logger.warn('Image message without image data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received image message', {
      phone: payload.phone,
      senderName: payload.senderName,
      imageUrl: image.imageUrl,
      caption: image.caption,
      mimeType: image.mimeType,
    });

    // Emit image message event
    this.emit('message.image', {
      phone: payload.phone,
      senderName: payload.senderName,
      imageUrl: image.imageUrl,
      caption: image.caption,
      mimeType: image.mimeType,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle document messages
   */
  private async handleDocumentMessage(payload: ZAPIWebhookPayload): Promise<void> {
    const document = payload.document;
    
    if (!document) {
      logger.warn('Document message without document data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received document message', {
      phone: payload.phone,
      senderName: payload.senderName,
      fileName: document.fileName,
      documentUrl: document.documentUrl,
      mimeType: document.mimeType,
    });

    // Emit document message event
    this.emit('message.document', {
      phone: payload.phone,
      senderName: payload.senderName,
      fileName: document.fileName,
      documentUrl: document.documentUrl,
      mimeType: document.mimeType,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle audio messages
   */
  private async handleAudioMessage(payload: ZAPIWebhookPayload): Promise<void> {
    const audio = payload.audio;
    
    if (!audio) {
      logger.warn('Audio message without audio data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received audio message', {
      phone: payload.phone,
      senderName: payload.senderName,
      audioUrl: audio.audioUrl,
      mimeType: audio.mimeType,
    });

    // Emit audio message event
    this.emit('message.audio', {
      phone: payload.phone,
      senderName: payload.senderName,
      audioUrl: audio.audioUrl,
      mimeType: audio.mimeType,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle video messages
   */
  private async handleVideoMessage(payload: ZAPIWebhookPayload): Promise<void> {
    const video = payload.video;
    
    if (!video) {
      logger.warn('Video message without video data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received video message', {
      phone: payload.phone,
      senderName: payload.senderName,
      videoUrl: video.videoUrl,
      caption: video.caption,
      mimeType: video.mimeType,
    });

    // Emit video message event
    this.emit('message.video', {
      phone: payload.phone,
      senderName: payload.senderName,
      videoUrl: video.videoUrl,
      caption: video.caption,
      mimeType: video.mimeType,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle location messages
   */
  private async handleLocationMessage(payload: ZAPIWebhookPayload): Promise<void> {
    const location = payload.location;
    
    if (!location) {
      logger.warn('Location message without location data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received location message', {
      phone: payload.phone,
      senderName: payload.senderName,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
    });

    // Emit location message event
    this.emit('message.location', {
      phone: payload.phone,
      senderName: payload.senderName,
      latitude: location.latitude,
      longitude: location.longitude,
      address: location.address,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle contact messages
   */
  private async handleContactMessage(payload: ZAPIWebhookPayload): Promise<void> {
    const contact = payload.contact;
    
    if (!contact) {
      logger.warn('Contact message without contact data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received contact message', {
      phone: payload.phone,
      senderName: payload.senderName,
      contactName: contact.displayName,
    });

    // Emit contact message event
    this.emit('message.contact', {
      phone: payload.phone,
      senderName: payload.senderName,
      contactName: contact.displayName,
      vcard: contact.vcard,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle button responses
   */
  private async handleButtonResponse(payload: ZAPIWebhookPayload): Promise<void> {
    const buttonResponse = payload.buttonsResponseMessage;
    
    if (!buttonResponse) {
      logger.warn('Button response without data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received button response', {
      phone: payload.phone,
      senderName: payload.senderName,
      buttonId: buttonResponse.selectedButtonId,
      buttonText: buttonResponse.selectedButtonText,
    });

    // Emit button response event
    this.emit('message.button_response', {
      phone: payload.phone,
      senderName: payload.senderName,
      buttonId: buttonResponse.selectedButtonId,
      buttonText: buttonResponse.selectedButtonText,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle list responses
   */
  private async handleListResponse(payload: ZAPIWebhookPayload): Promise<void> {
    const listResponse = payload.listResponseMessage;
    
    if (!listResponse) {
      logger.warn('List response without data', { payload: this.sanitizePayload(payload) });
      return;
    }

    logger.info('Received list response', {
      phone: payload.phone,
      senderName: payload.senderName,
      selectedRowId: listResponse.singleSelectReply.selectedRowId,
      title: listResponse.singleSelectReply.title,
    });

    // Emit list response event
    this.emit('message.list_response', {
      phone: payload.phone,
      senderName: payload.senderName,
      selectedRowId: listResponse.singleSelectReply.selectedRowId,
      title: listResponse.singleSelectReply.title,
      description: listResponse.singleSelectReply.description,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle unknown message types
   */
  private async handleUnknownMessage(payload: ZAPIWebhookPayload): Promise<void> {
    logger.info('Received unknown message type', {
      phone: payload.phone,
      senderName: payload.senderName,
      payload: this.sanitizePayload(payload),
    });

    // Emit unknown message event
    this.emit('message.unknown', {
      phone: payload.phone,
      senderName: payload.senderName,
      payload,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });
  }

  /**
   * Handle delivery status updates
   */
  private async handleDeliveryStatus(payload: ZAPIWebhookPayload): Promise<void> {
    logger.info('Message delivered', {
      phone: payload.phone,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });

    const status: MessageStatus = {
      messageId: payload.messageId,
      phone: payload.phone,
      status: 'delivered',
      timestamp: payload.momment || Date.now(),
    };

    // Emit delivery status event
    this.emit('message.status.delivered', status);
  }

  /**
   * Handle read status updates
   */
  private async handleReadStatus(payload: ZAPIWebhookPayload): Promise<void> {
    logger.info('Message read', {
      phone: payload.phone,
      messageId: payload.messageId,
      timestamp: payload.momment,
    });

    const status: MessageStatus = {
      messageId: payload.messageId,
      phone: payload.phone,
      status: 'read',
      timestamp: payload.momment || Date.now(),
    };

    // Emit read status event
    this.emit('message.status.read', status);
  }

  /**
   * Process auto-reply logic
   */
  private async processAutoReply(payload: ZAPIWebhookPayload, message: string): Promise<void> {
    // Simple auto-reply logic - can be expanded
    const lowerMessage = message.toLowerCase().trim();
    
    // Welcome message for new conversations
    if (lowerMessage.includes('oi') || lowerMessage.includes('olá') || lowerMessage.includes('ola')) {
      try {
        await whatsappService.sendTextMessage({
          phone: payload.phone,
          message: `Olá ${payload.senderName}! 👋\n\nSou a assistente virtual da AUSTA Care. Como posso ajudá-lo hoje?\n\n🩺 Consultas\n📅 Agendamentos\n💊 Medicamentos\n🏥 Emergência\n\nEnvie uma das opções acima ou descreva sua necessidade.`,
        });
      } catch (error) {
        logger.error('Failed to send auto-reply', {
          phone: payload.phone,
          error: (error as Error).message,
        });
      }
    }
  }

  /**
   * Get message type from payload
   */
  private getMessageType(payload: ZAPIWebhookPayload): string {
    if (payload.text) return 'text';
    if (payload.image) return 'image';
    if (payload.document) return 'document';
    if (payload.audio) return 'audio';
    if (payload.video) return 'video';
    if (payload.location) return 'location';
    if (payload.contact) return 'contact';
    if (payload.buttonsResponseMessage) return 'buttonsResponseMessage';
    if (payload.listResponseMessage) return 'listResponseMessage';
    
    return 'unknown';
  }

  /**
   * Map payload type to event type
   */
  private mapToEventType(payload: ZAPIWebhookPayload): WebhookEventType {
    switch (payload.type) {
      case 'ReceivedCallback':
        return 'message.received';
      case 'DeliveryCallback':
        return 'message.delivered';
      case 'ReadCallback':
        return 'message.read';
      default:
        return 'message.received';
    }
  }

  /**
   * Sanitize payload for logging (remove sensitive data)
   */
  private sanitizePayload(payload: ZAPIWebhookPayload): Partial<ZAPIWebhookPayload> {
    const { senderPhoto, photo, ...sanitized } = payload;
    return sanitized;
  }

  /**
   * Register custom message handler
   */
  registerMessageHandler(messageType: string, handler: (payload: ZAPIWebhookPayload) => Promise<void>): void {
    this.messageHandlers.set(messageType, handler);
    logger.info('Registered custom message handler', { messageType });
  }

  /**
   * Register custom status handler
   */
  registerStatusHandler(statusType: string, handler: (payload: ZAPIWebhookPayload) => Promise<void>): void {
    this.statusHandlers.set(statusType, handler);
    logger.info('Registered custom status handler', { statusType });
  }

  /**
   * Remove message handler
   */
  removeMessageHandler(messageType: string): boolean {
    const removed = this.messageHandlers.delete(messageType);
    if (removed) {
      logger.info('Removed message handler', { messageType });
    }
    return removed;
  }

  /**
   * Remove status handler
   */
  removeStatusHandler(statusType: string): boolean {
    const removed = this.statusHandlers.delete(statusType);
    if (removed) {
      logger.info('Removed status handler', { statusType });
    }
    return removed;
  }

  /**
   * Get registered handlers info
   */
  getHandlersInfo(): { messageHandlers: string[]; statusHandlers: string[] } {
    return {
      messageHandlers: Array.from(this.messageHandlers.keys()),
      statusHandlers: Array.from(this.statusHandlers.keys()),
    };
  }
}

// Create singleton instance
export const webhookProcessor = new WebhookProcessorService();