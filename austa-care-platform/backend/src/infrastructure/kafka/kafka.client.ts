import { Kafka, Producer, Consumer, Admin, logLevel, SASLOptions } from 'kafkajs';
import { logger } from '../../utils/logger';
import { config } from '../../config/config';

// Kafka client configuration
export class KafkaClient {
  private kafka: Kafka;
  private producer: Producer | null = null;
  private consumers: Map<string, Consumer> = new Map();
  private admin: Admin | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.kafka = new Kafka({
      clientId: 'austa-care-platform',
      brokers: config.kafka?.brokers || ['localhost:9092'],
      logLevel: logLevel.INFO,
      ssl: config.kafka?.ssl || false,
      sasl: config.kafka?.sasl as SASLOptions || undefined,
      connectionTimeout: 30000,
      retry: {
        initialRetryTime: 100,
        retries: 10,
        maxRetryTime: 30000,
        factor: 2,
      },
    });
  }

  // Initialize producer
  async connectProducer(): Promise<void> {
    if (!this.producer) {
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: false,
        idempotent: true,
        maxInFlightRequests: 5,
        transactionalId: 'austa-producer',
      });

      await this.producer.connect();
      logger.info('Kafka producer connected successfully');
    }
  }

  // Initialize consumer
  async connectConsumer(groupId: string, topics: string[]): Promise<Consumer> {
    const consumer = this.kafka.consumer({
      groupId,
      sessionTimeout: 30000,
      heartbeatInterval: 3000,
      maxBytesPerPartition: 1048576, // 1MB
      retry: {
        initialRetryTime: 100,
        retries: 10,
      },
    });

    await consumer.connect();
    await consumer.subscribe({ topics, fromBeginning: false });
    
    this.consumers.set(groupId, consumer);
    logger.info(`Kafka consumer ${groupId} connected and subscribed to topics: ${topics.join(', ')}`);
    
    return consumer;
  }

  // Initialize admin client
  async connectAdmin(): Promise<void> {
    if (!this.admin) {
      this.admin = this.kafka.admin();
      await this.admin.connect();
      logger.info('Kafka admin client connected successfully');
    }
  }

  // Create topics if they don't exist
  async createTopics(topics: Array<{ topic: string; numPartitions?: number; replicationFactor?: number }>): Promise<void> {
    await this.connectAdmin();
    
    const topicList = topics.map(({ topic, numPartitions = 3, replicationFactor = 2 }) => ({
      topic,
      numPartitions,
      replicationFactor,
      configEntries: [
        { name: 'retention.ms', value: '604800000' }, // 7 days
        { name: 'compression.type', value: 'gzip' },
        { name: 'max.message.bytes', value: '1048576' }, // 1MB
      ],
    }));

    try {
      await this.admin!.createTopics({
        topics: topicList,
        waitForLeaders: true,
      });
      logger.info(`Topics created successfully: ${topics.map(t => t.topic).join(', ')}`);
    } catch (error: any) {
      if (error.type !== 'TOPIC_ALREADY_EXISTS') {
        throw error;
      }
      logger.info('Topics already exist');
    }
  }

  // Send message to topic
  async sendMessage(topic: string, messages: Array<{ key?: string; value: string; headers?: Record<string, string> }>): Promise<void> {
    if (!this.producer) {
      await this.connectProducer();
    }

    const kafkaMessages = messages.map(msg => ({
      key: msg.key || null,
      value: msg.value,
      headers: msg.headers || {},
      timestamp: Date.now().toString(),
    }));

    await this.producer!.send({
      topic,
      messages: kafkaMessages,
      acks: -1, // Wait for all replicas
      timeout: 30000,
      compression: 1, // gzip
    });

    logger.debug(`Message sent to topic ${topic}`);
  }

  // Send batch messages
  async sendBatch(topicMessages: Array<{ topic: string; messages: Array<{ key?: string; value: string }> }>): Promise<void> {
    if (!this.producer) {
      await this.connectProducer();
    }

    await this.producer!.sendBatch({
      topicMessages: topicMessages.map(tm => ({
        topic: tm.topic,
        messages: tm.messages.map(msg => ({
          key: msg.key || null,
          value: msg.value,
          timestamp: Date.now().toString(),
        })),
      })),
      acks: -1,
      timeout: 30000,
      compression: 1,
    });

    logger.debug(`Batch messages sent to ${topicMessages.length} topics`);
  }

  // Get consumer by group ID
  getConsumer(groupId: string): Consumer | undefined {
    return this.consumers.get(groupId);
  }

  // Disconnect all clients
  async disconnect(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    if (this.producer) {
      disconnectPromises.push(this.producer.disconnect());
    }

    for (const [groupId, consumer] of this.consumers) {
      disconnectPromises.push(consumer.disconnect());
      logger.info(`Disconnecting consumer ${groupId}`);
    }

    if (this.admin) {
      disconnectPromises.push(this.admin.disconnect());
    }

    await Promise.all(disconnectPromises);
    
    this.producer = null;
    this.consumers.clear();
    this.admin = null;
    this.isConnected = false;
    
    logger.info('All Kafka clients disconnected');
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      await this.connectAdmin();
      const metadata = await this.admin!.fetchTopicMetadata();
      return metadata.topics.length >= 0;
    } catch (error) {
      logger.error('Kafka health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
export const kafkaClient = new KafkaClient();