import { Router, Request, Response } from 'express';
import { logger } from '@/utils/logger';
import { whatsappService } from '@/services/whatsapp.service';
import { webhookProcessor } from '@/services/webhook-processor.service';
import {
  validateWebhookSignature,
  validateVerifyToken,
  sanitizeWebhookPayload,
  validateRequestIP,
  webhookRateLimiter,
} from '@/utils/webhook';
import {
  ZAPIWebhookPayload,
  SendTextMessageRequest,
  SendImageMessageRequest,
  SendDocumentMessageRequest,
  SendTemplateMessageRequest,
} from '@/types/whatsapp';

const router = Router();

// Setup webhook event listeners for custom business logic
webhookProcessor.on('message.text', async (data) => {
  logger.info('Text message event received', {
    phone: data.phone.substring(0, 5) + '***',
    senderName: data.senderName,
    messageLength: data.message.length,
  });
  
  // Add custom business logic here
  // e.g., AI analysis, database storage, etc.
});

webhookProcessor.on('message.image', async (data) => {
  logger.info('Image message event received', {
    phone: data.phone.substring(0, 5) + '***',
    senderName: data.senderName,
    mimeType: data.mimeType,
  });
  
  // Add custom business logic here
  // e.g., image analysis, OCR, storage, etc.
});

webhookProcessor.on('message.status.delivered', async (status) => {
  logger.info('Message delivery confirmed', {
    messageId: status.messageId,
    phone: status.phone.substring(0, 5) + '***',
  });
  
  // Add custom business logic here
  // e.g., update database, send notifications, etc.
});

webhookProcessor.on('webhook.error', async ({ error, payload }) => {
  logger.error('Webhook processing error event', {
    error: error.message,
    type: payload.type,
    instanceId: payload.instanceId,
  });
  
  // Add custom error handling here
  // e.g., alert administrators, retry logic, etc.
});

// WhatsApp webhook verification (Z-API)
router.get('/webhook', (req: Request, res: Response) => {
  try {
    const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
    
    logger.info('Z-API webhook verification', { mode, token: token ? '[REDACTED]' : undefined });
    
    // Validate IP address
    const requestIP = req.ip || req.connection.remoteAddress || 'unknown';
    if (!validateRequestIP(requestIP)) {
      logger.warn('Webhook verification from unauthorized IP', { requestIP });
      return res.status(403).json({
        success: false,
        message: 'Unauthorized IP address'
      });
    }
    
    // Validate mode and token
    if (mode === 'subscribe' && typeof token === 'string') {
      if (validateVerifyToken(token)) {
        logger.info('Webhook verification successful', { mode });
        res.status(200).send(challenge);
      } else {
        logger.warn('Invalid verify token', { mode });
        res.status(403).json({
          success: false,
          message: 'Invalid verify token'
        });
      }
    } else {
      logger.warn('Invalid webhook verification request', { mode, hasToken: !!token });
      res.status(400).json({
        success: false,
        message: 'Invalid verification request'
      });
    }
  } catch (error) {
    logger.error('Z-API webhook verification error', { error });
    res.status(500).json({
      success: false,
      message: 'Webhook verification failed'
    });
  }
});

