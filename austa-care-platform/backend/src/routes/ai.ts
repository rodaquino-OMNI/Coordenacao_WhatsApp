import { Router } from 'express';
import { AIController } from '../controllers/aiController';
import rateLimit from 'express-rate-limit';

const router = Router();
const aiController = new AIController();

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: {
    error: 'Too many AI requests',
    message: 'Please wait before making another request'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const streamingRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 streaming requests per minute
  message: {
    error: 'Too many streaming requests',
    message: 'Please wait before starting another streaming conversation'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI Chat Routes
router.post('/chat', aiRateLimit, aiController.generateResponse);
router.post('/chat/stream', streamingRateLimit, aiController.generateStreamingResponse);

// Conversation Management
router.get('/conversation/:userId', aiController.getConversationContext);
router.delete('/conversation/:userId', aiController.clearConversationContext);

// Analytics and Monitoring
router.get('/usage/:userId', aiController.getTokenUsage);
router.get('/health', aiController.healthCheck);

// Persona Management
router.get('/persona/:persona', aiController.getPersonaInfo);

// Health Templates
router.get('/templates', aiController.getHealthTemplates);
router.post('/classify', aiController.classifyHealthTopic);

export default router;