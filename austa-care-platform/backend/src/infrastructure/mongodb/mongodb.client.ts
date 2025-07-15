import { MongoClient, Db, Collection, MongoClientOptions, GridFSBucket, Document } from 'mongodb';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

export interface MongoDBConfig {
  uri: string;
  database: string;
  options?: MongoClientOptions;
}

export class MongoDBClient {
  private static instance: MongoDBClient;
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private gridFSBucket: GridFSBucket | null = null;
  private isConnected: boolean = false;

  private readonly defaultOptions: MongoClientOptions = {
    maxPoolSize: 100,
    minPoolSize: 10,
    maxIdleTimeMS: 10000,
    waitQueueTimeoutMS: 5000,
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    serverSelectionTimeoutMS: 5000,
    compressors: ['snappy', 'zlib'],
    retryWrites: true,
    retryReads: true,
    w: 'majority',
    readPreference: 'primaryPreferred',
  };

  private constructor() {}

  static getInstance(): MongoDBClient {
    if (!MongoDBClient.instance) {
      MongoDBClient.instance = new MongoDBClient();
    }
    return MongoDBClient.instance;
  }

  // Connect to MongoDB
  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('MongoDB client is already connected');
      return;
    }

    try {
      const mongoConfig: MongoDBConfig = {
        uri: config.mongodb?.uri || 'mongodb://localhost:27017',
        database: config.mongodb?.database || 'austa_care',
        options: this.defaultOptions,
      };

      this.client = new MongoClient(mongoConfig.uri, mongoConfig.options);
      
      await this.client.connect();
      
      this.db = this.client.db(mongoConfig.database);
      this.gridFSBucket = new GridFSBucket(this.db, {
        bucketName: 'documents',
        chunkSizeBytes: 255 * 1024, // 255KB chunks
      });
      
      this.isConnected = true;
      
      // Setup event handlers
      this.setupEventHandlers();
      
      // Create indexes
      await this.createIndexes();
      
      logger.info('MongoDB connection established successfully', {
        database: mongoConfig.database,
      });
    } catch (error) {
      logger.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  // Setup event handlers
  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('error', (error) => {
      logger.error('MongoDB client error:', error);
    });

    this.client.on('timeout', () => {
      logger.error('MongoDB client timeout');
    });

    this.client.on('close', () => {
      logger.warn('MongoDB client connection closed');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      logger.info('MongoDB client reconnected');
      this.isConnected = true;
    });
  }

  // Create indexes for collections
  private async createIndexes(): Promise<void> {
    if (!this.db) return;

    try {
      // Conversations collection indexes
      const conversations = this.db.collection('conversations');
      await conversations.createIndexes([
        { key: { userId: 1, createdAt: -1 } },
        { key: { whatsappChatId: 1 }, unique: true },
        { key: { status: 1, lastMessageAt: -1 } },
        { key: { healthTopics: 1 } },
        { key: { createdAt: -1 } },
        { key: { 'aiContext.intent': 1 } },
      ]);

      // Documents collection indexes
      const documents = this.db.collection('documents');
      await documents.createIndexes([
        { key: { userId: 1, type: 1 } },
        { key: { hasOcr: 1, processedAt: 1 } },
        { key: { healthKeywords: 1 } },
        { key: { uploadedAt: -1 } },
        { key: { 'metadata.documentId': 1 }, unique: true, sparse: true },
      ]);

      // AI training data collection indexes
      const aiTrainingData = this.db.collection('ai_training_data');
      await aiTrainingData.createIndexes([
        { key: { modelName: 1, version: 1 } },
        { key: { dataType: 1, createdAt: -1 } },
        { key: { 'metadata.accuracy': -1 } },
        { key: { isActive: 1 } },
      ]);

      // Knowledge base collection indexes
      const knowledgeBase = this.db.collection('knowledge_base');
      await knowledgeBase.createIndexes([
        { key: { category: 1, topic: 1 } },
        { key: { tags: 1 } },
        { key: { '$**': 'text' } }, // Text index for full-text search
        { key: { lastUpdated: -1 } },
      ]);

      // Templates collection indexes
      const templates = this.db.collection('templates');
      await templates.createIndexes([
        { key: { type: 1, language: 1 } },
        { key: { category: 1, isActive: 1 } },
        { key: { name: 1 }, unique: true },
      ]);

      logger.info('MongoDB indexes created successfully');
    } catch (error) {
      logger.error('Failed to create MongoDB indexes:', error);
    }
  }

  // Get database instance
  getDatabase(): Db {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db;
  }

  // Get collection
  getCollection<T extends Document = Document>(name: string): Collection<T> {
    if (!this.db) {
      throw new Error('MongoDB not connected');
    }
    return this.db.collection<T>(name);
  }

  // Get GridFS bucket for file storage
  getGridFSBucket(): GridFSBucket {
    if (!this.gridFSBucket) {
      throw new Error('GridFS bucket not initialized');
    }
    return this.gridFSBucket;
  }

  // Helper methods for common operations

  // Find documents with pagination
  async findWithPagination<T extends Document = Document>(
    collectionName: string,
    filter: any = {},
    options: {
      page?: number;
      limit?: number;
      sort?: any;
      projection?: any;
    } = {}
  ): Promise<{ data: (T & { _id: any })[]; total: number; page: number; pages: number }> {
    const collection = this.getCollection<T>(collectionName);
    
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;
    
    const [data, total] = await Promise.all([
      collection
        .find(filter, { projection: options.projection })
        .sort(options.sort || { _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    
    return {
      data: data as (T & { _id: any })[],
      total,
      page,
      pages: Math.ceil(total / limit),
    };
  }

  // Aggregate with cursor
  async aggregateWithCursor<T extends Document = Document>(
    collectionName: string,
    pipeline: any[],
    options: { batchSize?: number } = {}
  ): Promise<T[]> {
    const collection = this.getCollection<T>(collectionName);
    
    const cursor = collection.aggregate<T>(pipeline, {
      cursor: { batchSize: options.batchSize || 100 },
      allowDiskUse: true,
    });
    
    const results: T[] = [];
    
    for await (const doc of cursor) {
      results.push(doc);
    }
    
    return results;
  }

  // Bulk write operations
  async bulkWrite<T extends Document = Document>(
    collectionName: string,
    operations: any[],
    options: { ordered?: boolean } = {}
  ): Promise<any> {
    const collection = this.getCollection<T>(collectionName);
    
    return await collection.bulkWrite(operations, {
      ordered: options.ordered ?? true,
    });
  }

  // Text search
  async textSearch<T extends Document = Document>(
    collectionName: string,
    searchText: string,
    filter: any = {},
    options: { limit?: number; language?: string } = {}
  ): Promise<T[]> {
    const collection = this.getCollection<T>(collectionName);
    
    const searchFilter = {
      ...filter,
      $text: {
        $search: searchText,
        $language: options.language || 'portuguese',
      },
    };
    
    const results = await collection
      .find(searchFilter, {
        projection: { score: { $meta: 'textScore' } },
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(options.limit || 50)
      .toArray();
    
    return results as T[];
  }

  // Change stream for real-time updates
  createChangeStream(
    collectionName: string,
    pipeline: any[] = [],
    options: any = {}
  ) {
    const collection = this.getCollection(collectionName);
    
    return collection.watch(pipeline, {
      fullDocument: 'updateLookup',
      ...options,
    });
  }

  // Transaction support
  async withTransaction<T>(
    callback: (session: any) => Promise<T>
  ): Promise<T> {
    if (!this.client) {
      throw new Error('MongoDB client not connected');
    }
    
    const session = this.client.startSession();
    
    try {
      const result = await session.withTransaction(callback, {
        readConcern: { level: 'majority' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary',
      });
      
      return result;
    } finally {
      await session.endSession();
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.client || !this.db) {
        return false;
      }
      
      await this.db.admin().ping();
      return true;
    } catch (error) {
      logger.error('MongoDB health check failed:', error);
      return false;
    }
  }

  // Disconnect
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.gridFSBucket = null;
      this.isConnected = false;
      logger.info('MongoDB connection closed');
    }
  }
}

// Export singleton instance
export const mongoDBClient = MongoDBClient.getInstance();