// Z-API webhook for receiving messages and status updates
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const requestIP = req.ip || req.connection.remoteAddress || 'unknown';
    const signatureHeader = req.headers['x-hub-signature-256'] || req.headers['x-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const payload = req.body as ZAPIWebhookPayload;
    
    // Rate limiting
    if (!webhookRateLimiter.isAllowed(requestIP)) {
      logger.warn('Webhook rate limit exceeded', { requestIP });
      return res.status(429).json({
        success: false,
        message: 'Rate limit exceeded',
        retryAfter: 60
      });
    }
    
    // Validate IP address
    if (!validateRequestIP(requestIP)) {
      logger.warn('Webhook from unauthorized IP', { requestIP });
      return res.status(403).json({
        success: false,
        message: 'Unauthorized IP address'
      });
    }
    
    // Validate webhook signature (if provided)
    if (signature) {
      const rawBody = JSON.stringify(req.body);
      if (!validateWebhookSignature(rawBody, signature)) {
        logger.warn('Invalid webhook signature', { requestIP });
        return res.status(401).json({
          success: false,
          message: 'Invalid signature'
        });
      }
    }
    
    // Validate payload structure
    if (!payload || !payload.instanceId || !payload.phone) {
      logger.warn('Invalid webhook payload structure', {
        hasPayload: !!payload,
        hasInstanceId: !!(payload?.instanceId),
        hasPhone: !!(payload?.phone),
      });
      return res.status(400).json({
        success: false,
        message: 'Invalid payload structure'
      });
    }
    
    logger.info('Z-API webhook received', {
      type: payload.type,
      instanceId: payload.instanceId,
      phone: payload.phone,
      fromMe: payload.fromMe,
      messageId: payload.messageId,
    });
    
    // Process webhook asynchronously
    setImmediate(async () => {
      try {
        await webhookProcessor.processWebhook(payload);
      } catch (error) {
        logger.error('Async webhook processing failed', {
          error: (error as Error).message,
          payload: sanitizeWebhookPayload(payload),
        });
      }
    });
    
    // Respond immediately to Z-API
    res.status(200).json({
      success: true,
      message: 'Webhook received and queued for processing'
    });
  } catch (error) {
    logger.error('Z-API webhook processing error', { error });
    res.status(500).json({
      success: false,
      message: 'Webhook processing failed'
    });
  }
});

// Send text message via Z-API
router.post('/send-text', async (req: Request, res: Response) => {
  try {
    const { phone, message, delayMessage } = req.body as SendTextMessageRequest;
    
    // Validate required fields
    if (!phone || !message) {
      return res.status(400).json({
        success: false,
        message: 'Phone and message are required'
      });
    }
    
    logger.info('Sending text message', { phone: phone.substring(0, 5) + '***', messageLength: message.length });
    
    const result = await whatsappService.sendTextMessage({
      phone,
      message,
      delayMessage,
    });
    
    res.status(200).json({
      success: true,
      message: 'Text message sent successfully',
      data: result
    });
  } catch (error) {
    logger.error('Text message sending error', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send text message',
      error: (error as Error).message
    });
  }
});

// Send image message via Z-API
router.post('/send-image', async (req: Request, res: Response) => {
  try {
    const { phone, image, caption, delayMessage } = req.body as SendImageMessageRequest;
    
    // Validate required fields
    if (!phone || !image) {
      return res.status(400).json({
        success: false,
        message: 'Phone and image are required'
      });
    }
    
    logger.info('Sending image message', { phone: phone.substring(0, 5) + '***', hasCaption: !!caption });
    
    const result = await whatsappService.sendImageMessage({
      phone,
      image,
      caption,
      delayMessage,
    });
    
    res.status(200).json({
      success: true,
      message: 'Image message sent successfully',
      data: result
    });
  } catch (error) {
    logger.error('Image message sending error', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send image message',
      error: (error as Error).message
    });
  }
});

// Send document message via Z-API
router.post('/send-document', async (req: Request, res: Response) => {
  try {
    const { phone, document, fileName, caption, delayMessage } = req.body as SendDocumentMessageRequest;
    
    // Validate required fields
    if (!phone || !document || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'Phone, document, and fileName are required'
      });
    }
    
    logger.info('Sending document message', { phone: phone.substring(0, 5) + '***', fileName });
    
    const result = await whatsappService.sendDocumentMessage({
      phone,
      document,
      fileName,
      caption,
      delayMessage,
    });
    
    res.status(200).json({
      success: true,
      message: 'Document message sent successfully',
      data: result
    });
  } catch (error) {
    logger.error('Document message sending error', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send document message',
      error: (error as Error).message
    });
  }
});

