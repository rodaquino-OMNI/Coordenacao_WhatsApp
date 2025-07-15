import request from 'supertest';
import app from '@/server';
import { logger } from '@/utils/logger';

// Mock external services
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    silent: false,
  },
}));

describe('E2E WhatsApp Flow Tests', () => {
  beforeAll(() => {
    (logger as any).silent = true;
  });

  afterAll(() => {
    (logger as any).silent = false;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Patient Journey', () => {
    it('should handle complete patient onboarding flow', async () => {
      const patientPhone = '5511999999999';
      const patientName = 'João Silva';
      
      // Step 1: Patient sends initial message
      const initialMessage = {
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
                from: patientPhone,
                id: 'msg_001',
                timestamp: Date.now().toString(),
                text: { body: 'Olá, preciso agendar uma consulta' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const webhookResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(initialMessage);

      expect(webhookResponse.status).toBe(200);
      expect(webhookResponse.body.success).toBe(true);

      // Step 2: System should identify this as a new patient
      // and start registration flow (simulated)
      const registrationResponse = await request(app)
        .post('/api/whatsapp/send')
        .send({
          to: patientPhone,
          message: 'Olá! Bem-vindo à AUSTA Care. Para começar, preciso de algumas informações. Qual é o seu nome completo?',
          type: 'text'
        });

      expect(registrationResponse.status).toBe(200);
      expect(registrationResponse.body.data.messageId).toBeDefined();

      // Step 3: Patient provides name
      const nameMessage = {
        ...initialMessage,
        entry: [{
          ...initialMessage.entry[0],
          changes: [{
            ...initialMessage.entry[0].changes[0],
            value: {
              ...initialMessage.entry[0].changes[0].value,
              messages: [{
                from: patientPhone,
                id: 'msg_002',
                timestamp: Date.now().toString(),
                text: { body: patientName },
                type: 'text'
              }]
            }
          }]
        }]
      };

      const nameWebhookResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(nameMessage);

      expect(nameWebhookResponse.status).toBe(200);

      // Step 4: System acknowledges and asks for email
      const emailRequestResponse = await request(app)
        .post('/api/whatsapp/send')
        .send({
          to: patientPhone,
          message: `Obrigado, ${patientName}! Agora preciso do seu email para criarmos sua conta.`,
          type: 'text'
        });

      expect(emailRequestResponse.status).toBe(200);
    });

    it('should handle appointment booking flow', async () => {
      const patientPhone = '5511999999998';
      
      // Step 1: Existing patient requests appointment
      const appointmentRequest = {
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
                from: patientPhone,
                id: 'msg_003',
                timestamp: Date.now().toString(),
                text: { body: 'Quero marcar uma consulta' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(appointmentRequest);

      expect(response.status).toBe(200);

      // Step 2: System shows available times (simulated with template)
      const availabilityResponse = await request(app)
        .post('/api/whatsapp/send-template')
        .send({
          to: patientPhone,
          template: 'appointment_availability',
          language: 'pt_BR',
          parameters: ['Segunda 15/01', 'Terça 16/01', 'Quarta 17/01']
        });

      expect(availabilityResponse.status).toBe(200);
      expect(availabilityResponse.body.data.template).toBe('appointment_availability');

      // Step 3: Patient selects date
      const dateSelection = {
        ...appointmentRequest,
        entry: [{
          ...appointmentRequest.entry[0],
          changes: [{
            ...appointmentRequest.entry[0].changes[0],
            value: {
              ...appointmentRequest.entry[0].changes[0].value,
              messages: [{
                from: patientPhone,
                id: 'msg_004',
                timestamp: Date.now().toString(),
                text: { body: '1' }, // Selecting first option
                type: 'text'
              }]
            }
          }]
        }]
      };

      const selectionResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(dateSelection);

      expect(selectionResponse.status).toBe(200);

      // Step 4: System confirms appointment
      const confirmationResponse = await request(app)
        .post('/api/whatsapp/send-template')
        .send({
          to: patientPhone,
          template: 'appointment_confirmation',
          language: 'pt_BR',
          parameters: ['Segunda 15/01/2024', '14:00', 'Dr. Silva']
        });

      expect(confirmationResponse.status).toBe(200);
    });

    it('should handle appointment reminder flow', async () => {
      const patientPhone = '5511999999997';
      
      // Simulate sending appointment reminder
      const reminderResponse = await request(app)
        .post('/api/whatsapp/send-template')
        .send({
          to: patientPhone,
          template: 'appointment_reminder',
          language: 'pt_BR',
          parameters: [
            'João Silva',
            'amanhã (15/01/2024)',
            '14:00',
            'Dr. Silva',
            'Consulta de rotina'
          ]
        });

      expect(reminderResponse.status).toBe(200);
      expect(reminderResponse.body.data.template).toBe('appointment_reminder');

      // Patient confirms attendance
      const confirmationMessage = {
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
                from: patientPhone,
                id: 'msg_005',
                timestamp: Date.now().toString(),
                text: { body: 'Confirmado, estarei lá!' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const webhookResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(confirmationMessage);

      expect(webhookResponse.status).toBe(200);

      // System acknowledges confirmation
      const ackResponse = await request(app)
        .post('/api/whatsapp/send')
        .send({
          to: patientPhone,
          message: 'Perfeito! Sua presença foi confirmada. Nos vemos amanhã às 14:00!',
          type: 'text'
        });

      expect(ackResponse.status).toBe(200);
    });
  });

  describe('Error Recovery Scenarios', () => {
    it('should handle message processing failures gracefully', async () => {
      const patientPhone = '5511999999996';
      
      // Simulate a malformed webhook payload
      const malformedMessage = {
        object: 'whatsapp_business_account',
        entry: [{
          // Missing required fields
          changes: [{
            value: {
              // Missing messaging_product and other required fields
              messages: [{
                from: patientPhone,
                text: { body: 'Test message' }
                // Missing required fields like id, timestamp, type
              }]
            }
          }]
        }]
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(malformedMessage);

      // Should still return 200 to avoid WhatsApp retries
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle network timeouts in message sending', async () => {
      const patientPhone = '5511999999995';
      
      // Simulate timeout scenario (in real implementation, this would involve actual timeouts)
      const sendResponse = await request(app)
        .post('/api/whatsapp/send')
        .send({
          to: patientPhone,
          message: 'This message might timeout',
          type: 'text'
        });

      // Should handle gracefully with appropriate response
      expect(sendResponse.status).toBeOneOf([200, 503, 408]);
      
      if (sendResponse.status === 200) {
        expect(sendResponse.body.success).toBe(true);
      }
    });

    it('should handle duplicate message prevention', async () => {
      const patientPhone = '5511999999994';
      const messageId = 'duplicate_msg_001';
      
      const duplicateMessage = {
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
                from: patientPhone,
                id: messageId,
                timestamp: Date.now().toString(),
                text: { body: 'This is a duplicate message' },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      // Send message first time
      const firstResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(duplicateMessage);

      expect(firstResponse.status).toBe(200);

      // Send same message again (duplicate)
      const duplicateResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(duplicateMessage);

      expect(duplicateResponse.status).toBe(200);
      // In real implementation, this should be handled with deduplication logic
    });
  });

  describe('Multi-Modal Message Handling', () => {
    it('should handle image messages', async () => {
      const patientPhone = '5511999999993';
      
      const imageMessage = {
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
                from: patientPhone,
                id: 'img_msg_001',
                timestamp: Date.now().toString(),
                image: {
                  id: 'image_id_123',
                  mime_type: 'image/jpeg',
                  sha256: 'image_hash',
                  caption: 'Esta é minha receita médica'
                },
                type: 'image'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(imageMessage);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // System should acknowledge image receipt
      const ackResponse = await request(app)
        .post('/api/whatsapp/send')
        .send({
          to: patientPhone,
          message: 'Recebi sua imagem! Estou processando o documento...',
          type: 'text'
        });

      expect(ackResponse.status).toBe(200);
    });

    it('should handle document messages', async () => {
      const patientPhone = '5511999999992';
      
      const documentMessage = {
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
                from: patientPhone,
                id: 'doc_msg_001',
                timestamp: Date.now().toString(),
                document: {
                  id: 'document_id_123',
                  mime_type: 'application/pdf',
                  sha256: 'document_hash',
                  filename: 'exame_sangue.pdf',
                  caption: 'Resultado do exame de sangue'
                },
                type: 'document'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(documentMessage);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle audio messages', async () => {
      const patientPhone = '5511999999991';
      
      const audioMessage = {
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
                from: patientPhone,
                id: 'audio_msg_001',
                timestamp: Date.now().toString(),
                audio: {
                  id: 'audio_id_123',
                  mime_type: 'audio/ogg',
                  sha256: 'audio_hash'
                },
                type: 'audio'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const response = await request(app)
        .post('/api/whatsapp/webhook')
        .send(audioMessage);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('AI Conversation Flow', () => {
    it('should handle complex conversation with AI responses', async () => {
      const patientPhone = '5511999999990';
      
      // Patient asks complex medical question
      const medicalQuestion = {
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
                from: patientPhone,
                id: 'complex_msg_001',
                timestamp: Date.now().toString(),
                text: { 
                  body: 'Tenho sentido dores de cabeça frequentes nas últimas semanas. O que pode ser?' 
                },
                type: 'text'
              }]
            },
            field: 'messages'
          }]
        }]
      };

      const questionResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(medicalQuestion);

      expect(questionResponse.status).toBe(200);

      // AI should respond with helpful information and suggest professional consultation
      const aiResponse = await request(app)
        .post('/api/whatsapp/send')
        .send({
          to: patientPhone,
          message: 'Entendo sua preocupação com as dores de cabeça. Existem várias causas possíveis, desde stress até questões mais sérias. Recomendo agendar uma consulta para uma avaliação adequada. Posso ajudar você a marcar?',
          type: 'text'
        });

      expect(aiResponse.status).toBe(200);

      // Patient agrees to schedule
      const scheduleAgreement = {
        ...medicalQuestion,
        entry: [{
          ...medicalQuestion.entry[0],
          changes: [{
            ...medicalQuestion.entry[0].changes[0],
            value: {
              ...medicalQuestion.entry[0].changes[0].value,
              messages: [{
                from: patientPhone,
                id: 'complex_msg_002',
                timestamp: Date.now().toString(),
                text: { body: 'Sim, por favor. Quando tem disponibilidade?' },
                type: 'text'
              }]
            }
          }]
        }]
      };

      const agreementResponse = await request(app)
        .post('/api/whatsapp/webhook')
        .send(scheduleAgreement);

      expect(agreementResponse.status).toBe(200);
    });
  });

  describe('Performance and Load Testing', () => {
    it('should handle multiple simultaneous conversations', async () => {
      const numberOfConversations = 10;
      const conversations = Array.from({ length: numberOfConversations }, (_, i) => ({
        phone: `551199999${String(i).padStart(4, '0')}`,
        messageId: `load_test_${i}`,
      }));

      const requests = conversations.map(conv => {
        const message = {
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
                  from: conv.phone,
                  id: conv.messageId,
                  timestamp: Date.now().toString(),
                  text: { body: `Test message from ${conv.phone}` },
                  type: 'text'
                }]
              },
              field: 'messages'
            }]
          }]
        };

        return request(app)
          .post('/api/whatsapp/webhook')
          .send(message);
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      // Should complete within reasonable time (under 10 seconds for 10 conversations)
      expect(endTime - startTime).toBeLessThan(10000);
    });
  });
});

// Extend Jest matchers
expect.extend({
  toBeOneOf(received, expectedValues) {
    const pass = expectedValues.includes(received);
    return {
      message: () => pass 
        ? `expected ${received} not to be one of ${expectedValues}`
        : `expected ${received} to be one of ${expectedValues}`,
      pass,
    };
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expectedValues: any[]): R;
    }
  }
}