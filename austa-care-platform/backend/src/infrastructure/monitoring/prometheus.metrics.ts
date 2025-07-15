import { register, Counter, Histogram, Gauge, Summary, collectDefaultMetrics } from 'prom-client';
import { logger } from '../../utils/logger';

// Define metric types
interface MetricLabels {
  [key: string]: string | number;
}

export class PrometheusMetrics {
  private static instance: PrometheusMetrics;

  // HTTP Metrics
  public httpRequestDuration: Histogram<string>;
  public httpRequestsTotal: Counter<string>;
  public httpRequestsInProgress: Gauge<string>;
  public httpRequestSize: Histogram<string>;
  public httpResponseSize: Histogram<string>;

  // WebSocket Metrics
  public wsConnectionsTotal: Counter<string>;
  public wsConnectionsActive: Gauge<string>;
  public wsMessagesTotal: Counter<string>;
  public wsMessageSize: Histogram<string>;

  // Business Metrics
  public conversationsTotal: Counter<string>;
  public conversationsActive: Gauge<string>;
  public messagesProcessed: Counter<string>;
  public authorizationsTotal: Counter<string>;
  public authorizationDuration: Histogram<string>;

  // AI/ML Metrics
  public aiPredictionsTotal: Counter<string>;
  public aiPredictionDuration: Histogram<string>;
  public aiModelAccuracy: Gauge<string>;
  public aiTokensUsed: Counter<string>;

  // Health Metrics
  public healthRiskScoresCalculated: Counter<string>;
  public healthAlertsGenerated: Counter<string>;
  public patientEngagementScore: Gauge<string>;

  // Integration Metrics
  public whatsappMessagesTotal: Counter<string>;
  public whatsappMessageLatency: Histogram<string>;
  public tasyAPICallsTotal: Counter<string>;
  public tasyAPILatency: Histogram<string>;
  public fhirOperationsTotal: Counter<string>;
  public fhirOperationDuration: Histogram<string>;

  // Infrastructure Metrics
  public kafkaProducedMessages: Counter<string>;
  public kafkaConsumedMessages: Counter<string>;
  public kafkaLag: Gauge<string>;
  public redisOperations: Counter<string>;
  public redisLatency: Histogram<string>;
  public mongoOperations: Counter<string>;
  public mongoLatency: Histogram<string>;

  // Error Metrics
  public errorsTotal: Counter<string>;
  public unhandledExceptions: Counter<string>;
  public validationErrors: Counter<string>;

  // Performance Metrics
  public eventLoopLag: Histogram<string>;
  public memoryUsage: Gauge<string>;
  public cpuUsage: Gauge<string>;
  public gcDuration: Histogram<string>;

