"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.faker = exports.WhatsAppTestHelpers = exports.DatabaseTestHelpers = exports.PerformanceTester = exports.MockDataBuilder = exports.TestDataGenerator = void 0;
const faker_1 = require("@faker-js/faker");
Object.defineProperty(exports, "faker", { enumerable: true, get: function () { return faker_1.faker; } });
class TestDataGenerator {
    static generateUser(overrides = {}) {
        return {
            id: faker_1.faker.string.uuid(),
            email: faker_1.faker.internet.email(),
            name: faker_1.faker.person.fullName(),
            phone: faker_1.faker.phone.number('5511#########'),
            role: 'PATIENT',
            isActive: true,
            createdAt: faker_1.faker.date.recent(),
            updatedAt: faker_1.faker.date.recent(),
            ...overrides,
        };
    }
    static generateConversation(overrides = {}) {
        return {
            id: faker_1.faker.string.uuid(),
            userId: faker_1.faker.string.uuid(),
            whatsappChatId: `chat_${faker_1.faker.string.alphanumeric(10)}`,
            status: 'ACTIVE',
            context: { stage: 'greeting', data: {} },
            lastMessageAt: faker_1.faker.date.recent(),
            createdAt: faker_1.faker.date.recent(),
            updatedAt: faker_1.faker.date.recent(),
            ...overrides,
        };
    }
    static generateMessage(overrides = {}) {
        return {
            id: faker_1.faker.string.uuid(),
            conversationId: faker_1.faker.string.uuid(),
            whatsappMessageId: `msg_${faker_1.faker.string.alphanumeric(10)}`,
            direction: faker_1.faker.helpers.arrayElement(['INBOUND', 'OUTBOUND']),
            content: faker_1.faker.lorem.sentence(),
            messageType: 'TEXT',
            metadata: { timestamp: faker_1.faker.date.recent().getTime().toString() },
            processedAt: faker_1.faker.datatype.boolean() ? faker_1.faker.date.recent() : null,
            createdAt: faker_1.faker.date.recent(),
            ...overrides,
        };
    }
    static generateAppointment(overrides = {}) {
        const appointmentDate = faker_1.faker.date.future();
        return {
            id: faker_1.faker.string.uuid(),
            userId: faker_1.faker.string.uuid(),
            patientName: faker_1.faker.person.fullName(),
            patientPhone: faker_1.faker.phone.number('5511#########'),
            appointmentDate,
            status: faker_1.faker.helpers.arrayElement(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED']),
            type: faker_1.faker.helpers.arrayElement(['CONSULTATION', 'FOLLOW_UP', 'EMERGENCY']),
            notes: faker_1.faker.lorem.paragraph(),
            reminderSent: faker_1.faker.datatype.boolean(),
            createdAt: faker_1.faker.date.recent(),
            updatedAt: faker_1.faker.date.recent(),
            ...overrides,
        };
    }
    static generateWhatsAppWebhook(overrides = {}) {
        const phoneNumber = faker_1.faker.phone.number('5511#########');
        const messageId = `msg_${faker_1.faker.string.alphanumeric(15)}`;
        return {
            object: 'whatsapp_business_account',
            entry: [{
                    id: faker_1.faker.string.alphanumeric(10),
                    changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: faker_1.faker.phone.number('##########'),
                                    phone_number_id: faker_1.faker.string.alphanumeric(10)
                                },
                                messages: [{
                                        from: phoneNumber,
                                        id: messageId,
                                        timestamp: faker_1.faker.date.recent().getTime().toString(),
                                        text: {
                                            body: faker_1.faker.lorem.sentence()
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
    static generateBulkUsers(count) {
        return Array.from({ length: count }, () => this.generateUser());
    }
    static generateBulkMessages(count, conversationId) {
        return Array.from({ length: count }, () => this.generateMessage(conversationId ? { conversationId } : {}));
    }
    static generateBulkAppointments(count, userId) {
        return Array.from({ length: count }, () => this.generateAppointment(userId ? { userId } : {}));
    }
}
exports.TestDataGenerator = TestDataGenerator;
class MockDataBuilder {
    data = {};
    static create() {
        return new MockDataBuilder();
    }
    withUser(userData) {
        this.data.user = TestDataGenerator.generateUser(userData);
        return this;
    }
    withConversation(conversationData) {
        const userId = this.data.user?.id || faker_1.faker.string.uuid();
        this.data.conversation = TestDataGenerator.generateConversation({
            userId,
            ...conversationData
        });
        return this;
    }
    withMessages(count, messageData) {
        const conversationId = this.data.conversation?.id || faker_1.faker.string.uuid();
        this.data.messages = TestDataGenerator.generateBulkMessages(count)
            .map(msg => ({ ...msg, conversationId, ...messageData }));
        return this;
    }
    withAppointments(count, appointmentData) {
        const userId = this.data.user?.id || faker_1.faker.string.uuid();
        this.data.appointments = TestDataGenerator.generateBulkAppointments(count)
            .map(apt => ({ ...apt, userId, ...appointmentData }));
        return this;
    }
    build() {
        return this.data;
    }
}
exports.MockDataBuilder = MockDataBuilder;
class PerformanceTester {
    static measurements = [];
    static async measureAsync(name, fn) {
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
    static async benchmarkEndpoint(requestFn, iterations = 100) {
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
    static percentile(values, percentile) {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[index];
    }
}
exports.PerformanceTester = PerformanceTester;
class DatabaseTestHelpers {
    static async clearTables(prisma, tables) {
        // Clear tables in reverse dependency order to avoid foreign key constraints
        const clearOrder = ['message', 'appointment', 'conversation', 'user'];
        for (const table of clearOrder) {
            if (tables.includes(table)) {
                await prisma[table].deleteMany({});
            }
        }
    }
    static async seedTestData(prisma) {
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
        const conversations = await Promise.all(users.map(user => prisma.conversation.create({
            data: TestDataGenerator.generateConversation({
                userId: user.id,
                whatsappChatId: `chat_${user.phone}`
            })
        })));
        // Create test messages
        const messages = [];
        for (const conversation of conversations) {
            const conversationMessages = await Promise.all(TestDataGenerator.generateBulkMessages(5, conversation.id).map(messageData => prisma.message.create({ data: messageData })));
            messages.push(...conversationMessages);
        }
        // Create test appointments
        const appointments = await Promise.all(users.map(user => prisma.appointment.create({
            data: TestDataGenerator.generateAppointment({
                userId: user.id,
                patientName: user.name,
                patientPhone: user.phone
            })
        })));
        return { users, conversations, messages, appointments };
    }
}
exports.DatabaseTestHelpers = DatabaseTestHelpers;
class WhatsAppTestHelpers {
    static createWebhookPayload(messageData) {
        const { from, messageId = faker_1.faker.string.alphanumeric(15), content, type = 'text', metadata = {} } = messageData;
        const message = {
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
                    id: faker_1.faker.string.alphanumeric(15),
                    mime_type: 'image/jpeg',
                    sha256: faker_1.faker.string.alphanumeric(64),
                    caption: content
                };
                break;
            case 'document':
                message.document = {
                    id: faker_1.faker.string.alphanumeric(15),
                    mime_type: 'application/pdf',
                    sha256: faker_1.faker.string.alphanumeric(64),
                    filename: content,
                    caption: content
                };
                break;
            case 'audio':
                message.audio = {
                    id: faker_1.faker.string.alphanumeric(15),
                    mime_type: 'audio/ogg',
                    sha256: faker_1.faker.string.alphanumeric(64)
                };
                break;
        }
        return {
            object: 'whatsapp_business_account',
            entry: [{
                    id: faker_1.faker.string.alphanumeric(10),
                    changes: [{
                            value: {
                                messaging_product: 'whatsapp',
                                metadata: {
                                    display_phone_number: faker_1.faker.phone.number('##########'),
                                    phone_number_id: faker_1.faker.string.alphanumeric(10),
                                    ...metadata
                                },
                                messages: [message]
                            },
                            field: 'messages'
                        }]
                }]
        };
    }
    static extractMessageData(webhookPayload) {
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
exports.WhatsAppTestHelpers = WhatsAppTestHelpers;
//# sourceMappingURL=test-helpers.js.map