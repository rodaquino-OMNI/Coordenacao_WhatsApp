/**
 * WhatsApp Service Unit Tests
 * Comprehensive test suite for Z-API WhatsApp integration
 */

import axios from 'axios';
import { WhatsAppService } from '@/services/whatsapp.service';
import { config } from '@/config/config';
import {
  SendTextMessageRequest,
  SendImageMessageRequest,
  SendDocumentMessageRequest,
  ZAPIResponse,
  SendMessageResponse,
  InstanceStatusResponse,
} from '@/types/whatsapp';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock config
jest.mock('@/config/config', () => ({
  config: {
    zapi: {
      baseUrl: 'https://api.z-api.io',
      instanceId: 'test-instance',
      token: 'test-token',
      webhookSecret: 'test-secret',
      webhookVerifyToken: 'test-verify-token',
      rateLimit: {
        requests: 20,
        windowMs: 60000,
      },
      retry: {
        attempts: 3,
        delayMs: 1000,
      },
    },
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('WhatsAppService', () => {
  let whatsappService: WhatsAppService;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock axios.create
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };
    
    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    
    whatsappService = new WhatsAppService();
  });

  afterEach(() => {
    whatsappService.destroy();
  });

  describe('constructor', () => {
    it('should create axios client with correct configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: `${config.zapi.baseUrl}/instances/${config.zapi.instanceId}/token/${config.zapi.token}`,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });
    });

    it('should setup request and response interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('getInstanceStatus', () => {
    it('should successfully get instance status', async () => {
      const mockResponse: ZAPIResponse<InstanceStatusResponse> = {
        value: {
          connected: true,
          session: 'active',
          smartphoneConnected: true,
        },
        status: 'success',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await whatsappService.getInstanceStatus();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/status');
      expect(result).toEqual(mockResponse.value);
    });

    it('should handle API errors', async () => {
      const errorResponse = {
        response: {
          status: 500,
          data: { error: 'Internal server error' },
        },
      };

      mockAxiosInstance.get.mockRejectedValue(errorResponse);

      await expect(whatsappService.getInstanceStatus()).rejects.toThrow();
    });
  });

  describe('sendTextMessage', () => {
    it('should successfully send text message', async () => {
      const request: SendTextMessageRequest = {
        phone: '5511999999999',
        message: 'Hello, World!',
        delayMessage: 0,
      };

      const mockResponse: ZAPIResponse<SendMessageResponse> = {
        value: {
          messageId: 'msg_123',
          sent: true,
          message: 'Message sent successfully',
          phone: '5511999999999',
        },
        status: 'success',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await whatsappService.sendTextMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-text', {
        phone: '5511999999999',
        message: 'Hello, World!',
        delayMessage: 0,
      });
      expect(result).toEqual(mockResponse.value);
    });

    it('should format phone number correctly', async () => {
      const request: SendTextMessageRequest = {
        phone: '11999999999', // Without country code
        message: 'Test message',
      };

      const mockResponse: ZAPIResponse<SendMessageResponse> = {
        value: {
          messageId: 'msg_123',
          sent: true,
          message: 'Message sent successfully',
          phone: '5511999999999',
        },
        status: 'success',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      await whatsappService.sendTextMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-text', {
        phone: '5511999999999', // Should add country code
        message: 'Test message',
        delayMessage: 0,
      });
    });

    it('should handle Z-API error responses', async () => {
      const request: SendTextMessageRequest = {
        phone: '5511999999999',
        message: 'Test message',
      };

      const errorResponse: ZAPIResponse = {
        value: null,
        status: 'error',
        error: 'Invalid phone number',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: errorResponse });

      await expect(whatsappService.sendTextMessage(request)).rejects.toThrow('Invalid phone number');
    });
  });

  describe('sendImageMessage', () => {
    it('should successfully send image message', async () => {
      const request: SendImageMessageRequest = {
        phone: '5511999999999',
        image: 'https://example.com/image.jpg',
        caption: 'Test image',
        delayMessage: 0,
      };

      const mockResponse: ZAPIResponse<SendMessageResponse> = {
        value: {
          messageId: 'msg_456',
          sent: true,
          message: 'Image sent successfully',
          phone: '5511999999999',
        },
        status: 'success',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await whatsappService.sendImageMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-image', {
        phone: '5511999999999',
        image: 'https://example.com/image.jpg',
        caption: 'Test image',
        delayMessage: 0,
      });
      expect(result).toEqual(mockResponse.value);
    });

    it('should handle missing caption', async () => {
      const request: SendImageMessageRequest = {
        phone: '5511999999999',
        image: 'https://example.com/image.jpg',
      };

      const mockResponse: ZAPIResponse<SendMessageResponse> = {
        value: {
          messageId: 'msg_456',
          sent: true,
          message: 'Image sent successfully',
          phone: '5511999999999',
        },
        status: 'success',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      await whatsappService.sendImageMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-image', {
        phone: '5511999999999',
        image: 'https://example.com/image.jpg',
        caption: '',
        delayMessage: 0,
      });
    });
  });

  describe('sendDocumentMessage', () => {
    it('should successfully send document message', async () => {
      const request: SendDocumentMessageRequest = {
        phone: '5511999999999',
        document: 'https://example.com/document.pdf',
        fileName: 'document.pdf',
        caption: 'Test document',
        delayMessage: 0,
      };

      const mockResponse: ZAPIResponse<SendMessageResponse> = {
        value: {
          messageId: 'msg_789',
          sent: true,
          message: 'Document sent successfully',
          phone: '5511999999999',
        },
        status: 'success',
      };

      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await whatsappService.sendDocumentMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-document', {
        phone: '5511999999999',
        document: 'https://example.com/document.pdf',
        fileName: 'document.pdf',
        caption: 'Test document',
        delayMessage: 0,
      });
      expect(result).toEqual(mockResponse.value);
    });
  });

  describe('retry mechanism', () => {
    it('should retry failed requests with exponential backoff', async () => {
      const request: SendTextMessageRequest = {
        phone: '5511999999999',
        message: 'Test message',
      };

      // Mock first two calls to fail, third to succeed
      mockAxiosInstance.post
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          data: {
            value: {
              messageId: 'msg_retry',
              sent: true,
              message: 'Message sent successfully',
              phone: '5511999999999',
            },
            status: 'success',
          },
        });

      const result = await whatsappService.sendTextMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3);
      expect(result.messageId).toBe('msg_retry');
    });

    it('should fail after max retry attempts', async () => {
      const request: SendTextMessageRequest = {
        phone: '5511999999999',
        message: 'Test message',
      };

      mockAxiosInstance.post.mockRejectedValue(new Error('Persistent error'));

      await expect(whatsappService.sendTextMessage(request)).rejects.toThrow('Persistent error');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(3); // Max attempts
    });

    it('should not retry on client errors (4xx)', async () => {
      const request: SendTextMessageRequest = {
        phone: 'invalid',
        message: 'Test message',
      };

      const clientError = new Error('Bad request');
      (clientError as any).response = { status: 400 };

      mockAxiosInstance.post.mockRejectedValue(clientError);

      await expect(whatsappService.sendTextMessage(request)).rejects.toThrow('Bad request');
      expect(mockAxiosInstance.post).toHaveBeenCalledTimes(1); // No retry
    });
  });

  describe('rate limiting', () => {
    it('should track rate limit information from headers', async () => {
      const mockResponse = {
        data: {
          value: { connected: true, session: 'active', smartphoneConnected: true },
          status: 'success',
        },
        headers: {
          'x-ratelimit-limit': '100',
          'x-ratelimit-remaining': '99',
          'x-ratelimit-reset': '1640995200',
        },
      };

      mockAxiosInstance.get.mockResolvedValue(mockResponse);

      await whatsappService.getInstanceStatus();

      const rateLimitInfo = whatsappService.getRateLimitInfo();
      expect(rateLimitInfo).toEqual({
        limit: 100,
        remaining: 99,
        reset: 1640995200,
      });
    });

    it('should handle rate limit exceeded (429)', async () => {
      const rateLimitError = new Error('Rate limit exceeded');
      (rateLimitError as any).response = {
        status: 429,
        headers: { 'retry-after': '60' },
      };

      mockAxiosInstance.get
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({
          data: {
            value: { connected: true, session: 'active', smartphoneConnected: true },
            status: 'success',
          },
        });

      // Mock setTimeout to resolve immediately for testing
      jest.spyOn(global, 'setTimeout').mockImplementation((callback: any) => {
        callback();
        return {} as any;
      });

      const result = await whatsappService.getInstanceStatus();
      expect(result).toBeDefined();

      // Restore setTimeout
      jest.restoreAllMocks();
    });
  });

  describe('message queue', () => {
    it('should add message to queue', () => {
      const messageId = whatsappService.addToQueue({
        type: 'text',
        payload: { phone: '5511999999999', message: 'Test' },
        phone: '5511999999999',
        attempts: 0,
        maxAttempts: 3,
        nextRetry: new Date(),
        status: 'pending',
      });

      expect(messageId).toBeDefined();
      expect(messageId).toMatch(/^msg_/);
    });

    it('should get queue statistics', () => {
      whatsappService.addToQueue({
        type: 'text',
        payload: { phone: '5511999999999', message: 'Test 1' },
        phone: '5511999999999',
        attempts: 0,
        maxAttempts: 3,
        nextRetry: new Date(),
        status: 'pending',
      });

      whatsappService.addToQueue({
        type: 'text',
        payload: { phone: '5511999999999', message: 'Test 2' },
        phone: '5511999999999',
        attempts: 0,
        maxAttempts: 3,
        nextRetry: new Date(),
        status: 'pending',
      });

      const stats = whatsappService.getQueueStats();
      expect(stats.pending).toBe(2);
      expect(stats.total).toBe(2);
    });

    it('should clear completed messages', () => {
      // Add messages with different statuses
      const messageId1 = whatsappService.addToQueue({
        type: 'text',
        payload: { phone: '5511999999999', message: 'Test 1' },
        phone: '5511999999999',
        attempts: 0,
        maxAttempts: 3,
        nextRetry: new Date(),
        status: 'sent',
      });

      const messageId2 = whatsappService.addToQueue({
        type: 'text',
        payload: { phone: '5511999999999', message: 'Test 2' },
        phone: '5511999999999',
        attempts: 0,
        maxAttempts: 3,
        nextRetry: new Date(),
        status: 'pending',
      });

      const clearedCount = whatsappService.clearCompletedMessages();
      expect(clearedCount).toBe(1); // Only the 'sent' message should be cleared

      const stats = whatsappService.getQueueStats();
      expect(stats.total).toBe(1); // Only 'pending' message remains
    });
  });

  describe('phone number formatting', () => {
    it('should add country code for Brazilian numbers', async () => {
      const request: SendTextMessageRequest = {
        phone: '11999999999', // 11 digits without country code
        message: 'Test',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          value: { messageId: 'test', sent: true, message: 'ok', phone: '5511999999999' },
          status: 'success',
        },
      });

      await whatsappService.sendTextMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-text', {
        phone: '5511999999999',
        message: 'Test',
        delayMessage: 0,
      });
    });

    it('should not modify numbers that already have country code', async () => {
      const request: SendTextMessageRequest = {
        phone: '5511999999999', // Already has country code
        message: 'Test',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          value: { messageId: 'test', sent: true, message: 'ok', phone: '5511999999999' },
          status: 'success',
        },
      });

      await whatsappService.sendTextMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-text', {
        phone: '5511999999999',
        message: 'Test',
        delayMessage: 0,
      });
    });

    it('should clean non-digit characters', async () => {
      const request: SendTextMessageRequest = {
        phone: '+55 (11) 99999-9999',
        message: 'Test',
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: {
          value: { messageId: 'test', sent: true, message: 'ok', phone: '5511999999999' },
          status: 'success',
        },
      });

      await whatsappService.sendTextMessage(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/send-text', {
        phone: '5511999999999',
        message: 'Test',
        delayMessage: 0,
      });
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      const networkError = new Error('Network Error');
      (networkError as any).code = 'ECONNREFUSED';

      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(whatsappService.getInstanceStatus()).rejects.toThrow('Network Error');
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('Timeout');
      (timeoutError as any).code = 'ECONNABORTED';

      mockAxiosInstance.get.mockRejectedValue(timeoutError);

      await expect(whatsappService.getInstanceStatus()).rejects.toThrow('Timeout');
    });

    it('should handle Z-API specific errors', async () => {
      const zapiError: ZAPIResponse = {
        value: null,
        status: 'error',
        error: 'Instance not connected',
      };

      mockAxiosInstance.get.mockResolvedValue({ data: zapiError });

      await expect(whatsappService.getInstanceStatus()).rejects.toThrow('Instance not connected');
    });
  });

  describe('service destruction', () => {
    it('should cleanup resources on destroy', () => {
      // Add some messages to queue
      whatsappService.addToQueue({
        type: 'text',
        payload: { phone: '5511999999999', message: 'Test' },
        phone: '5511999999999',
        attempts: 0,
        maxAttempts: 3,
        nextRetry: new Date(),
        status: 'pending',
      });

      const initialStats = whatsappService.getQueueStats();
      expect(initialStats.total).toBeGreaterThan(0);

      whatsappService.destroy();

      const finalStats = whatsappService.getQueueStats();
      expect(finalStats.total).toBe(0);
    });
  });
});