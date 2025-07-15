import * as dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production']).default('development'),
  PORT: z.string().transform(Number).default('3000'),
  
  // Database
  DATABASE_URL: z.string().min(1, 'Database URL is required'),
  REDIS_URL: z.string().min(1, 'Redis URL is required'),
  REDIS_CLUSTER_ENABLED: z.string().transform(val => val === 'true').default('false'),
  REDIS_CLUSTER_NODES: z.string().optional(),
  MONGODB_URI: z.string().default('mongodb://localhost:27017'),
  MONGODB_DATABASE: z.string().default('austa_care'),
  
  // Kafka
  KAFKA_BROKERS: z.string().default('localhost:9092'),
  KAFKA_CLIENT_ID: z.string().default('austa-care-platform'),
  KAFKA_SSL_ENABLED: z.string().transform(val => val === 'true').default('false'),
  KAFKA_SASL_USERNAME: z.string().optional(),
  KAFKA_SASL_PASSWORD: z.string().optional(),
  
  // WhatsApp Z-API
  ZAPI_BASE_URL: z.string().url('Invalid Z-API base URL').default('https://api.z-api.io'),
  ZAPI_INSTANCE_ID: z.string().min(1, 'Z-API instance ID is required'),
  ZAPI_TOKEN: z.string().min(1, 'Z-API token is required'),
  ZAPI_WEBHOOK_SECRET: z.string().min(1, 'Z-API webhook secret is required'),
  ZAPI_WEBHOOK_VERIFY_TOKEN: z.string().min(1, 'Z-API webhook verify token is required'),
  ZAPI_RATE_LIMIT_REQUESTS: z.string().transform(Number).default('20'),
  ZAPI_RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('60000'),
  ZAPI_RETRY_ATTEMPTS: z.string().transform(Number).default('3'),
  ZAPI_RETRY_DELAY_MS: z.string().transform(Number).default('1000'),
  
  // OpenAI
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-4-turbo'),
  OPENAI_MAX_TOKENS: z.string().transform(Number).default('2048'),
  
  // JWT
  JWT_SECRET: z.string().min(32, 'JWT secret must be at least 32 characters'),
  JWT_EXPIRY: z.string().default('24h'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT refresh secret must be at least 32 characters'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  
  // Security
  ENCRYPTION_KEY: z.string().min(32, 'Encryption key must be at least 32 characters'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('10485760'), // 10MB
  UPLOAD_PATH: z.string().default('./uploads'),
  
  // External APIs
  TASY_API_URL: z.string().url('Invalid Tasy API URL'),
  TASY_API_KEY: z.string().min(1, 'Tasy API key is required'),
  TASY_API_SECRET: z.string().min(1, 'Tasy API secret is required'),
  
  // FHIR
  FHIR_BASE_URL: z.string().url('Invalid FHIR base URL').default('http://localhost:8080/fhir'),
  FHIR_VERSION: z.string().default('R4'),
  
  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  
  // Health Check
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'), // 30 seconds
});

// Validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  
  database: {
    url: env.DATABASE_URL,
  },
  
  redis: {
    url: env.REDIS_URL,
    cluster: {
      enabled: env.REDIS_CLUSTER_ENABLED,
      nodes: env.REDIS_CLUSTER_NODES ? 
        env.REDIS_CLUSTER_NODES.split(',').map(node => {
          const [host, port] = node.split(':');
          return { host, port: parseInt(port, 10) };
        }) : [],
    },
  },
  
  mongodb: {
    uri: env.MONGODB_URI,
    database: env.MONGODB_DATABASE,
  },
  
  kafka: {
    brokers: env.KAFKA_BROKERS.split(','),
    clientId: env.KAFKA_CLIENT_ID,
    ssl: env.KAFKA_SSL_ENABLED,
    sasl: env.KAFKA_SASL_USERNAME && env.KAFKA_SASL_PASSWORD ? {
      mechanism: 'plain',
      username: env.KAFKA_SASL_USERNAME,
      password: env.KAFKA_SASL_PASSWORD,
    } : undefined,
  },
  
  zapi: {
    baseUrl: env.ZAPI_BASE_URL,
    instanceId: env.ZAPI_INSTANCE_ID,
    token: env.ZAPI_TOKEN,
    webhookSecret: env.ZAPI_WEBHOOK_SECRET,
    webhookVerifyToken: env.ZAPI_WEBHOOK_VERIFY_TOKEN,
    rateLimit: {
      requests: env.ZAPI_RATE_LIMIT_REQUESTS,
      windowMs: env.ZAPI_RATE_LIMIT_WINDOW_MS,
    },
    retry: {
      attempts: env.ZAPI_RETRY_ATTEMPTS,
      delayMs: env.ZAPI_RETRY_DELAY_MS,
    },
  },
  
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    maxTokens: env.OPENAI_MAX_TOKENS,
  },
  
  jwt: {
    secret: env.JWT_SECRET,
    expiry: env.JWT_EXPIRY,
    refreshSecret: env.JWT_REFRESH_SECRET,
    refreshExpiry: env.JWT_REFRESH_EXPIRY,
  },
  
  security: {
    encryptionKey: env.ENCRYPTION_KEY,
  },
  
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    path: env.UPLOAD_PATH,
  },
  
  tasy: {
    apiUrl: env.TASY_API_URL,
    apiKey: env.TASY_API_KEY,
    apiSecret: env.TASY_API_SECRET,
  },
  
  fhir: {
    baseUrl: env.FHIR_BASE_URL,
    version: env.FHIR_VERSION,
  },
  
  cors: {
    origin: env.CORS_ORIGIN,
  },
  
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS,
  },
  
  logging: {
    level: env.LOG_LEVEL,
  },
  
  healthCheck: {
    interval: env.HEALTH_CHECK_INTERVAL,
  },
} as const;

export type Config = typeof config;