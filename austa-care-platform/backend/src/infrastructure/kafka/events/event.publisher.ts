import { v4 as uuidv4 } from 'uuid';
import { kafkaClient } from '../kafka.client';
import { logger } from '../../../utils/logger';
import { DomainEvent } from './event.schemas';

export interface EventPublisherOptions {
  retryAttempts?: number;
  retryDelay?: number;
  enableDeadLetter?: boolean;
}

export class EventPublisher {
  private static instance: EventPublisher;
  private readonly topicPrefix: string = 'austa.care.';
  private readonly deadLetterTopic: string = 'austa.care.dead-letter';

  private constructor() {}

  static getInstance(): EventPublisher {
    if (!EventPublisher.instance) {
      EventPublisher.instance = new EventPublisher();
    }
    return EventPublisher.instance;
  }

  // Publish a single event
  async publish<T extends DomainEvent>(
    event: Omit<T, 'eventId' | 'timestamp'>,
    options: EventPublisherOptions = {}
  ): Promise<void> {
    const { retryAttempts = 3, retryDelay = 1000, enableDeadLetter = true } = options;

    const fullEvent = {
      ...event,
      eventId: uuidv4(),
      timestamp: new Date().toISOString(),
    } as T;

    const topic = this.getTopicName(fullEvent.eventType);
    const message = {
      key: this.getMessageKey(fullEvent),
      value: JSON.stringify(fullEvent),
      headers: {
        'event-type': fullEvent.eventType,
        'event-version': fullEvent.version || '1.0',
        'content-type': 'application/json',
        'correlation-id': fullEvent.correlationId || uuidv4(),
      },
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        await kafkaClient.sendMessage(topic, [message]);
        
        logger.info('Event published successfully', {
          eventType: fullEvent.eventType,
          eventId: fullEvent.eventId,
          topic,
          attempt,
        });

        // Emit metrics
        this.emitMetrics(fullEvent.eventType, 'success');
        
        return;
      } catch (error) {
        lastError = error as Error;
        logger.error(`Failed to publish event (attempt ${attempt}/${retryAttempts})`, {
          eventType: fullEvent.eventType,
          eventId: fullEvent.eventId,
          error: lastError.message,
        });

        if (attempt < retryAttempts) {
          await this.delay(retryDelay * attempt);
        }
      }
    }

    // All retries failed
    this.emitMetrics(fullEvent.eventType, 'failure');

    if (enableDeadLetter && lastError) {
      await this.publishToDeadLetter(fullEvent, lastError);
    }

    throw new Error(`Failed to publish event after ${retryAttempts} attempts: ${lastError?.message}`);
  }

  // Publish multiple events in a batch
  async publishBatch<T extends DomainEvent>(
    events: Array<Omit<T, 'eventId' | 'timestamp'>>,
    options: EventPublisherOptions = {}
  ): Promise<void> {
    const topicMessages = new Map<string, Array<{ key: string; value: string }>>();

    // Group events by topic
    for (const event of events) {
      const fullEvent = {
        ...event,
        eventId: uuidv4(),
        timestamp: new Date().toISOString(),
      } as T;

      const topic = this.getTopicName(fullEvent.eventType);
      const message = {
        key: this.getMessageKey(fullEvent),
        value: JSON.stringify(fullEvent),
      };

      if (!topicMessages.has(topic)) {
        topicMessages.set(topic, []);
      }
      topicMessages.get(topic)!.push(message);
    }

    // Send batch
    const batchData = Array.from(topicMessages.entries()).map(([topic, messages]) => ({
      topic,
      messages,
    }));

    try {
      await kafkaClient.sendBatch(batchData);
      
      logger.info('Batch events published successfully', {
        eventCount: events.length,
        topics: Array.from(topicMessages.keys()),
      });

      // Emit metrics for each event type
      events.forEach(event => this.emitMetrics(event.eventType, 'success'));
    } catch (error) {
      logger.error('Failed to publish batch events', {
        eventCount: events.length,
        error: (error as Error).message,
      });

      events.forEach(event => this.emitMetrics(event.eventType, 'failure'));
      
      throw error;
    }
  }

  // Publish event with transaction support
  async publishTransactional<T extends DomainEvent>(
    events: Array<Omit<T, 'eventId' | 'timestamp'>>,
    transactionId: string
  ): Promise<void> {
    // TODO: Implement transactional event publishing
    // This requires producer transaction support
    throw new Error('Transactional publishing not yet implemented');
  }

  // Get topic name from event type
  private getTopicName(eventType: string): string {
    // Convert event type to topic name
    // e.g., "user.registered" -> "austa.care.user.registered"
    return `${this.topicPrefix}${eventType}`;
  }

  // Get message key for partitioning
  private getMessageKey(event: DomainEvent): string {
    // Use appropriate key based on event type for proper partitioning
    if ('data' in event) {
      if ('userId' in event.data) {
        return String(event.data.userId);
      }
      if ('conversationId' in event.data) {
        return String(event.data.conversationId);
      }
      if ('authorizationId' in event.data) {
        return String(event.data.authorizationId);
      }
    }
    
    return event.eventId;
  }

  // Publish to dead letter queue
  private async publishToDeadLetter(event: DomainEvent, error: Error): Promise<void> {
    try {
      const deadLetterMessage = {
        key: event.eventId,
        value: JSON.stringify({
          originalEvent: event,
          error: {
            message: error.message,
            stack: error.stack,
            timestamp: new Date().toISOString(),
          },
          metadata: {
            originalTopic: this.getTopicName(event.eventType),
            retryCount: 3,
          },
        }),
        headers: {
          'original-event-type': event.eventType,
          'error-type': error.name,
        },
      };

      await kafkaClient.sendMessage(this.deadLetterTopic, [deadLetterMessage]);
      
      logger.warn('Event published to dead letter queue', {
        eventType: event.eventType,
        eventId: event.eventId,
      });
    } catch (deadLetterError) {
      logger.error('Failed to publish to dead letter queue', {
        eventType: event.eventType,
        eventId: event.eventId,
        error: (deadLetterError as Error).message,
      });
    }
  }

  // Emit metrics for monitoring
  private emitMetrics(eventType: string, status: 'success' | 'failure'): void {
    // TODO: Integrate with Prometheus metrics
    // For now, just log
    logger.debug('Event metrics', {
      eventType,
      status,
      timestamp: new Date().toISOString(),
    });
  }

  // Helper to delay execution
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const eventPublisher = EventPublisher.getInstance();