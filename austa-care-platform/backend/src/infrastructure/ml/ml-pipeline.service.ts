import * as tf from '@tensorflow/tfjs-node';
import { logger } from '../../utils/logger';
import { mongoDBClient } from '../mongodb/mongodb.client';
import { redisCluster } from '../redis/redis.cluster';
import { eventPublisher } from '../kafka/events/event.publisher';
import { OpenAI } from '@langchain/openai';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

export interface MLModel {
  id: string;
  name: string;
  version: string;
  type: 'tensorflow' | 'openai' | 'custom';
  path?: string;
  config: any;
  metrics?: {
    accuracy?: number;
    f1Score?: number;
    precision?: number;
    recall?: number;
    auc?: number;
  };
}

export interface PredictionRequest {
  requestId?: string;
  modelId: string;
  userId?: string;
  input: any;
  features?: any; // Alias for input for ML models
  options?: {
    threshold?: number;
    topK?: number;
    temperature?: number;
  };
}

export interface PredictionResult {
  modelId: string;
  prediction: any;
  confidence: number;
  metadata?: {
    processingTime: number;
    modelVersion: string;
    timestamp: string;
  };
}

export class MLPipelineService {
  private static instance: MLPipelineService;
  private models: Map<string, tf.LayersModel | ChatOpenAI> = new Map();
  private modelConfigs: Map<string, MLModel> = new Map();
  private featureStore: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): MLPipelineService {
    if (!MLPipelineService.instance) {
      MLPipelineService.instance = new MLPipelineService();
    }
    return MLPipelineService.instance;
  }

  // Initialize ML pipeline
  async initialize(): Promise<void> {
    try {
      // Load model configurations from database
      await this.loadModelConfigurations();

      // Initialize feature store
      await this.initializeFeatureStore();

      // Load pre-trained models
      await this.loadPretrainedModels();

      logger.info('ML Pipeline initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize ML Pipeline:', error);
      throw error;
    }
  }

  // Load model configurations from database
  private async loadModelConfigurations(): Promise<void> {
    const modelsCollection = mongoDBClient.getCollection<MLModel>('ml_models');
    const models = await modelsCollection.find({ isActive: true }).toArray();

    for (const model of models) {
      this.modelConfigs.set(model.id, model);
      logger.info(`Loaded model configuration: ${model.name} v${model.version}`);
    }
  }

  // Initialize feature store
  private async initializeFeatureStore(): Promise<void> {
    // Load frequently used features into memory
    const featuresCollection = mongoDBClient.getCollection('ml_features');
    const features = await featuresCollection.find({ 
      frequency: { $gt: 100 },
      lastUsed: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    }).toArray();

    for (const feature of features) {
      this.featureStore.set(feature.key, feature.data);
    }

    logger.info(`Feature store initialized with ${features.length} features`);
  }

  // Load pre-trained models
  private async loadPretrainedModels(): Promise<void> {
    const modelPromises = Array.from(this.modelConfigs.values()).map(async (modelConfig) => {
      try {
        if (modelConfig.type === 'tensorflow' && modelConfig.path) {
          const model = await tf.loadLayersModel(modelConfig.path);
          this.models.set(modelConfig.id, model);
          logger.info(`Loaded TensorFlow model: ${modelConfig.name}`);
        } else if (modelConfig.type === 'openai') {
          const model = new ChatOpenAI({
            modelName: modelConfig.config.modelName || 'gpt-4-turbo',
            temperature: modelConfig.config.temperature || 0.7,
            maxTokens: modelConfig.config.maxTokens || 2048,
          });
          this.models.set(modelConfig.id, model);
          logger.info(`Initialized OpenAI model: ${modelConfig.name}`);
        }
      } catch (error) {
        logger.error(`Failed to load model ${modelConfig.name}:`, error);
      }
    });

    await Promise.all(modelPromises);
  }

  // Make prediction
  async predict(request: PredictionRequest): Promise<PredictionResult> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `prediction:${request.modelId}:${JSON.stringify(request.input)}`;
      const cachedResult = await redisCluster.getCache<PredictionResult>(cacheKey);
      
      if (cachedResult) {
        logger.debug('Returning cached prediction');
        return cachedResult;
      }

      // Get model
      const model = this.models.get(request.modelId);
      const modelConfig = this.modelConfigs.get(request.modelId);

      if (!model || !modelConfig) {
        throw new Error(`Model ${request.modelId} not found`);
      }

      let prediction: any;
      let confidence: number;

      // Make prediction based on model type
      if (modelConfig.type === 'tensorflow') {
        const tfModel = model as tf.LayersModel;
        const inputTensor = this.preprocessInput(request.input, modelConfig);
        const output = tfModel.predict(inputTensor) as tf.Tensor;
        const outputData = await output.data();
        
        prediction = this.postprocessOutput(outputData, modelConfig, request.options);
        confidence = this.calculateConfidence(outputData);
        
        // Clean up tensors
        inputTensor.dispose();
        output.dispose();
      } else if (modelConfig.type === 'openai') {
        const openaiModel = model as ChatOpenAI;
        const response = await this.makeLLMPrediction(openaiModel, request, modelConfig);
        prediction = response.prediction;
        confidence = response.confidence;
      } else {
        throw new Error(`Unsupported model type: ${modelConfig.type}`);
      }

      const result: PredictionResult = {
        modelId: request.modelId,
        prediction,
        confidence,
        metadata: {
          processingTime: Date.now() - startTime,
          modelVersion: modelConfig.version,
          timestamp: new Date().toISOString(),
        },
      };

      // Cache result
      await redisCluster.setCache(cacheKey, result, 3600); // 1 hour cache

      // Emit prediction event
      await eventPublisher.publish({
        eventType: 'ml.prediction.completed',
        source: 'ml-pipeline',
        version: '1.0',
        data: {
          modelId: request.modelId,
          predictionId: request.requestId || 'unknown',
          userId: request.userId || 'system',
          input: request.features || request.input,
          prediction: result.prediction,
          confidence,
        },
      });

      // Log prediction for monitoring
      await this.logPrediction(request, result);

      return result;
    } catch (error) {
      logger.error('Prediction failed:', error);
      
      await eventPublisher.publish({
        eventType: 'ml.prediction.failed',
        source: 'ml-pipeline',
        version: '1.0',
        data: {
          modelId: request.modelId,
          predictionId: request.requestId || 'unknown',
          userId: request.userId || 'system',
          error: (error as Error).message,
          input: request.features || request.input,
        },
      });

      throw error;
    }
  }

  // Preprocess input for TensorFlow models
  private preprocessInput(input: any, modelConfig: MLModel): tf.Tensor {
    // Implement preprocessing based on model requirements
    const preprocessor = modelConfig.config.preprocessor;
    
    if (preprocessor?.type === 'normalize') {
      const mean = preprocessor.mean || 0;
      const std = preprocessor.std || 1;
      const tensor = tf.tensor(input);
      return tensor.sub(mean).div(std);
    }
    
    if (preprocessor?.type === 'tokenize') {
      // Tokenization for text models
      // Implementation depends on specific tokenizer
    }
    
    // Default: return as tensor
    return tf.tensor(input);
  }

  // Postprocess output
  private postprocessOutput(output: Float32Array | Int32Array | Uint8Array, modelConfig: MLModel, options?: any): any {
    const postprocessor = modelConfig.config.postprocessor;
    
    if (postprocessor?.type === 'classification') {
      const classes = postprocessor.classes || [];
      const topK = options?.topK || 1;
      
      // Get top K predictions
      const sortedIndices = Array.from(output)
        .map((value, index) => ({ value, index }))
        .sort((a, b) => b.value - a.value)
        .slice(0, topK);
      
      if (topK === 1) {
        return {
          class: classes[sortedIndices[0].index] || sortedIndices[0].index,
          probability: sortedIndices[0].value,
        };
      }
      
      return sortedIndices.map(item => ({
        class: classes[item.index] || item.index,
        probability: item.value,
      }));
    }
    
    if (postprocessor?.type === 'regression') {
      return output[0];
    }
    
    // Default: return raw output
    return Array.from(output);
  }

  // Calculate confidence score
  private calculateConfidence(output: Float32Array | Int32Array | Uint8Array): number {
    const values = Array.from(output);
    
    // For classification: use max probability
    if (values.length > 1) {
      return Math.max(...values);
    }
    
    // For single output: map to 0-1 range
    return Math.min(Math.max(values[0], 0), 1);
  }

  // Make LLM prediction
  private async makeLLMPrediction(model: ChatOpenAI, request: PredictionRequest, modelConfig: MLModel): Promise<{ prediction: any; confidence: number }> {
    const systemPrompt = modelConfig.config.systemPrompt || 'You are a helpful medical AI assistant.';
    const temperature = request.options?.temperature || modelConfig.config.temperature || 0.7;

    const messages = [
      new SystemMessage(systemPrompt),
      new HumanMessage(JSON.stringify(request.input)),
    ];

    const response = await model.invoke(messages);

    // Parse response and extract prediction
    const content = response.content.toString();
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content);
      return {
        prediction: parsed.prediction || parsed,
        confidence: parsed.confidence || 0.8,
      };
    } catch {
      // Return raw text if not JSON
      return {
        prediction: content,
        confidence: 0.7,
      };
    }
  }

  // Log prediction for analytics
  private async logPrediction(request: PredictionRequest, result: PredictionResult): Promise<void> {
    const predictionsCollection = mongoDBClient.getCollection('ml_predictions');
    
    await predictionsCollection.insertOne({
      modelId: request.modelId,
      input: request.input,
      prediction: result.prediction,
      confidence: result.confidence,
      metadata: result.metadata,
      createdAt: new Date(),
    });
  }

  // Train model (for online learning)
  async trainModel(modelId: string, trainingData: any[], options: any = {}): Promise<void> {
    const modelConfig = this.modelConfigs.get(modelId);
    
    if (!modelConfig || modelConfig.type !== 'tensorflow') {
      throw new Error('Only TensorFlow models support online training');
    }

    const model = this.models.get(modelId) as tf.LayersModel;
    
    if (!model) {
      throw new Error(`Model ${modelId} not loaded`);
    }

    // Prepare training data
    const { xs, ys } = this.prepareTrainingData(trainingData, modelConfig);

    // Configure training
    const epochs = options.epochs || 10;
    const batchSize = options.batchSize || 32;
    const validationSplit = options.validationSplit || 0.2;

    // Train model
    const history = await model.fit(xs, ys, {
      epochs,
      batchSize,
      validationSplit,
      callbacks: {
        onEpochEnd: async (epoch, logs) => {
          logger.info(`Epoch ${epoch + 1}/${epochs} - loss: ${logs?.loss}, accuracy: ${logs?.acc}`);
        },
      },
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();

    // Save updated model
    await this.saveModel(modelId, model);

    // Update model metrics
    await this.updateModelMetrics(modelId, history);

    // Emit training completed event
    await eventPublisher.publish({
      eventType: 'ml.training.completed',
      source: 'ml-pipeline',
      version: '1.0',
      data: {
        modelId,
        trainingId: `training-${Date.now()}`,
        accuracy: (typeof history.history.acc?.[history.history.acc.length - 1] === 'number' 
          ? history.history.acc[history.history.acc.length - 1] 
          : await history.history.acc?.[history.history.acc.length - 1]?.data()[0]) || 0,
        metrics: {
          epochs,
          finalLoss: history.history.loss[history.history.loss.length - 1],
          history: history.history,
        },
      },
    });
  }

  // Prepare training data
  private prepareTrainingData(data: any[], modelConfig: MLModel): { xs: tf.Tensor; ys: tf.Tensor } {
    // Implementation depends on model architecture
    // This is a simplified example
    const features = data.map(item => item.features);
    const labels = data.map(item => item.label);

    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels);

    return { xs, ys };
  }

  // Save model
  private async saveModel(modelId: string, model: tf.LayersModel): Promise<void> {
    const modelConfig = this.modelConfigs.get(modelId);
    
    if (!modelConfig) {
      throw new Error(`Model config not found for ${modelId}`);
    }

    // Save to file system or cloud storage
    const savePath = `file://./models/${modelId}/v${Date.now()}`;
    await model.save(savePath);

    // Update model config in database
    const modelsCollection = mongoDBClient.getCollection('ml_models');
    await modelsCollection.updateOne(
      { id: modelId },
      {
        $set: {
          path: savePath,
          lastTrainedAt: new Date(),
          version: `${modelConfig.version}.${Date.now()}`,
        },
      }
    );
  }

  // Update model metrics
  private async updateModelMetrics(modelId: string, history: any): Promise<void> {
    const metricsCollection = mongoDBClient.getCollection('ml_metrics');
    
    await metricsCollection.insertOne({
      modelId,
      trainingHistory: history.history,
      finalMetrics: {
        loss: history.history.loss[history.history.loss.length - 1],
        accuracy: typeof history.history.acc?.[history.history.acc.length - 1] === 'number' 
          ? history.history.acc[history.history.acc.length - 1] 
          : await history.history.acc?.[history.history.acc.length - 1]?.data()[0],
        valLoss: history.history.val_loss?.[history.history.val_loss.length - 1],
        valAccuracy: history.history.val_acc?.[history.history.val_acc.length - 1],
      },
      trainedAt: new Date(),
    });
  }

  // Get model info
  getModelInfo(modelId: string): MLModel | undefined {
    return this.modelConfigs.get(modelId);
  }

  // List available models
  listModels(): MLModel[] {
    return Array.from(this.modelConfigs.values());
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      // Check if models are loaded
      if (this.models.size === 0) {
        return false;
      }

      // Test a simple prediction
      const testModelId = Array.from(this.modelConfigs.keys())[0];
      if (testModelId) {
        const testInput = this.modelConfigs.get(testModelId)?.config.testInput;
        if (testInput) {
          await this.predict({ modelId: testModelId, input: testInput });
        }
      }

      return true;
    } catch (error) {
      logger.error('ML Pipeline health check failed:', error);
      return false;
    }
  }

  // Cleanup
  async shutdown(): Promise<void> {
    // Dispose TensorFlow models
    for (const [modelId, model] of this.models) {
      if (this.modelConfigs.get(modelId)?.type === 'tensorflow') {
        (model as tf.LayersModel).dispose();
      }
    }

    this.models.clear();
    this.modelConfigs.clear();
    this.featureStore.clear();

    logger.info('ML Pipeline shut down');
  }
}

// Export singleton instance
export const mlPipeline = MLPipelineService.getInstance();