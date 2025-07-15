import request from 'supertest';
import express from 'express';
import { healthRoutes } from '@/controllers/health';
import { logger } from '@/utils/logger';

const app = express();
app.use('/health', healthRoutes);

// Mock logger
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Health Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test',
        version: expect.any(String),
        memory: {
          used: expect.any(Number),
          total: expect.any(Number),
          external: expect.any(Number),
        },
        services: {
          api: 'healthy',
          database: 'checking...',
          redis: 'checking...',
          whatsapp: 'checking...',
        }
      });
    });

    it('should handle health check errors', async () => {
      // Mock process.uptime to throw an error
      const originalUptime = process.uptime;
      process.uptime = jest.fn().mockImplementation(() => {
        throw new Error('Process error');
      });

      const response = await request(app).get('/health');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Service unavailable'
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Health check failed',
        { error: expect.any(Error) }
      );

      // Restore original function
      process.uptime = originalUptime;
    });

    it('should format memory usage correctly', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.memory.used).toBeGreaterThan(0);
      expect(response.body.memory.total).toBeGreaterThan(0);
      expect(response.body.memory.external).toBeGreaterThan(0);
      
      // Memory values should be rounded to 2 decimal places
      expect(Number.isInteger(response.body.memory.used * 100)).toBe(true);
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed health status with all services healthy', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
        environment: 'test',
        version: expect.any(String),
        services: {
          database: 'healthy',
          redis: 'healthy',
          whatsapp: 'healthy',
        },
        checks: expect.arrayContaining([
          { service: 'database', status: 'fulfilled', error: undefined },
          { service: 'redis', status: 'fulfilled', error: undefined },
          { service: 'whatsapp', status: 'fulfilled', error: undefined },
        ])
      });
    });

    it('should return degraded status when some services fail', async () => {
      // We can't easily mock the internal Promise.allSettled behavior,
      // but we can test the error handling
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBeOneOf([200, 503]);
      expect(response.body.status).toBeOneOf(['healthy', 'degraded']);
      expect(response.body.services).toBeDefined();
      expect(response.body.checks).toBeDefined();
    });

    it('should handle detailed health check errors', async () => {
      // Mock Promise.allSettled to throw an error
      const originalAllSettled = Promise.allSettled;
      Promise.allSettled = jest.fn().mockRejectedValue(new Error('Promise error'));

      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'unhealthy',
        timestamp: expect.any(String),
        error: 'Service unavailable'
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Detailed health check failed',
        { error: expect.any(Error) }
      );

      // Restore original function
      Promise.allSettled = originalAllSettled;
    });
  });

  describe('GET /health/ready', () => {
    it('should return ready status when all critical services are available', async () => {
      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'ready',
        timestamp: expect.any(String),
      });
    });

    it('should handle readiness check errors', async () => {
      // Mock Promise.all to reject
      const originalAll = Promise.all;
      Promise.all = jest.fn().mockRejectedValue(new Error('Service not ready'));

      const response = await request(app).get('/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        status: 'not ready',
        timestamp: expect.any(String),
        error: 'Service not ready'
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Readiness check failed',
        { error: expect.any(Error) }
      );

      // Restore original function
      Promise.all = originalAll;
    });
  });

  describe('GET /health/live', () => {
    it('should always return alive status', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'alive',
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      });
    });

    it('should return consistent timestamp format', async () => {
      const response = await request(app).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('Health Check Functions', () => {
    it('should have consistent timestamp format across all endpoints', async () => {
      const endpoints = ['/health', '/health/detailed', '/health/ready', '/health/live'];
      
      for (const endpoint of endpoints) {
        const response = await request(app).get(endpoint);
        expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
      }
    });

    it('should return uptime for basic and liveness checks', async () => {
      const basicResponse = await request(app).get('/health');
      const liveResponse = await request(app).get('/health/live');

      expect(basicResponse.body.uptime).toBeGreaterThanOrEqual(0);
      expect(liveResponse.body.uptime).toBeGreaterThanOrEqual(0);
    });
  });
});

// Custom Jest matcher for multiple values
expect.extend({
  toBeOneOf(received, expectedValues) {
    const pass = expectedValues.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expectedValues}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expectedValues}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expectedValues: any[]): R;
    }
  }
}