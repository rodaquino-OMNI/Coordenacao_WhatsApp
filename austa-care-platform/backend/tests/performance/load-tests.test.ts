import request from 'supertest';
import app from '@/server';
import { PerformanceTester, TestDataGenerator, WhatsAppTestHelpers } from '../utils/test-helpers';
import { logger } from '@/utils/logger';

// Mock logger for performance tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    silent: false,
  },
}));

describe('Performance and Load Tests', () => {
  beforeAll(() => {
    (logger as any).silent = true;
    PerformanceTester.reset();
  });

  afterAll(() => {
    (logger as any).silent = false;
    const report = PerformanceTester.getReport();
    console.log('\n📊 Performance Test Report:');
    console.log(`Total tests: ${report.totalTests}`);
    console.log(`Average duration: ${report.averageDuration.toFixed(2)}ms`);
    console.log(`Max duration: ${report.maxDuration.toFixed(2)}ms`);
    console.log(`Min duration: ${report.minDuration.toFixed(2)}ms`);
    console.log(`Total memory used: ${(report.totalMemoryUsed / 1024 / 1024).toFixed(2)}MB`);
  });

  describe('WhatsApp Webhook Performance', () => {
    it('should handle webhook requests under performance SLA', async () => {
      const phoneNumber = '5511999999999';
      const webhookPayload = WhatsAppTestHelpers.createWebhookPayload({
        from: phoneNumber,
        content: 'Performance test message'
      });

      const { duration, memory } = await PerformanceTester.measureAsync(
        'webhook_single_request',
        async () => {
          const response = await request(app)
            .post('/api/whatsapp/webhook')
            .send(webhookPayload);
          return response;
        }
      );

      // Performance requirements
      expect(duration).toBeLessThan(1000); // Under 1 second
      expect(memory).toBeLessThan(50 * 1024 * 1024); // Under 50MB memory increase

      console.log(`Webhook processing: ${duration.toFixed(2)}ms, ${(memory / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle concurrent webhook requests', async () => {
      const concurrentRequests = 50;
      const requests = Array.from({ length: concurrentRequests }, (_, i) => {
        const webhookPayload = WhatsAppTestHelpers.createWebhookPayload({
          from: `551199999${String(i).padStart(4, '0')}`,
          content: `Concurrent test message ${i}`
        });

        return () => request(app)
          .post('/api/whatsapp/webhook')
          .send(webhookPayload);
      });

      const { duration } = await PerformanceTester.measureAsync(
        'webhook_concurrent_requests',
        async () => {
          const responses = await Promise.all(requests.map(req => req()));
          return responses;
        }
      );

      // All requests should complete within reasonable time
      expect(duration).toBeLessThan(5000); // Under 5 seconds for 50 concurrent requests
      
      console.log(`${concurrentRequests} concurrent webhooks: ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance with large message payloads', async () => {
      const largeContent = 'Large message content. '.repeat(100); // ~2KB message
      const webhookPayload = WhatsAppTestHelpers.createWebhookPayload({
        from: '5511999999998',
        content: largeContent
      });

      const { duration, memory } = await PerformanceTester.measureAsync(
        'webhook_large_payload',
        async () => {
          const response = await request(app)
            .post('/api/whatsapp/webhook')
            .send(webhookPayload);
          return response;
        }
      );

      expect(duration).toBeLessThan(2000); // Under 2 seconds for large payload
      expect(memory).toBeLessThan(100 * 1024 * 1024); // Under 100MB

      console.log(`Large payload processing: ${duration.toFixed(2)}ms, ${(memory / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Message Sending Performance', () => {
    it('should send messages efficiently', async () => {
      const messageData = {
        to: '5511999999997',
        message: 'Performance test response',
        type: 'text'
      };

      const { duration } = await PerformanceTester.measureAsync(
        'message_send_single',
        async () => {
          const response = await request(app)
            .post('/api/whatsapp/send')
            .send(messageData);
          return response;
        }
      );

      expect(duration).toBeLessThan(1500); // Under 1.5 seconds
      console.log(`Message send: ${duration.toFixed(2)}ms`);
    });

    it('should handle bulk message sending', async () => {
      const bulkMessages = Array.from({ length: 20 }, (_, i) => ({
        to: `551199999${String(i).padStart(4, '0')}`,
        message: `Bulk message ${i}`,
        type: 'text'
      }));

      const { duration } = await PerformanceTester.measureAsync(
        'message_send_bulk',
        async () => {
          const responses = await Promise.all(
            bulkMessages.map(msg =>
              request(app)
                .post('/api/whatsapp/send')
                .send(msg)
            )
          );
          return responses;
        }
      );

      expect(duration).toBeLessThan(10000); // Under 10 seconds for 20 messages
      console.log(`Bulk message send (20 messages): ${duration.toFixed(2)}ms`);
    });

    it('should send template messages efficiently', async () => {
      const templateData = {
        to: '5511999999996',
        template: 'appointment_reminder',
        language: 'pt_BR',
        parameters: ['Performance Test', '2024-01-15', '14:00']
      };

      const { duration } = await PerformanceTester.measureAsync(
        'template_send_single',
        async () => {
          const response = await request(app)
            .post('/api/whatsapp/send-template')
            .send(templateData);
          return response;
        }
      );

      expect(duration).toBeLessThan(1500); // Under 1.5 seconds
      console.log(`Template send: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Authentication Performance', () => {
    it('should handle login requests efficiently', async () => {
      const loginData = {
        email: 'performance@test.com',
        password: 'testpassword123'
      };

      const { duration } = await PerformanceTester.measureAsync(
        'auth_login_single',
        async () => {
          const response = await request(app)
            .post('/api/auth/login')
            .send(loginData);
          return response;
        }
      );

      expect(duration).toBeLessThan(1000); // Under 1 second
      console.log(`Login: ${duration.toFixed(2)}ms`);
    });

    it('should handle concurrent login attempts', async () => {
      const concurrentLogins = 25;
      const loginRequests = Array.from({ length: concurrentLogins }, (_, i) => 
        () => request(app)
          .post('/api/auth/login')
          .send({
            email: `user${i}@performance.test`,
            password: 'testpassword123'
          })
      );

      const { duration } = await PerformanceTester.measureAsync(
        'auth_login_concurrent',
        async () => {
          const responses = await Promise.all(loginRequests.map(req => req()));
          return responses;
        }
      );

      expect(duration).toBeLessThan(5000); // Under 5 seconds for 25 concurrent logins
      console.log(`${concurrentLogins} concurrent logins: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Health Check Performance', () => {
    it('should respond to health checks quickly', async () => {
      const { duration } = await PerformanceTester.measureAsync(
        'health_check_basic',
        async () => {
          const response = await request(app).get('/health');
          return response;
        }
      );

      expect(duration).toBeLessThan(200); // Under 200ms
      console.log(`Health check: ${duration.toFixed(2)}ms`);
    });

    it('should handle detailed health checks efficiently', async () => {
      const { duration } = await PerformanceTester.measureAsync(
        'health_check_detailed',
        async () => {
          const response = await request(app).get('/health/detailed');
          return response;
        }
      );

      expect(duration).toBeLessThan(1000); // Under 1 second for detailed checks
      console.log(`Detailed health check: ${duration.toFixed(2)}ms`);
    });

    it('should maintain performance under health check load', async () => {
      const healthCheckRequests = Array.from({ length: 100 }, () => 
        () => request(app).get('/health')
      );

      const { duration } = await PerformanceTester.measureAsync(
        'health_check_load',
        async () => {
          const responses = await Promise.all(healthCheckRequests.map(req => req()));
          return responses;
        }
      );

      expect(duration).toBeLessThan(2000); // Under 2 seconds for 100 health checks
      console.log(`100 health checks: ${duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not have significant memory leaks', async () => {
      const iterations = 50;
      let maxMemoryIncrease = 0;
      
      for (let i = 0; i < iterations; i++) {
        const { memory } = await PerformanceTester.measureAsync(
          `memory_test_${i}`,
          async () => {
            // Simulate typical request pattern
            const webhookResponse = await request(app)
              .post('/api/whatsapp/webhook')
              .send(WhatsAppTestHelpers.createWebhookPayload({
                from: `55119999${String(i).padStart(5, '0')}`,
                content: `Memory test message ${i}`
              }));

            const sendResponse = await request(app)
              .post('/api/whatsapp/send')
              .send({
                to: `55119999${String(i).padStart(5, '0')}`,
                message: `Response ${i}`,
                type: 'text'
              });

            return { webhookResponse, sendResponse };
          }
        );

        maxMemoryIncrease = Math.max(maxMemoryIncrease, memory);
      }

      // Memory increase should be reasonable
      expect(maxMemoryIncrease).toBeLessThan(200 * 1024 * 1024); // Under 200MB total increase
      console.log(`Max memory increase over ${iterations} iterations: ${(maxMemoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should garbage collect properly between requests', async () => {
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const initialMemory = process.memoryUsage().heapUsed;

      // Perform memory-intensive operations
      for (let i = 0; i < 20; i++) {
        await request(app)
          .post('/api/whatsapp/webhook')
          .send(WhatsAppTestHelpers.createWebhookPayload({
            from: `5511999999${String(i).padStart(3, '0')}`,
            content: 'Large message content. '.repeat(200) // ~4KB message
          }));
      }

      // Allow some time for cleanup
      await new Promise(resolve => setTimeout(resolve, 100));

      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory should not increase dramatically
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // Under 100MB increase
      console.log(`Memory increase after GC: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Throughput Benchmarks', () => {
    it('should meet throughput requirements for webhooks', async () => {
      const iterations = 100;
      
      const benchmark = await PerformanceTester.benchmarkEndpoint(
        () => request(app)
          .post('/api/whatsapp/webhook')
          .send(WhatsAppTestHelpers.createWebhookPayload({
            from: '5511999999000',
            content: 'Throughput test message'
          })),
        iterations
      );

      // Performance requirements
      expect(benchmark.averageDuration).toBeLessThan(500); // Average under 500ms
      expect(benchmark.p95Duration).toBeLessThan(1000); // 95th percentile under 1s
      expect(benchmark.p99Duration).toBeLessThan(2000); // 99th percentile under 2s

      console.log(`\nWebhook Throughput Benchmark (${iterations} iterations):`);
      console.log(`Average: ${benchmark.averageDuration.toFixed(2)}ms`);
      console.log(`P95: ${benchmark.p95Duration.toFixed(2)}ms`);
      console.log(`P99: ${benchmark.p99Duration.toFixed(2)}ms`);
      console.log(`Max: ${benchmark.maxDuration.toFixed(2)}ms`);
      console.log(`Min: ${benchmark.minDuration.toFixed(2)}ms`);
    });

    it('should meet throughput requirements for message sending', async () => {
      const iterations = 50;
      
      const benchmark = await PerformanceTester.benchmarkEndpoint(
        () => request(app)
          .post('/api/whatsapp/send')
          .send({
            to: '5511999999001',
            message: 'Throughput test response',
            type: 'text'
          }),
        iterations
      );

      expect(benchmark.averageDuration).toBeLessThan(1000); // Average under 1s
      expect(benchmark.p95Duration).toBeLessThan(2000); // 95th percentile under 2s

      console.log(`\nMessage Send Throughput Benchmark (${iterations} iterations):`);
      console.log(`Average: ${benchmark.averageDuration.toFixed(2)}ms`);
      console.log(`P95: ${benchmark.p95Duration.toFixed(2)}ms`);
      console.log(`P99: ${benchmark.p99Duration.toFixed(2)}ms`);
    });
  });
});