import Redis, { Cluster, ClusterOptions } from 'ioredis';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

export interface RedisClusterConfig {
  nodes: Array<{ host: string; port: number }>;
  options?: ClusterOptions;
}

export class RedisClusterClient {
  private static instance: RedisClusterClient;
  private cluster: Cluster | null = null;
  private standalone: Redis | null = null;
  private isClusterMode: boolean;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;

  private constructor() {
    this.isClusterMode = config.redis?.cluster?.enabled || false;
  }

  static getInstance(): RedisClusterClient {
    if (!RedisClusterClient.instance) {
      RedisClusterClient.instance = new RedisClusterClient();
    }
    return RedisClusterClient.instance;
  }

  // Initialize Redis connection
  async connect(): Promise<void> {
    try {
      if (this.isClusterMode) {
        await this.connectCluster();
      } else {
        await this.connectStandalone();
      }
      
      logger.info('Redis connection established successfully');
      this.setupEventHandlers();
    } catch (error) {
      logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  // Connect to Redis cluster
  private async connectCluster(): Promise<void> {
    const clusterConfig: RedisClusterConfig = {
      nodes: config.redis?.cluster?.nodes || [
        { host: 'localhost', port: 7000 },
        { host: 'localhost', port: 7001 },
        { host: 'localhost', port: 7002 },
      ],
      options: {
        enableReadyCheck: true,
        retryDelayOnFailover: 100,
        retryDelayOnClusterDown: 300,
        slotsRefreshTimeout: 2000,
        clusterRetryStrategy: (times: number) => {
          if (times > this.maxReconnectAttempts) {
            logger.error('Max reconnection attempts reached for Redis cluster');
            return null;
          }
          return Math.min(times * 100, 3000);
        },
        redisOptions: {
          connectTimeout: 10000,
          commandTimeout: 5000,
          keepAlive: 10000,
        },
      },
    };

    this.cluster = new Redis.Cluster(clusterConfig.nodes, clusterConfig.options);
    
    // Wait for cluster to be ready
    await new Promise<void>((resolve, reject) => {
      this.cluster!.once('ready', resolve);
      this.cluster!.once('error', reject);
    });
  }

  // Connect to standalone Redis
  private async connectStandalone(): Promise<void> {
    // Parse Redis URL if provided, otherwise use defaults
    const redisUrl = config.redis?.url || 'redis://localhost:6379';
    
    this.standalone = new Redis(redisUrl, {
      retryStrategy: (times: number) => {
        if (times > this.maxReconnectAttempts) {
          logger.error('Max reconnection attempts reached for Redis');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      maxRetriesPerRequest: 3,
      connectTimeout: 10000,
      commandTimeout: 5000,
      keepAlive: 10000,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    // Wait for connection to be ready
    await new Promise<void>((resolve, reject) => {
      this.standalone!.once('ready', resolve);
      this.standalone!.once('error', reject);
    });
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    const client = this.getClient();

    client.on('error', (error: Error) => {
      logger.error('Redis error:', error);
    });

    client.on('connect', () => {
      logger.info('Redis client connected');
      this.reconnectAttempts = 0;
    });

    client.on('reconnecting', () => {
      this.reconnectAttempts++;
      logger.warn(`Redis client reconnecting (attempt ${this.reconnectAttempts})`);
    });

    client.on('end', () => {
      logger.warn('Redis client connection ended');
    });

    if (this.cluster) {
      this.cluster.on('node error', (error: Error, node: string) => {
        logger.error(`Redis cluster node error (${node}):`, error);
      });
    }
  }

  // Get the active Redis client
  getClient(): Redis | Cluster {
    if (this.isClusterMode && this.cluster) {
      return this.cluster;
    } else if (this.standalone) {
      return this.standalone;
    }
    throw new Error('Redis client not initialized');
  }

  // Session management methods
  async setSession(sessionId: string, data: any, ttl: number = 1800): Promise<void> {
    const key = `session:${sessionId}`;
    const value = JSON.stringify(data);
    
    await this.getClient().setex(key, ttl, value);
    logger.debug(`Session stored: ${sessionId}`);
  }

  async getSession(sessionId: string): Promise<any | null> {
    const key = `session:${sessionId}`;
    const value = await this.getClient().get(key);
    
    if (!value) {
      return null;
    }
    
    return JSON.parse(value);
  }

  async deleteSession(sessionId: string): Promise<void> {
    const key = `session:${sessionId}`;
    await this.getClient().del(key);
    logger.debug(`Session deleted: ${sessionId}`);
  }

  async extendSession(sessionId: string, ttl: number = 1800): Promise<boolean> {
    const key = `session:${sessionId}`;
    const result = await this.getClient().expire(key, ttl);
    return result === 1;
  }

  // Cache management methods
  async setCache(key: string, value: any, ttl?: number): Promise<void> {
    const cacheKey = `cache:${key}`;
    const data = JSON.stringify(value);
    
    if (ttl) {
      await this.getClient().setex(cacheKey, ttl, data);
    } else {
      await this.getClient().set(cacheKey, data);
    }
  }

  async getCache<T = any>(key: string): Promise<T | null> {
    const cacheKey = `cache:${key}`;
    const value = await this.getClient().get(cacheKey);
    
    if (!value) {
      return null;
    }
    
    return JSON.parse(value) as T;
  }

  async deleteCache(key: string): Promise<void> {
    const cacheKey = `cache:${key}`;
    await this.getClient().del(cacheKey);
  }

  async clearCachePattern(pattern: string): Promise<void> {
    const client = this.getClient();
    
    if (this.isClusterMode) {
      // For cluster mode, we need to run the command on all nodes
      const nodes = (client as Cluster).nodes('master');
      const promises = nodes.map(async (node) => {
        const keys = await node.keys(`cache:${pattern}`);
        if (keys.length > 0) {
          await node.del(...keys);
        }
      });
      await Promise.all(promises);
    } else {
      const keys = await client.keys(`cache:${pattern}`);
      if (keys.length > 0) {
        await client.del(...keys);
      }
    }
  }

  // Rate limiting methods
  async checkRateLimit(key: string, limit: number, window: number): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
    const rateLimitKey = `rate:${key}`;
    const now = Date.now();
    const windowStart = now - window * 1000;

    const client = this.getClient();
    
    // Use sliding window rate limiting
    const pipeline = client.pipeline();
    pipeline.zremrangebyscore(rateLimitKey, '-inf', windowStart);
    pipeline.zadd(rateLimitKey, now, `${now}-${Math.random()}`);
    pipeline.zcard(rateLimitKey);
    pipeline.expire(rateLimitKey, window);
    
    const results = await pipeline.exec();
    
    if (!results) {
      throw new Error('Rate limit check failed');
    }
    
    const count = results[2][1] as number;
    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);
    const resetAt = now + window * 1000;
    
    return { allowed, remaining, resetAt };
  }

  // Distributed lock methods
  async acquireLock(resource: string, ttl: number = 10000): Promise<string | null> {
    const lockKey = `lock:${resource}`;
    const lockId = `${Date.now()}-${Math.random()}`;
    
    const result = await this.getClient().set(lockKey, lockId, 'PX', ttl, 'NX');
    
    if (result === 'OK') {
      return lockId;
    }
    
    return null;
  }

  async releaseLock(resource: string, lockId: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;
    
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    
    const result = await this.getClient().eval(script, 1, lockKey, lockId) as number;
    return result === 1;
  }

  // Real-time metrics
  async incrementCounter(key: string, value: number = 1): Promise<number> {
    const metricsKey = `metrics:${key}`;
    return await this.getClient().incrby(metricsKey, value);
  }

  async getCounter(key: string): Promise<number> {
    const metricsKey = `metrics:${key}`;
    const value = await this.getClient().get(metricsKey);
    return value ? parseInt(value, 10) : 0;
  }

  async recordMetric(key: string, value: number, timestamp?: number): Promise<void> {
    const metricsKey = `metrics:timeseries:${key}`;
    const ts = timestamp || Date.now();
    
    await this.getClient().zadd(metricsKey, ts, `${ts}:${value}`);
    
    // Keep only last 24 hours of data
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
    await this.getClient().zremrangebyscore(metricsKey, '-inf', dayAgo);
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.getClient().ping();
      return true;
    } catch (error) {
      logger.error('Redis health check failed:', error);
      return false;
    }
  }

  // Disconnect
  async disconnect(): Promise<void> {
    if (this.cluster) {
      await this.cluster.quit();
      this.cluster = null;
    }
    
    if (this.standalone) {
      await this.standalone.quit();
      this.standalone = null;
    }
    
    logger.info('Redis connection closed');
  }
}

// Export singleton instance
export const redisCluster = RedisClusterClient.getInstance();