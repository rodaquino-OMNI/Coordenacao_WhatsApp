"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = require("dotenv");
const logger_1 = require("@/utils/logger");
// Load test environment variables
(0, dotenv_1.config)({ path: '.env.test' });
// Mock external services during tests
jest.mock('axios');
jest.mock('redis', () => ({
    createClient: jest.fn(() => ({
        connect: jest.fn(),
        disconnect: jest.fn(),
        set: jest.fn(),
        get: jest.fn(),
        del: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        on: jest.fn(),
        ping: jest.fn().mockResolvedValue('PONG'),
    })),
}));
// Mock OpenAI
jest.mock('openai', () => ({
    OpenAI: jest.fn().mockImplementation(() => ({
        chat: {
            completions: {
                create: jest.fn(),
            },
        },
    })),
}));
// Mock WhatsApp Web.js
jest.mock('whatsapp-web.js', () => ({
    Client: jest.fn().mockImplementation(() => ({
        initialize: jest.fn(),
        destroy: jest.fn(),
        sendMessage: jest.fn(),
        getChats: jest.fn(),
        getContactById: jest.fn(),
        on: jest.fn(),
    })),
    LocalAuth: jest.fn(),
}));
// Mock Prisma Client
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        user: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        conversation: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        message: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        appointment: {
            create: jest.fn(),
            findUnique: jest.fn(),
            findMany: jest.fn(),
            update: jest.fn(),
            delete: jest.fn(),
        },
        $connect: jest.fn(),
        $disconnect: jest.fn(),
        $transaction: jest.fn(),
    })),
}));
// Silence logger during tests
beforeAll(() => {
    logger_1.logger.silent = true;
});
afterAll(() => {
    logger_1.logger.silent = false;
});
// Global test timeout
jest.setTimeout(30000);
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Promise Rejection:', reason);
});
// Clean up after each test
afterEach(() => {
    jest.clearAllMocks();
});
// Global test helpers
global.testHelpers = {
    createMockRequest: (overrides = {}) => ({
        body: {},
        params: {},
        query: {},
        headers: {},
        user: null,
        ...overrides,
    }),
    createMockResponse: () => {
        const res = {};
        res.status = jest.fn().mockReturnValue(res);
        res.json = jest.fn().mockReturnValue(res);
        res.send = jest.fn().mockReturnValue(res);
        res.cookie = jest.fn().mockReturnValue(res);
        res.clearCookie = jest.fn().mockReturnValue(res);
        return res;
    },
    createMockNext: () => jest.fn(),
    delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
};
//# sourceMappingURL=setup.js.map