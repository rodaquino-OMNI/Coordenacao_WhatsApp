import { faker } from '@faker-js/faker';
export declare class TestDataGenerator {
    static generateUser(overrides?: Partial<any>): {
        id: any;
        email: string;
        name: string;
        phone: string;
        role: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    };
    static generateConversation(overrides?: Partial<any>): {
        id: any;
        userId: any;
        whatsappChatId: string;
        status: string;
        context: {
            stage: string;
            data: {};
        };
        lastMessageAt: Date;
        createdAt: Date;
        updatedAt: Date;
    };
    static generateMessage(overrides?: Partial<any>): {
        id: any;
        conversationId: any;
        whatsappMessageId: string;
        direction: string;
        content: string;
        messageType: string;
        metadata: {
            timestamp: string;
        };
        processedAt: Date | null;
        createdAt: Date;
    };
    static generateAppointment(overrides?: Partial<any>): {
        id: any;
        userId: any;
        patientName: string;
        patientPhone: string;
        appointmentDate: Date;
        status: string;
        type: string;
        notes: string;
        reminderSent: any;
        createdAt: Date;
        updatedAt: Date;
    };
    static generateWhatsAppWebhook(overrides?: Partial<any>): {
        object: string;
        entry: {
            id: any;
            changes: {
                value: {
                    messaging_product: string;
                    metadata: {
                        display_phone_number: string;
                        phone_number_id: any;
                    };
                    messages: {
                        from: string;
                        id: string;
                        timestamp: string;
                        text: {
                            body: string;
                        };
                        type: string;
                    }[];
                };
                field: string;
            }[];
        }[];
    };
    static generateBulkUsers(count: number): {
        id: any;
        email: string;
        name: string;
        phone: string;
        role: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
    }[];
    static generateBulkMessages(count: number, conversationId?: string): {
        id: any;
        conversationId: any;
        whatsappMessageId: string;
        direction: string;
        content: string;
        messageType: string;
        metadata: {
            timestamp: string;
        };
        processedAt: Date | null;
        createdAt: Date;
    }[];
    static generateBulkAppointments(count: number, userId?: string): {
        id: any;
        userId: any;
        patientName: string;
        patientPhone: string;
        appointmentDate: Date;
        status: string;
        type: string;
        notes: string;
        reminderSent: any;
        createdAt: Date;
        updatedAt: Date;
    }[];
}
export declare class MockDataBuilder {
    private data;
    static create(): MockDataBuilder;
    withUser(userData?: Partial<any>): this;
    withConversation(conversationData?: Partial<any>): this;
    withMessages(count: number, messageData?: Partial<any>): this;
    withAppointments(count: number, appointmentData?: Partial<any>): this;
    build(): any;
}
export declare class PerformanceTester {
    private static measurements;
    static measureAsync<T>(name: string, fn: () => Promise<T>): Promise<{
        result: T;
        duration: number;
        memory: number;
    }>;
    static getReport(): {
        totalTests: number;
        averageDuration: number;
        maxDuration: number;
        minDuration: number;
        totalMemoryUsed: number;
        measurements: {
            name: string;
            duration: number;
            memory: number;
        }[];
    };
    static reset(): void;
    static benchmarkEndpoint(requestFn: () => Promise<any>, iterations?: number): Promise<{
        iterations: number;
        averageDuration: number;
        p95Duration: number;
        p99Duration: number;
        maxDuration: number;
        minDuration: number;
        averageMemory: number;
        maxMemory: number;
        totalMemory: number;
    }>;
    private static percentile;
}
export declare class DatabaseTestHelpers {
    static clearTables(prisma: any, tables: string[]): Promise<void>;
    static seedTestData(prisma: any): Promise<{
        users: [any, any];
        conversations: any[];
        messages: any[];
        appointments: any[];
    }>;
}
export declare class WhatsAppTestHelpers {
    static createWebhookPayload(messageData: {
        from: string;
        messageId?: string;
        content: string;
        type?: 'text' | 'image' | 'document' | 'audio';
        metadata?: any;
    }): {
        object: string;
        entry: {
            id: any;
            changes: {
                value: {
                    messaging_product: string;
                    metadata: any;
                    messages: any[];
                };
                field: string;
            }[];
        }[];
    };
    static extractMessageData(webhookPayload: any): {
        from: any;
        messageId: any;
        timestamp: any;
        type: any;
        content: any;
        metadata: any;
    };
}
export { faker };
//# sourceMappingURL=test-helpers.d.ts.map