  private constructor() {
    // Initialize HTTP metrics
    this.httpRequestDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    this.httpRequestsTotal = new Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
    });

    this.httpRequestsInProgress = new Gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests in progress',
      labelNames: ['method', 'route'],
    });

    this.httpRequestSize = new Histogram({
      name: 'http_request_size_bytes',
      help: 'Size of HTTP requests in bytes',
      labelNames: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
    });

    this.httpResponseSize = new Histogram({
      name: 'http_response_size_bytes',
      help: 'Size of HTTP responses in bytes',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
    });

    // Initialize WebSocket metrics
    this.wsConnectionsTotal = new Counter({
      name: 'websocket_connections_total',
      help: 'Total number of WebSocket connections',
      labelNames: ['event'],
    });

    this.wsConnectionsActive = new Gauge({
      name: 'websocket_connections_active',
      help: 'Number of active WebSocket connections',
    });

    this.wsMessagesTotal = new Counter({
      name: 'websocket_messages_total',
      help: 'Total number of WebSocket messages',
      labelNames: ['direction', 'event'],
    });

    this.wsMessageSize = new Histogram({
      name: 'websocket_message_size_bytes',
      help: 'Size of WebSocket messages in bytes',
      labelNames: ['direction', 'event'],
      buckets: [100, 1000, 10000, 100000, 1000000],
    });

    // Initialize Business metrics
    this.conversationsTotal = new Counter({
      name: 'conversations_total',
      help: 'Total number of conversations',
      labelNames: ['type', 'channel', 'status'],
    });

    this.conversationsActive = new Gauge({
      name: 'conversations_active',
      help: 'Number of active conversations',
      labelNames: ['type', 'channel'],
    });

    this.messagesProcessed = new Counter({
      name: 'messages_processed_total',
      help: 'Total number of messages processed',
      labelNames: ['type', 'direction', 'channel'],
    });

    this.authorizationsTotal = new Counter({
      name: 'authorizations_total',
      help: 'Total number of authorization requests',
      labelNames: ['type', 'status', 'urgency'],
    });

    this.authorizationDuration = new Histogram({
      name: 'authorization_duration_seconds',
      help: 'Duration of authorization processing in seconds',
      labelNames: ['type', 'status'],
      buckets: [10, 30, 60, 300, 600, 1800, 3600],
    });

    // Initialize AI/ML metrics
    this.aiPredictionsTotal = new Counter({
      name: 'ai_predictions_total',
      help: 'Total number of AI predictions',
      labelNames: ['model', 'type', 'status'],
    });

    this.aiPredictionDuration = new Histogram({
      name: 'ai_prediction_duration_seconds',
      help: 'Duration of AI predictions in seconds',
      labelNames: ['model', 'type'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    this.aiModelAccuracy = new Gauge({
      name: 'ai_model_accuracy',
      help: 'Accuracy of AI models',
      labelNames: ['model', 'version'],
    });

    this.aiTokensUsed = new Counter({
      name: 'ai_tokens_used_total',
      help: 'Total number of AI tokens used',
      labelNames: ['model', 'operation'],
    });

    // Initialize Health metrics
    this.healthRiskScoresCalculated = new Counter({
      name: 'health_risk_scores_calculated_total',
      help: 'Total number of health risk scores calculated',
      labelNames: ['risk_level', 'condition'],
    });

    this.healthAlertsGenerated = new Counter({
      name: 'health_alerts_generated_total',
      help: 'Total number of health alerts generated',
      labelNames: ['type', 'severity', 'condition'],
    });

    this.patientEngagementScore = new Gauge({
      name: 'patient_engagement_score',
      help: 'Average patient engagement score',
      labelNames: ['segment', 'cohort'],
    });

    // Initialize Integration metrics
    this.whatsappMessagesTotal = new Counter({
      name: 'whatsapp_messages_total',
      help: 'Total number of WhatsApp messages',
      labelNames: ['direction', 'type', 'status'],
    });

    this.whatsappMessageLatency = new Histogram({
      name: 'whatsapp_message_latency_seconds',
      help: 'Latency of WhatsApp message delivery in seconds',
      labelNames: ['direction', 'type'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
    });

    this.tasyAPICallsTotal = new Counter({
      name: 'tasy_api_calls_total',
      help: 'Total number of Tasy API calls',
      labelNames: ['operation', 'status'],
    });

    this.tasyAPILatency = new Histogram({
      name: 'tasy_api_latency_seconds',
      help: 'Latency of Tasy API calls in seconds',
      labelNames: ['operation'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
    });

    this.fhirOperationsTotal = new Counter({
      name: 'fhir_operations_total',
      help: 'Total number of FHIR operations',
      labelNames: ['resource', 'operation', 'status'],
    });

    this.fhirOperationDuration = new Histogram({
      name: 'fhir_operation_duration_seconds',
      help: 'Duration of FHIR operations in seconds',
      labelNames: ['resource', 'operation'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
    });

    // Initialize Infrastructure metrics
    this.kafkaProducedMessages = new Counter({
      name: 'kafka_produced_messages_total',
      help: 'Total number of messages produced to Kafka',
      labelNames: ['topic', 'status'],
    });

    this.kafkaConsumedMessages = new Counter({
      name: 'kafka_consumed_messages_total',
      help: 'Total number of messages consumed from Kafka',
      labelNames: ['topic', 'consumer_group', 'status'],
    });

    this.kafkaLag = new Gauge({
      name: 'kafka_consumer_lag',
      help: 'Kafka consumer lag',
      labelNames: ['topic', 'partition', 'consumer_group'],
    });

    this.redisOperations = new Counter({
      name: 'redis_operations_total',
      help: 'Total number of Redis operations',
      labelNames: ['operation', 'status'],
    });

    this.redisLatency = new Histogram({
      name: 'redis_latency_seconds',
      help: 'Latency of Redis operations in seconds',
      labelNames: ['operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
    });

    this.mongoOperations = new Counter({
      name: 'mongo_operations_total',
      help: 'Total number of MongoDB operations',
      labelNames: ['collection', 'operation', 'status'],
    });

    this.mongoLatency = new Histogram({
      name: 'mongo_latency_seconds',
      help: 'Latency of MongoDB operations in seconds',
      labelNames: ['collection', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    // Initialize Error metrics
    this.errorsTotal = new Counter({
      name: 'errors_total',
      help: 'Total number of errors',
      labelNames: ['type', 'severity', 'component'],
    });

    this.unhandledExceptions = new Counter({
      name: 'unhandled_exceptions_total',
      help: 'Total number of unhandled exceptions',
      labelNames: ['type'],
    });

    this.validationErrors = new Counter({
      name: 'validation_errors_total',
      help: 'Total number of validation errors',
      labelNames: ['entity', 'field'],
    });

    // Initialize Performance metrics
    this.eventLoopLag = new Histogram({
      name: 'nodejs_event_loop_lag_seconds',
      help: 'Node.js event loop lag in seconds',
      buckets: [0.001, 0.01, 0.05, 0.1, 0.5, 1],
    });

    this.memoryUsage = new Gauge({
      name: 'nodejs_memory_usage_bytes',
      help: 'Node.js memory usage in bytes',
      labelNames: ['type'],
    });

    this.cpuUsage = new Gauge({
      name: 'nodejs_cpu_usage_percentage',
      help: 'Node.js CPU usage percentage',
      labelNames: ['type'],
    });

    this.gcDuration = new Histogram({
      name: 'nodejs_gc_duration_seconds',
      help: 'Node.js garbage collection duration in seconds',
      labelNames: ['type'],
      buckets: [0.001, 0.01, 0.1, 1, 2, 5],
    });

    // Start collecting default metrics
    this.collectDefaultMetrics();
    
    // Start custom metrics collection
    this.startCustomMetricsCollection();
    
    logger.info('Prometheus metrics initialized');
  }

  static getInstance(): PrometheusMetrics {
    if (!PrometheusMetrics.instance) {
      PrometheusMetrics.instance = new PrometheusMetrics();
    }
    return PrometheusMetrics.instance;
  }

  // Collect default Node.js metrics
  private collectDefaultMetrics(): void {
    collectDefaultMetrics({
      prefix: 'austa_',
      gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
      register,
    });
  }

  // Start custom metrics collection
  private startCustomMetricsCollection(): void {
    // Collect event loop lag
    let lastCheck = process.hrtime.bigint();
    setInterval(() => {
      const now = process.hrtime.bigint();
      const lag = Number(now - lastCheck) / 1e9 - 5; // Subtract interval duration
      if (lag > 0) {
        this.eventLoopLag.observe(lag);
      }
      lastCheck = now;
    }, 5000);

    // Collect memory usage
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.labels('rss').set(memUsage.rss);
      this.memoryUsage.labels('heapTotal').set(memUsage.heapTotal);
      this.memoryUsage.labels('heapUsed').set(memUsage.heapUsed);
      this.memoryUsage.labels('external').set(memUsage.external);
    }, 10000);

    // Collect CPU usage
    let lastCpuUsage = process.cpuUsage();
    setInterval(() => {
      const currentCpuUsage = process.cpuUsage(lastCpuUsage);
      const totalUsage = (currentCpuUsage.user + currentCpuUsage.system) / 1e6; // Convert to seconds
      const percentage = (totalUsage / 10) * 100; // 10 second interval
      
      this.cpuUsage.labels('user').set((currentCpuUsage.user / 1e6 / 10) * 100);
      this.cpuUsage.labels('system').set((currentCpuUsage.system / 1e6 / 10) * 100);
      this.cpuUsage.labels('total').set(percentage);
      
      lastCpuUsage = process.cpuUsage();
    }, 10000);
  }

  // Get all metrics
  async getMetrics(): Promise<string> {
    return register.metrics();
  }

  // Get content type
  getContentType(): string {
    return register.contentType;
  }

  // Clear all metrics
  clear(): void {
    register.clear();
  }

  // Helper methods for common metric operations
  recordHttpRequest(method: string, route: string, statusCode: number, duration: number, requestSize?: number, responseSize?: number): void {
    const labels = { method, route, status_code: statusCode.toString() };
    
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDuration.observe(labels, duration);
    
    if (requestSize) {
      this.httpRequestSize.observe({ method, route }, requestSize);
    }
    
    if (responseSize) {
      this.httpResponseSize.observe(labels, responseSize);
    }
  }

  recordAIPrediction(model: string, type: string, duration: number, success: boolean, tokensUsed?: number): void {
    const status = success ? 'success' : 'failure';
    
    this.aiPredictionsTotal.inc({ model, type, status });
    this.aiPredictionDuration.observe({ model, type }, duration);
    
    if (tokensUsed) {
      this.aiTokensUsed.inc({ model, operation: 'prediction' }, tokensUsed);
    }
  }

  recordBusinessMetric(metric: string, labels: MetricLabels, value?: number): void {
    switch (metric) {
      case 'conversation_started':
        this.conversationsTotal.inc(labels);
        this.conversationsActive.inc(labels);
        break;
      case 'conversation_ended':
        this.conversationsActive.dec(labels);
        break;
      case 'message_processed':
        this.messagesProcessed.inc(labels);
        break;
      case 'authorization_requested':
        this.authorizationsTotal.inc(labels);
        break;
      case 'health_risk_calculated':
        this.healthRiskScoresCalculated.inc(labels);
        break;
      case 'health_alert_generated':
        this.healthAlertsGenerated.inc(labels);
        break;
      case 'engagement_score':
        if (value !== undefined) {
          this.patientEngagementScore.set(labels, value);
        }
        break;
    }
  }

  recordError(type: string, severity: string, component: string): void {
    this.errorsTotal.inc({ type, severity, component });
  }
}

// Export singleton instance
export const metrics = PrometheusMetrics.getInstance();