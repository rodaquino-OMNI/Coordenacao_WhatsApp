/**
 * Webhook Utilities Unit Tests
 * Test suite for webhook validation and security utilities
 */

import crypto from 'crypto';
import {
  validateWebhookSignature,
  validateVerifyToken,
  generateWebhookSignature,
  sanitizeWebhookPayload,
  validateRequestIP,
  WebhookRateLimiter,
} from '@/utils/webhook';

// Mock config
jest.mock('@/config/config', () => ({
  config: {
    nodeEnv: 'development',
    zapi: {
      webhookSecret: 'test-secret-key',
      webhookVerifyToken: 'test-verify-token',
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

describe('Webhook Utilities', () => {
  const testPayload = JSON.stringify({
    instanceId: 'test-instance',
    messageId: 'msg_123',
    phone: '5511999999999',
    text: { message: 'Hello, World!' },
  });

  const testSecret = 'test-secret-key';
  const testToken = 'test-verify-token';

  describe('validateWebhookSignature', () => {
    it('should validate correct signature', () => {
      const signature = generateWebhookSignature(testPayload, testSecret);
      const isValid = validateWebhookSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect signature', () => {
      const correctSignature = generateWebhookSignature(testPayload, testSecret);
      const incorrectSignature = correctSignature.replace('a', 'b');
      const isValid = validateWebhookSignature(testPayload, incorrectSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should handle signature with sha256= prefix', () => {
      const signature = generateWebhookSignature(testPayload, testSecret);
      const isValid = validateWebhookSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should handle signature without sha256= prefix', () => {
      const hmac = crypto.createHmac('sha256', testSecret);
      hmac.update(testPayload, 'utf8');
      const signature = hmac.digest('hex');
      
      const isValid = validateWebhookSignature(testPayload, signature, testSecret);
      expect(isValid).toBe(true);
    });

    it('should reject signatures of different lengths', () => {
      const shortSignature = 'short';
      const isValid = validateWebhookSignature(testPayload, shortSignature, testSecret);
      expect(isValid).toBe(false);
    });

    it('should handle errors gracefully', () => {
      const isValid = validateWebhookSignature(testPayload, 'invalid-hex', testSecret);
      expect(isValid).toBe(false);
    });

    it('should use default secret from config', () => {
      const signature = generateWebhookSignature(testPayload, testSecret);
      const isValid = validateWebhookSignature(testPayload, signature);
      expect(isValid).toBe(true);
    });
  });

  describe('validateVerifyToken', () => {
    it('should validate correct token', () => {
      const isValid = validateVerifyToken(testToken, testToken);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect token', () => {
      const isValid = validateVerifyToken('wrong-token', testToken);
      expect(isValid).toBe(false);
    });

    it('should reject tokens of different lengths', () => {
      const isValid = validateVerifyToken('short', testToken);
      expect(isValid).toBe(false);
    });

    it('should handle empty tokens', () => {
      const isValid = validateVerifyToken('', testToken);
      expect(isValid).toBe(false);
    });

    it('should use default token from config', () => {
      const isValid = validateVerifyToken(testToken);
      expect(isValid).toBe(true);
    });

    it('should handle errors gracefully', () => {
      // Pass null as token to trigger error
      const isValid = validateVerifyToken(null as any, testToken);
      expect(isValid).toBe(false);
    });
  });

  describe('generateWebhookSignature', () => {
    it('should generate valid signature', () => {
      const signature = generateWebhookSignature(testPayload, testSecret);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });

    it('should generate consistent signatures', () => {
      const signature1 = generateWebhookSignature(testPayload, testSecret);
      const signature2 = generateWebhookSignature(testPayload, testSecret);
      expect(signature1).toBe(signature2);
    });

    it('should generate different signatures for different payloads', () => {
      const payload1 = JSON.stringify({ message: 'hello' });
      const payload2 = JSON.stringify({ message: 'world' });
      
      const signature1 = generateWebhookSignature(payload1, testSecret);
      const signature2 = generateWebhookSignature(payload2, testSecret);
      
      expect(signature1).not.toBe(signature2);
    });

    it('should generate different signatures for different secrets', () => {
      const signature1 = generateWebhookSignature(testPayload, 'secret1');
      const signature2 = generateWebhookSignature(testPayload, 'secret2');
      
      expect(signature1).not.toBe(signature2);
    });

    it('should use default secret from config', () => {
      const signature = generateWebhookSignature(testPayload);
      expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    });
  });

  describe('sanitizeWebhookPayload', () => {
    it('should redact sensitive fields', () => {
      const payload = {
        instanceId: 'test-instance',
        messageId: 'msg_123',
        token: 'secret-token',
        apiKey: 'secret-key',
        password: 'secret-password',
        text: { message: 'Hello' },
      };

      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized.instanceId).toBe('test-instance');
      expect(sanitized.messageId).toBe('msg_123');
      expect(sanitized.token).toBe('[REDACTED]');
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.text.message).toBe('Hello');
    });

    it('should handle nested objects', () => {
      const payload = {
        data: {
          credentials: {
            token: 'secret-token',
            key: 'secret-key',
          },
          message: 'Hello',
        },
      };

      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized.data.credentials.token).toBe('[REDACTED]');
      expect(sanitized.data.credentials.key).toBe('[REDACTED]');
      expect(sanitized.data.message).toBe('Hello');
    });

    it('should handle arrays', () => {
      const payload = {
        tokens: ['token1', 'token2'],
        messages: [
          { id: 1, text: 'Hello' },
          { id: 2, text: 'World' },
        ],
      };

      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized.tokens).toEqual(['[REDACTED]', '[REDACTED]']);
      expect(sanitized.messages).toEqual([
        { id: 1, text: 'Hello' },
        { id: 2, text: 'World' },
      ]);
    });

    it('should handle null and undefined values', () => {
      const payload = {
        nullValue: null,
        undefinedValue: undefined,
        token: 'secret',
      };

      const sanitized = sanitizeWebhookPayload(payload);

      expect(sanitized.nullValue).toBeNull();
      expect(sanitized.undefinedValue).toBeUndefined();
      expect(sanitized.token).toBe('[REDACTED]');
    });

    it('should handle primitive values', () => {
      expect(sanitizeWebhookPayload('string')).toBe('string');
      expect(sanitizeWebhookPayload(123)).toBe(123);
      expect(sanitizeWebhookPayload(true)).toBe(true);
      expect(sanitizeWebhookPayload(null)).toBeNull();
    });
  });

  describe('validateRequestIP', () => {
    it('should allow localhost in development', () => {
      const isValid1 = validateRequestIP('127.0.0.1');
      const isValid2 = validateRequestIP('::1');
      
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
    });

    it('should validate against CIDR ranges', () => {
      const isValid1 = validateRequestIP('35.1.2.3', ['35.0.0.0/8']);
      const isValid2 = validateRequestIP('18.1.2.3', ['18.0.0.0/8']);
      const isValid3 = validateRequestIP('192.168.1.1', ['35.0.0.0/8']);
      
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
      expect(isValid3).toBe(false);
    });

    it('should validate exact IP matches', () => {
      const isValid1 = validateRequestIP('1.2.3.4', ['1.2.3.4']);
      const isValid2 = validateRequestIP('1.2.3.5', ['1.2.3.4']);
      
      expect(isValid1).toBe(true);
      expect(isValid2).toBe(false);
    });

    it('should handle invalid IP formats gracefully', () => {
      const isValid = validateRequestIP('invalid-ip', ['192.168.1.0/24']);
      expect(isValid).toBe(false);
    });

    it('should use default whitelist', () => {
      const isValid = validateRequestIP('35.1.2.3');
      expect(isValid).toBe(true);
    });
  });

  describe('WebhookRateLimiter', () => {
    let rateLimiter: WebhookRateLimiter;

    beforeEach(() => {
      rateLimiter = new WebhookRateLimiter(3, 1000); // 3 requests per second
    });

    it('should allow requests within limit', () => {
      expect(rateLimiter.isAllowed('client1')).toBe(true);
      expect(rateLimiter.isAllowed('client1')).toBe(true);
      expect(rateLimiter.isAllowed('client1')).toBe(true);
    });

    it('should reject requests over limit', () => {
      // Use up the limit
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      
      // Next request should be rejected
      expect(rateLimiter.isAllowed('client1')).toBe(false);
    });

    it('should track different clients separately', () => {
      // Use up limit for client1
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      
      // client2 should still be allowed
      expect(rateLimiter.isAllowed('client2')).toBe(true);
      expect(rateLimiter.isAllowed('client1')).toBe(false);
    });

    it('should return correct remaining count', () => {
      expect(rateLimiter.getRemaining('client1')).toBe(3);
      
      rateLimiter.isAllowed('client1');
      expect(rateLimiter.getRemaining('client1')).toBe(2);
      
      rateLimiter.isAllowed('client1');
      expect(rateLimiter.getRemaining('client1')).toBe(1);
      
      rateLimiter.isAllowed('client1');
      expect(rateLimiter.getRemaining('client1')).toBe(0);
    });

    it('should reset rate limit for specific client', () => {
      // Use up the limit
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      
      expect(rateLimiter.isAllowed('client1')).toBe(false);
      
      // Reset and try again
      rateLimiter.reset('client1');
      expect(rateLimiter.isAllowed('client1')).toBe(true);
    });

    it('should cleanup old entries', () => {
      // Mock Date.now to control time
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);

      // Add some requests
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client2');

      // Move time forward beyond window
      currentTime = 3000;

      // Cleanup should remove old entries
      rateLimiter.cleanup();

      // Clients should have full limit again
      expect(rateLimiter.getRemaining('client1')).toBe(3);
      expect(rateLimiter.getRemaining('client2')).toBe(3);

      // Restore Date.now
      Date.now = originalNow;
    });

    it('should handle window expiration correctly', () => {
      const originalNow = Date.now;
      let currentTime = 1000;
      Date.now = jest.fn(() => currentTime);

      // Use up the limit
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      rateLimiter.isAllowed('client1');
      
      expect(rateLimiter.isAllowed('client1')).toBe(false);

      // Move time forward beyond window
      currentTime = 2100; // Beyond 1 second window

      // Should be allowed again
      expect(rateLimiter.isAllowed('client1')).toBe(true);

      // Restore Date.now
      Date.now = originalNow;
    });
  });
});