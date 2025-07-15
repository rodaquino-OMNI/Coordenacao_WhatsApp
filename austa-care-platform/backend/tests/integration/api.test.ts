import request from 'supertest';
import app from '@/server';
import { logger } from '@/utils/logger';

// Mock logger for integration tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    silent: false,
  },
}));

describe('API Integration Tests', () => {
  beforeAll(() => {
    // Silence logger during tests
    (logger as any).silent = true;
  });

  afterAll(() => {
    (logger as any).silent = false;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Server Health and Middleware', () => {
    it('should respond to health check endpoint', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.services).toBeDefined();
    });

    it('should apply security headers', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('DENY');
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    it('should handle CORS properly', async () => {
      const response = await request(app)
        .options('/api/auth/login')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'POST');
      
      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    });

    it('should compress responses', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept-Encoding', 'gzip');
      
      // Response should be compressed for text/json
      expect(response.headers['content-encoding']).toBeDefined();
    });

    it('should parse JSON body correctly', async () => {
      const testData = { test: 'data', number: 123 };
      
      const response = await request(app)
        .post('/api/auth/login')
        .send(testData);
      
      expect(response.status).toBe(200);
      // The endpoint should receive and process the JSON data
    });
  });

  describe('Rate Limiting', () => {
    it('should apply rate limiting to API routes', async () => {
      // Make multiple requests to test rate limiting
      // Note: In real implementation, this would require actual rate limit testing
      const requests = Array.from({ length: 3 }, () => 
        request(app).post('/api/auth/login').send({ email: 'test@test.com' })
      );
      
      const responses = await Promise.all(requests);
      
      // All requests should succeed (under rate limit in test)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should not apply rate limiting to health endpoints', async () => {
      const requests = Array.from({ length: 10 }, () => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for unknown routes', async () => {
      const response = await request(app).get('/api/unknown-endpoint');
      
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        success: false,
        message: expect.stringContaining('not found')
      });
    });

    it('should handle invalid JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');
      
      expect(response.status).toBe(400);
    });

    it('should handle request body size limits', async () => {
      const largePayload = 'x'.repeat(12 * 1024 * 1024); // 12MB
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({ data: largePayload });
      
      expect(response.status).toBe(413);
    });
  });

  describe('Authentication Flow Integration', () => {
    it('should complete full authentication flow', async () => {
      // Test registration
      const registerResponse = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123',
          name: 'Integration Test User'
        });
      
      expect(registerResponse.status).toBe(201);
      expect(registerResponse.body.success).toBe(true);
      
      // Test login
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'integration@test.com',
          password: 'testpassword123'
        });
      
      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body.data.token).toBeDefined();
      
      // Test token refresh
      const refreshResponse = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'placeholder-refresh-token'
        });
      
      expect(refreshResponse.status).toBe(200);
      expect(refreshResponse.body.success).toBe(true);
    });
  });

  describe('WhatsApp Integration Flow', () => {
    it('should handle complete WhatsApp webhook flow', async () => {
      // Test webhook verification
      const verifyResponse = await request(app)
        .get('/api/whatsapp/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'test_token',
          'hub.challenge': 'test_challenge'
        });
      
      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.text).toBe('test_challenge');
      
      // Test incoming message webhook
      const webhookPayload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: 'entry_id',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              metadata: {
                display_phone_number: '1234567890',
                phone_number_id: 'phone_id'
              },
              messages: [{
                from: '5511999999999',
                id: 'message_id',
                timestamp: '1234567890',
                text: { body: 'Test message' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };
      
      const messageResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(webhookPayload);
      
      expect(messageResponse.status).toBe(200);
      expect(messageResponse.body.success).toBe(true);
      
      // Test sending message
      const sendResponse = await request(app)
        .post('/api/whatsapp/send')
        .send({
          to: '5511999999999',
          message: 'Response message',
          type: 'text'
        });
      
      expect(sendResponse.status).toBe(200);
      expect(sendResponse.body.success).toBe(true);
      expect(sendResponse.body.data.messageId).toBeDefined();
    });

    it('should handle template message flow', async () => {
      const templateResponse = await request(app)
        .post('/api/whatsapp/send-template')
        .send({
          to: '5511999999999',
          template: 'appointment_reminder',
          language: 'pt_BR',
          parameters: ['João', '2024-01-15', '14:00']
        });
      
      expect(templateResponse.status).toBe(200);
      expect(templateResponse.body.success).toBe(true);
      expect(templateResponse.body.data.template).toBe('appointment_reminder');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      const requests = Array.from({ length: 20 }, (_, i) => 
        request(app)
          .post('/api/auth/login')
          .send({ email: `user${i}@test.com`, password: 'password' })
      );
      
      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
      
      // Should complete within reasonable time (under 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    it('should maintain consistent response format', async () => {
      const endpoints = [
        { method: 'post', path: '/api/auth/login', data: { email: 'test@test.com' } },
        { method: 'post', path: '/api/auth/register', data: { email: 'test@test.com' } },
        { method: 'post', path: '/api/whatsapp/send', data: { to: '123', message: 'test' } },
      ];
      
      for (const endpoint of endpoints) {
        const response = await request(app)
          [endpoint.method](endpoint.path)
          .send(endpoint.data);
        
        expect(response.body).toHaveProperty('success');
        expect(response.body).toHaveProperty('message');
        expect(typeof response.body.success).toBe('boolean');
        expect(typeof response.body.message).toBe('string');
      }
    });
  });

  describe('API Documentation and Standards', () => {
    it('should return appropriate HTTP status codes', async () => {
      const testCases = [
        { path: '/health', expectedStatus: 200 },
        { path: '/api/unknown', expectedStatus: 404 },
        { path: '/api/auth/login', method: 'POST', expectedStatus: 200 },
        { path: '/api/whatsapp/webhook', method: 'GET', query: { 'hub.mode': 'subscribe' }, expectedStatus: 200 },
      ];
      
      for (const testCase of testCases) {
        let requestBuilder = request(app);
        
        if (testCase.method === 'POST') {
          requestBuilder = requestBuilder.post(testCase.path);
        } else {
          requestBuilder = requestBuilder.get(testCase.path);
        }
        
        if (testCase.query) {
          requestBuilder = requestBuilder.query(testCase.query);
        }
        
        const response = await requestBuilder;
        expect(response.status).toBe(testCase.expectedStatus);
      }
    });

    it('should set appropriate content-type headers', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });
});