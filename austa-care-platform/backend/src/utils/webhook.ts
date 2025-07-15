/**
 * Webhook Validation Utilities
 * Security utilities for validating Z-API webhook signatures
 */

import crypto from 'crypto';
import { logger } from './logger';
import { config } from '../config/config';

/**
 * Validate webhook signature using HMAC-SHA256
 */
export function validateWebhookSignature(
  payload: string,
  signature: string,
  secret: string = config.zapi.webhookSecret
): boolean {
  try {
    // Remove 'sha256=' prefix if present
    const cleanSignature = signature.replace(/^sha256=/, '');
    
    // Create HMAC hash
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const expectedSignature = hmac.digest('hex');
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    const signatureBuffer = Buffer.from(cleanSignature, 'hex');
    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
    
    logger.debug('Webhook signature validation', {
      isValid,
      signatureLength: cleanSignature.length,
      expectedLength: expectedSignature.length,
    });
    
    return isValid;
  } catch (error) {
    logger.error('Webhook signature validation error', {
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Validate webhook verify token for initial setup
 */
export function validateVerifyToken(
  providedToken: string,
  expectedToken: string = config.zapi.webhookVerifyToken
): boolean {
  try {
    // Use crypto.timingSafeEqual to prevent timing attacks
    const providedBuffer = Buffer.from(providedToken, 'utf8');
    const expectedBuffer = Buffer.from(expectedToken, 'utf8');
    
    if (providedBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    const isValid = crypto.timingSafeEqual(providedBuffer, expectedBuffer);
    
    logger.debug('Webhook verify token validation', { isValid });
    
    return isValid;
  } catch (error) {
    logger.error('Webhook verify token validation error', {
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Generate webhook signature for outgoing requests
 */
export function generateWebhookSignature(
  payload: string,
  secret: string = config.zapi.webhookSecret
): string {
  try {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload, 'utf8');
    const signature = hmac.digest('hex');
    
    logger.debug('Generated webhook signature', {
      payloadLength: payload.length,
      signatureLength: signature.length,
    });
    
    return `sha256=${signature}`;
  } catch (error) {
    logger.error('Webhook signature generation error', {
      error: (error as Error).message,
    });
    throw error;
  }
}

/**
 * Sanitize webhook payload for logging
 */
export function sanitizeWebhookPayload(payload: any): any {
  const sensitive = ['token', 'secret', 'password', 'key', 'authorization'];
  
  const sanitize = (obj: any): any => {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitive.some(s => lowerKey.includes(s))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(value);
      }
    }
    
    return sanitized;
  };
  
  return sanitize(payload);
}

/**
 * Validate request IP address against whitelist
 */
export function validateRequestIP(
  requestIP: string,
  whitelist: string[] = ['35.0.0.0/8', '18.0.0.0/8'] // Z-API IP ranges
): boolean {
  try {
    // For development, allow localhost
    if (config.nodeEnv === 'development' && (requestIP === '127.0.0.1' || requestIP === '::1')) {
      return true;
    }
    
    // Check against whitelist (simplified CIDR check)
    for (const range of whitelist) {
      if (range.includes('/')) {
        const [network, prefix] = range.split('/');
        const networkParts = network.split('.').map(Number);
        const requestParts = requestIP.split('.').map(Number);
        
        if (networkParts.length === 4 && requestParts.length === 4) {
          const prefixLength = parseInt(prefix);
          const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
          
          const networkInt = (networkParts[0] << 24) + (networkParts[1] << 16) + (networkParts[2] << 8) + networkParts[3];
          const requestInt = (requestParts[0] << 24) + (requestParts[1] << 16) + (requestParts[2] << 8) + requestParts[3];
          
          if ((networkInt & mask) === (requestInt & mask)) {
            return true;
          }
        }
      } else {
        if (requestIP === range) {
          return true;
        }
      }
    }
    
    logger.warn('Request from unauthorized IP', { requestIP });
    return false;
  } catch (error) {
    logger.error('IP validation error', {
      requestIP,
      error: (error as Error).message,
    });
    return false;
  }
}

/**
 * Rate limiting for webhooks
 */
export class WebhookRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is within rate limits
   */
  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Filter out old requests
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    // Check if limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      logger.warn('Webhook rate limit exceeded', {
        identifier,
        requests: recentRequests.length,
        limit: this.maxRequests,
      });
      return false;
    }
    
    // Add current request
    recentRequests.push(now);
    this.requests.set(identifier, recentRequests);
    
    return true;
  }

  /**
   * Get remaining requests for identifier
   */
  getRemaining(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    const requests = this.requests.get(identifier) || [];
    const recentRequests = requests.filter(timestamp => timestamp > windowStart);
    
    return Math.max(0, this.maxRequests - recentRequests.length);
  }

  /**
   * Reset rate limit for identifier
   */
  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  /**
   * Cleanup old entries
   */
  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    
    for (const [identifier, requests] of this.requests.entries()) {
      const recentRequests = requests.filter(timestamp => timestamp > windowStart);
      
      if (recentRequests.length === 0) {
        this.requests.delete(identifier);
      } else {
        this.requests.set(identifier, recentRequests);
      }
    }
  }
}

// Create global rate limiter instance
export const webhookRateLimiter = new WebhookRateLimiter();

// Cleanup old entries every 5 minutes
setInterval(() => {
  webhookRateLimiter.cleanup();
}, 5 * 60 * 1000);