// Send template message via Z-API
router.post('/send-template', async (req: Request, res: Response) => {
  try {
    const { phone, templateName, language, variables, delayMessage } = req.body as SendTemplateMessageRequest;
    
    // Validate required fields
    if (!phone || !templateName) {
      return res.status(400).json({
        success: false,
        message: 'Phone and templateName are required'
      });
    }
    
    logger.info('Sending template message', { phone: phone.substring(0, 5) + '***', templateName, language });
    
    const result = await whatsappService.sendTemplateMessage({
      phone,
      templateName,
      language,
      variables,
      delayMessage,
    });
    
    res.status(200).json({
      success: true,
      message: 'Template message sent successfully',
      data: result
    });
  } catch (error) {
    logger.error('Template message sending error', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to send template message',
      error: (error as Error).message
    });
  }
});

// Get instance status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = await whatsappService.getInstanceStatus();
    
    res.status(200).json({
      success: true,
      message: 'Instance status retrieved',
      data: status
    });
  } catch (error) {
    logger.error('Failed to get instance status', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get instance status',
      error: (error as Error).message
    });
  }
});

// Get QR code for connection
router.get('/qr-code', async (req: Request, res: Response) => {
  try {
    const qrCode = await whatsappService.getQRCode();
    
    res.status(200).json({
      success: true,
      message: 'QR code retrieved',
      data: qrCode
    });
  } catch (error) {
    logger.error('Failed to get QR code', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get QR code',
      error: (error as Error).message
    });
  }
});

// Get contacts
router.get('/contacts', async (req: Request, res: Response) => {
  try {
    const contacts = await whatsappService.getContacts();
    
    res.status(200).json({
      success: true,
      message: 'Contacts retrieved',
      data: contacts
    });
  } catch (error) {
    logger.error('Failed to get contacts', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get contacts',
      error: (error as Error).message
    });
  }
});

// Get chats
router.get('/chats', async (req: Request, res: Response) => {
  try {
    const chats = await whatsappService.getChats();
    
    res.status(200).json({
      success: true,
      message: 'Chats retrieved',
      data: chats
    });
  } catch (error) {
    logger.error('Failed to get chats', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get chats',
      error: (error as Error).message
    });
  }
});

// Get rate limit info
router.get('/rate-limit', (req: Request, res: Response) => {
  try {
    const rateLimitInfo = whatsappService.getRateLimitInfo();
    const queueStats = whatsappService.getQueueStats();
    
    res.status(200).json({
      success: true,
      message: 'Rate limit and queue information',
      data: {
        rateLimit: rateLimitInfo,
        queue: queueStats
      }
    });
  } catch (error) {
    logger.error('Failed to get rate limit info', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to get rate limit info',
      error: (error as Error).message
    });
  }
});

// Clear completed messages from queue
router.post('/queue/clear', async (req: Request, res: Response) => {
  try {
    const clearedCount = whatsappService.clearCompletedMessages();
    
    res.status(200).json({
      success: true,
      message: 'Completed messages cleared from queue',
      data: { clearedCount }
    });
  } catch (error) {
    logger.error('Failed to clear queue', { error });
    res.status(500).json({
      success: false,
      message: 'Failed to clear queue',
      error: (error as Error).message
    });
  }
});

// Health check endpoint
router.get('/health', async (req: Request, res: Response) => {
  try {
    const [instanceStatus, rateLimitInfo, queueStats] = await Promise.allSettled([
      whatsappService.getInstanceStatus(),
      Promise.resolve(whatsappService.getRateLimitInfo()),
      Promise.resolve(whatsappService.getQueueStats()),
    ]);
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      instance: instanceStatus.status === 'fulfilled' ? instanceStatus.value : { error: 'Failed to get status' },
      rateLimit: rateLimitInfo.status === 'fulfilled' ? rateLimitInfo.value : null,
      queue: queueStats.status === 'fulfilled' ? queueStats.value : { error: 'Failed to get stats' },
      handlers: webhookProcessor.getHandlersInfo(),
    };
    
    res.status(200).json({
      success: true,
      message: 'WhatsApp service health check',
      data: health
    });
  } catch (error) {
    logger.error('Health check failed', { error });
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: (error as Error).message
    });
  }
});

export { router as whatsappRoutes };