import Redis from 'redis';
import { config } from '../config/config';
import { logger } from '../utils/logger';

export class RedisService {
  private client: Redis.RedisClientType;
  private isConnected: boolean = false;

  constructor() {
    this.client = Redis.createClient({
      url: config.redis.url,
      socket: {
        reconnectDelay: 1000,
        connectTimeout: 10000,
      },
      retryDelayOnClusterDown: 300,
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    this.setupEventHandlers();
    this.connect();
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      logger.info('Redis client connected');
      this.isConnected = true;
    });

    this.client.on('error', (error) => {
      logger.error('Redis client error', error);
      this.isConnected = false;
    });

    this.client.on('reconnecting', () => {
      logger.info('Redis client reconnecting');
    });

    this.client.on('end', () => {
      logger.info('Redis client connection ended');
      this.isConnected = false;
    });
  }

  private async connect(): Promise<void> {
    try {
      await this.client.connect();
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      throw error;
    }
  }

  async get(key: string): Promise<string | null> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.get(key);
    } catch (error) {
      logger.error(`Error getting key ${key} from Redis`, error);
      return null;
    }
  }

  async set(key: string, value: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.set(key, value);
    } catch (error) {
      logger.error(`Error setting key ${key} in Redis`, error);
      throw error;
    }
  }

  async setex(key: string, seconds: number, value: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.setEx(key, seconds, value);
    } catch (error) {
      logger.error(`Error setting key ${key} with expiry in Redis`, error);
      throw error;
    }
  }

  async del(key: string): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.del(key);
    } catch (error) {
      logger.error(`Error deleting key ${key} from Redis`, error);
      throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      const result = await this.client.exists(key);
      return result > 0;
    } catch (error) {
      logger.error(`Error checking existence of key ${key} in Redis`, error);
      return false;
    }
  }

  async keys(pattern: string): Promise<string[]> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      return await this.client.keys(pattern);
    } catch (error) {
      logger.error(`Error getting keys with pattern ${pattern} from Redis`, error);
      return [];
    }
  }

  async flushdb(): Promise<void> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      await this.client.flushDb();
    } catch (error) {
      logger.error('Error flushing Redis database', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.isConnected) {
        await this.client.quit();
        this.isConnected = false;
      }
    } catch (error) {
      logger.error('Error disconnecting from Redis', error);
    }
  }

  getClient(): Redis.RedisClientType {
    return this.client;
  }

  isHealthy(): boolean {
    return this.isConnected;
  }
}