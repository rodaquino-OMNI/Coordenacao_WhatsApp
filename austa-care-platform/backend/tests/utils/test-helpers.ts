import { faker } from '@faker-js/faker';

export class TestDataGenerator {
  static generateUser(overrides: Partial<any> = {}) {
    return {
      id: faker.datatype.uuid(),
      email: faker.internet.email(),
      name: faker.person.fullName(),
      phone: faker.phone.number('5511#########'),
      role: 'PATIENT',
      isActive: true,
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static generateConversation(overrides: Partial<any> = {}) {
    return {
      id: faker.datatype.uuid(),
      userId: faker.datatype.uuid(),
      whatsappChatId: `chat_${faker.random.alphaNumeric(10)}`,
      status: 'ACTIVE',
      context: { stage: 'greeting', data: {} },
      lastMessageAt: faker.date.recent(),
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static generateMessage(overrides: Partial<any> = {}) {
    return {
      id: faker.datatype.uuid(),
      conversationId: faker.datatype.uuid(),
      whatsappMessageId: `msg_${faker.random.alphaNumeric(10)}`,
      direction: faker.helpers.arrayElement(['INBOUND', 'OUTBOUND']),
      content: faker.lorem.sentence(),
      messageType: 'TEXT',
      metadata: { timestamp: faker.date.recent().getTime().toString() },
      processedAt: faker.datatype.boolean() ? faker.date.recent() : null,
      createdAt: faker.date.recent(),
      ...overrides,
    };
  }

  static generateAppointment(overrides: Partial<any> = {}) {
    const appointmentDate = faker.date.future();
    return {
      id: faker.datatype.uuid(),
      userId: faker.datatype.uuid(),
      patientName: faker.person.fullName(),
      patientPhone: faker.phone.number('5511#########'),
      appointmentDate,
      status: faker.helpers.arrayElement(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
      type: faker.helpers.arrayElement(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY']),
      notes: faker.lorem.paragraph(),
      reminderSent: faker.datatype.boolean(),
      createdAt: faker.date.recent(),
      updatedAt: faker.date.recent(),
      ...overrides,
    };
  }

  static generateWhatsAppWebhook(overrides: Partial<any> = {}) {
    const phoneNumber = faker.phone.number('5511#########');
    const messageId = `msg_${faker.random.alphaNumeric(15)}`;
    
    return {
      object: 'whatsapp_business_account',
      entry: [{
        id: faker.random.alphaNumeric(10),
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: faker.phone.number('##########'),
              phone_number_id: faker.random.alphaNumeric(10)
            },
            messages: [{
              from: phoneNumber,
              id: messageId,
              timestamp: faker.date.recent().getTime().toString(),
              text: {
                body: faker.lorem.sentence()
              },
              type: 'text'
            }]
          },
          field: 'messages'
        }]
      }],
      ...overrides,
    };
  }

  static generateBulkUsers(count: number) {
    return Array.from({ length: count }, () => this.generateUser());
  }

  static generateBulkMessages(count: number, conversationId?: string) {
    return Array.from({ length: count }, () => 
      this.generateMessage(conversationId ? { conversationId } : {})
    );
  }

  static generateBulkAppointments(count: number, userId?: string) {
    return Array.from({ length: count }, () => 
      this.generateAppointment(userId ? { userId } : {})
    );
  }
}

export class MockDataBuilder {
  private data: any = {};

  static create() {
    return new MockDataBuilder();
  }

  withUser(userData?: Partial<any>) {
    this.data.user = TestDataGenerator.generateUser(userData);
    return this;
  }

  withConversation(conversationData?: Partial<any>) {
    const userId = this.data.user?.id || faker.datatype.uuid();
    this.data.conversation = TestDataGenerator.generateConversation({
      userId,
      ...conversationData
    });
    return this;
  }

  withMessages(count: number, messageData?: Partial<any>) {
    const conversationId = this.data.conversation?.id || faker.datatype.uuid();
    this.data.messages = TestDataGenerator.generateBulkMessages(count)
      .map(msg => ({ ...msg, conversationId, ...messageData }));
    return this;
  }

  withAppointments(count: number, appointmentData?: Partial<any>) {
    const userId = this.data.user?.id || faker.datatype.uuid();
    this.data.appointments = TestDataGenerator.generateBulkAppointments(count)
      .map(apt => ({ ...apt, userId, ...appointmentData }));
    return this;
  }

  build() {
    return this.data;
  }
}

export class PerformanceTester {
  private static measurements: Array<{ name: string; duration: number; memory: number }> = [];

  static async measureAsync<T>(
    name: string, 
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number; memory: number }> {
    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage().heapUsed;
    
    const result = await fn();
    
    const endTime = process.hrtime.bigint();
    const endMemory = process.memoryUsage().heapUsed;
    
    const duration = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    const memory = endMemory - startMemory;
    
    this.measurements.push({ name, duration, memory });
    
    return { result, duration, memory };
  }

  static getReport() {
    const report = {
      totalTests: this.measurements.length,
      averageDuration: this.measurements.reduce((sum, m) => sum + m.duration, 0) / this.measurements.length,
      maxDuration: Math.max(...this.measurements.map(m => m.duration)),
      minDuration: Math.min(...this.measurements.map(m => m.duration)),
      totalMemoryUsed: this.measurements.reduce((sum, m) => sum + Math.max(0, m.memory), 0),
      measurements: this.measurements,
    };
    
    return report;
  }

  static reset() {
    this.measurements = [];
  }

  static async benchmarkEndpoint(
    requestFn: () => Promise<any>,
    iterations: number = 100
  ) {
    const results = [];
    
    for (let i = 0; i < iterations; i++) {
      const measurement = await this.measureAsync(`benchmark_${i}`, requestFn);
      results.push(measurement);
    }
    
    const durations = results.map(r => r.duration);
    const memories = results.map(r => r.memory);
    
    return {
      iterations,
      averageDuration: durations.reduce((sum, d) => sum + d, 0) / iterations,
      p95Duration: this.percentile(durations, 95),
      p99Duration: this.percentile(durations, 99),
      maxDuration: Math.max(...durations),
      minDuration: Math.min(...durations),
      averageMemory: memories.reduce((sum, m) => sum + m, 0) / iterations,
      maxMemory: Math.max(...memories),
      totalMemory: memories.reduce((sum, m) => sum + Math.max(0, m), 0),
    };
  }

  private static percentile(values: number[], percentile: number): number {
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }
}

export class DatabaseTestHelpers {
  static async clearTables(prisma: any, tables: string[]) {
    // Clear tables in reverse dependency order to avoid foreign key constraints
    const clearOrder = ['message', 'appointment', 'conversation', 'user'];
    
    for (const table of clearOrder) {
      if (tables.includes(table)) {
        await prisma[table].deleteMany({});
      }
    }
  }

  static async seedTestData(prisma: any) {
    // Create test users
    const users = await Promise.all([
      prisma.user.create({
        data: TestDataGenerator.generateUser({
          email: 'patient1@test.com',
          name: 'Test Patient 1',
          phone: '5511999999991'
        })
      }),
      prisma.user.create({
        data: TestDataGenerator.generateUser({
          email: 'patient2@test.com',
          name: 'Test Patient 2',
          phone: '5511999999992'
        })
      })
    ]);

    // Create test conversations
    const conversations = await Promise.all(
      users.map(user => 
        prisma.conversation.create({
          data: TestDataGenerator.generateConversation({
            userId: user.id,
            whatsappChatId: `chat_${user.phone}`
          })
        })
      )
    );

    // Create test messages
    const messages = [];
    for (const conversation of conversations) {
      const conversationMessages = await Promise.all(
        TestDataGenerator.generateBulkMessages(5, conversation.id).map(messageData =>
          prisma.message.create({ data: messageData })
        )
      );
      messages.push(...conversationMessages);
    }

    // Create test appointments
    const appointments = await Promise.all(
      users.map(user =>
        prisma.appointment.create({
          data: TestDataGenerator.generateAppointment({
            userId: user.id,
            patientName: user.name,
            patientPhone: user.phone
          })
        })
      )
    );

    return { users, conversations, messages, appointments };
  }
}

export class WhatsAppTestHelpers {
  static createWebhookPayload(messageData: {
    from: string;
    messageId?: string;
    content: string;
    type?: 'text' | 'image' | 'document' | 'audio';
    metadata?: any;
  }) {
    const { from, messageId = faker.random.alphaNumeric(15), content, type = 'text', metadata = {} } = messageData;
    
    const message: any = {
      from,
      id: messageId,
      timestamp: Date.now().toString(),
      type
    };

    switch (type) {
      case 'text':
        message.text = { body: content };
        break;
      case 'image':
        message.image = {
          id: faker.random.alphaNumeric(15),
          mime_type: 'image/jpeg',
          sha256: faker.random.alphaNumeric(64),
          caption: content
        };
        break;
      case 'document':
        message.document = {
          id: faker.random.alphaNumeric(15),
          mime_type: 'application/pdf',
          sha256: faker.random.alphaNumeric(64),
          filename: content,
          caption: content
        };
        break;
      case 'audio':
        message.audio = {
          id: faker.random.alphaNumeric(15),
          mime_type: 'audio/ogg',
          sha256: faker.random.alphaNumeric(64)
        };
        break;
    }

    return {
      object: 'whatsapp_business_account',
      entry: [{
        id: faker.random.alphaNumeric(10),
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: {
              display_phone_number: faker.phone.number('##########'),
              phone_number_id: faker.random.alphaNumeric(10),
              ...metadata
            },
            messages: [message]
          },
          field: 'messages'
        }]
      }]
    };
  }

  static extractMessageData(webhookPayload: any) {
    const entry = webhookPayload.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    
    return {
      from: message?.from,
      messageId: message?.id,
      timestamp: message?.timestamp,
      type: message?.type,
      content: message?.text?.body || message?.image?.caption || message?.document?.filename || 'media',
      metadata: change?.value?.metadata
    };
  }
}

export { faker };