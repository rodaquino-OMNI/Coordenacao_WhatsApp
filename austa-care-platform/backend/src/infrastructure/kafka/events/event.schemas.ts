import { z } from 'zod';

// Base event schema
export const BaseEventSchema = z.object({
  eventId: z.string().uuid(),
  eventType: z.string(),
  timestamp: z.string().datetime(),
  version: z.string().default('1.0'),
  source: z.string(),
  correlationId: z.string().uuid().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

// User events
export const UserRegisteredEventSchema = BaseEventSchema.extend({
  eventType: z.literal('user.registered'),
  data: z.object({
    userId: z.string(),
    organizationId: z.string(),
    phone: z.string(),
    email: z.string().optional(),
    firstName: z.string(),
    lastName: z.string(),
    preferredLanguage: z.string().default('pt-BR'),
    consentStatus: z.object({
      termsAccepted: z.boolean(),
      dataProcessing: z.boolean(),
      marketingCommunication: z.boolean(),
    }),
  }),
});

// Conversation events
export const ConversationStartedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('conversation.started'),
  data: z.object({
    conversationId: z.string(),
    userId: z.string(),
    channel: z.enum(['whatsapp', 'web', 'voice']),
    type: z.enum(['SUPPORT', 'ONBOARDING', 'HEALTH_CHECK', 'MEDICATION_REMINDER', 'APPOINTMENT', 'EMERGENCY', 'SURVEY']),
    context: z.object({
      previousConversationId: z.string().optional(),
      referralSource: z.string().optional(),
      initialIntent: z.string().optional(),
    }),
  }),
});

export const MessageReceivedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('message.received'),
  data: z.object({
    messageId: z.string(),
    conversationId: z.string(),
    userId: z.string(),
    content: z.string(),
    type: z.enum(['TEXT', 'AUDIO', 'IMAGE', 'VIDEO', 'DOCUMENT', 'LOCATION']),
    whatsappMessageId: z.string().optional(),
    metadata: z.record(z.string(), z.any()).optional(),
  }),
});

// AI/ML events
export const SymptomAnalyzedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('ai.symptom.analyzed'),
  data: z.object({
    analysisId: z.string(),
    userId: z.string(),
    conversationId: z.string(),
    symptoms: z.array(z.object({
      name: z.string(),
      severity: z.enum(['mild', 'moderate', 'severe']),
      duration: z.string().optional(),
      confidence: z.number().min(0).max(1),
    })),
    riskScore: z.number().min(0).max(100),
    urgencyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
    recommendations: z.array(z.object({
      type: z.string(),
      description: z.string(),
      priority: z.number(),
    })),
    aiModel: z.object({
      name: z.string(),
      version: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  }),
});

export const RiskScoreCalculatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('risk.calculated'),
  data: z.object({
    userId: z.string(),
    riskScore: z.number().min(0).max(100),
    riskCategory: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    riskFactors: z.array(z.object({
      factor: z.string(),
      weight: z.number(),
      value: z.any(),
    })),
    predictions: z.object({
      hospitalizationRisk30Days: z.number().min(0).max(1),
      emergencyVisitRisk7Days: z.number().min(0).max(1),
      readmissionRisk: z.number().min(0).max(1).optional(),
    }),
    recommendations: z.array(z.string()),
    validUntil: z.string().datetime(),
  }),
});

// Authorization events
export const AuthorizationRequestedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('authorization.requested'),
  data: z.object({
    authorizationId: z.string(),
    userId: z.string(),
    providerId: z.string(),
    procedureCode: z.string(),
    procedureName: z.string(),
    urgencyLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY']),
    requestedAt: z.string().datetime(),
    clinicalJustification: z.string().optional(),
    attachedDocuments: z.array(z.string()).optional(),
  }),
});

export const AuthorizationApprovedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('authorization.approved'),
  data: z.object({
    authorizationId: z.string(),
    userId: z.string(),
    approvedBy: z.string(),
    approvalDate: z.string().datetime(),
    validFrom: z.string().datetime(),
    validUntil: z.string().datetime(),
    conditions: z.array(z.string()).optional(),
    tasyReferenceId: z.string().optional(),
  }),
});

// Health data events
export const HealthDataUpdatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('health.data.updated'),
  data: z.object({
    userId: z.string(),
    dataType: z.enum(['CONDITION', 'MEDICATION', 'ALLERGY', 'SYMPTOM', 'VITAL_SIGN', 'LAB_RESULT']),
    category: z.string(),
    changes: z.object({
      added: z.array(z.any()).optional(),
      modified: z.array(z.any()).optional(),
      removed: z.array(z.any()).optional(),
    }),
    source: z.enum(['USER_REPORTED', 'PROVIDER_ENTERED', 'DEVICE_MEASURED', 'LAB_RESULT', 'TASY_SYNC', 'AI_EXTRACTED']),
    verifiedBy: z.string().optional(),
  }),
});

// Document events
export const DocumentUploadedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('document.uploaded'),
  data: z.object({
    documentId: z.string(),
    userId: z.string(),
    filename: z.string(),
    mimeType: z.string(),
    size: z.number(),
    type: z.enum(['MEDICAL_RECORD', 'LAB_RESULT', 'PRESCRIPTION', 'INSURANCE_CARD', 'ID_DOCUMENT']),
    category: z.string(),
    ocrRequired: z.boolean(),
    sensitivityLevel: z.enum(['PUBLIC', 'NORMAL', 'SENSITIVE', 'HIGHLY_SENSITIVE', 'CONFIDENTIAL']),
  }),
});

export const DocumentProcessedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('document.processed'),
  data: z.object({
    documentId: z.string(),
    userId: z.string(),
    processingType: z.enum(['OCR', 'CLASSIFICATION', 'DATA_EXTRACTION', 'VALIDATION']),
    success: z.boolean(),
    extractedData: z.any().optional(),
    confidence: z.number().min(0).max(1).optional(),
    errors: z.array(z.string()).optional(),
  }),
});

// Integration events
export const TasySyncCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('integration.tasy.sync.completed'),
  data: z.object({
    syncId: z.string(),
    integrationId: z.string(),
    syncType: z.enum(['FULL', 'INCREMENTAL', 'DIFFERENTIAL', 'REAL_TIME']),
    recordType: z.string(),
    recordsProcessed: z.number(),
    recordsSucceeded: z.number(),
    recordsFailed: z.number(),
    duration: z.number(),
    errors: z.array(z.object({
      recordId: z.string(),
      error: z.string(),
    })).optional(),
  }),
});

// Notification events
export const NotificationScheduledEventSchema = BaseEventSchema.extend({
  eventType: z.literal('notification.scheduled'),
  data: z.object({
    notificationId: z.string(),
    userId: z.string(),
    type: z.enum(['MEDICATION_REMINDER', 'APPOINTMENT_REMINDER', 'HEALTH_TIP', 'SURVEY', 'ALERT']),
    channel: z.enum(['WHATSAPP', 'SMS', 'EMAIL', 'PUSH']),
    scheduledFor: z.string().datetime(),
    content: z.object({
      template: z.string(),
      variables: z.record(z.string(), z.any()),
    }),
    priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  }),
});

// FHIR events
export const FhirResourceCreatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('fhir.resource.created'),
  data: z.object({
    resourceType: z.string(),
    resourceId: z.string(),
    userId: z.string(),
    resource: z.any(),
  }),
});

export const FhirResourceUpdatedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('fhir.resource.updated'),
  data: z.object({
    resourceType: z.string(),
    resourceId: z.string(),
    userId: z.string(),
    resource: z.any(),
    changes: z.any().optional(),
  }),
});

export const FhirResourceDeletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('fhir.resource.deleted'),
  data: z.object({
    resourceType: z.string(),
    resourceId: z.string(),
    userId: z.string(),
  }),
});

// ML events
export const MlPredictionCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('ml.prediction.completed'),
  data: z.object({
    modelId: z.string(),
    predictionId: z.string(),
    userId: z.string(),
    input: z.any(),
    prediction: z.any(),
    confidence: z.number(),
  }),
});

export const MlPredictionFailedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('ml.prediction.failed'),
  data: z.object({
    modelId: z.string(),
    predictionId: z.string(),
    userId: z.string(),
    error: z.string(),
    input: z.any().optional(),
  }),
});

export const MlTrainingCompletedEventSchema = BaseEventSchema.extend({
  eventType: z.literal('ml.training.completed'),
  data: z.object({
    modelId: z.string(),
    trainingId: z.string(),
    accuracy: z.number(),
    metrics: z.any(),
  }),
});

// Type exports
export type UserRegisteredEvent = z.infer<typeof UserRegisteredEventSchema>;
export type ConversationStartedEvent = z.infer<typeof ConversationStartedEventSchema>;
export type MessageReceivedEvent = z.infer<typeof MessageReceivedEventSchema>;
export type SymptomAnalyzedEvent = z.infer<typeof SymptomAnalyzedEventSchema>;
export type RiskScoreCalculatedEvent = z.infer<typeof RiskScoreCalculatedEventSchema>;
export type AuthorizationRequestedEvent = z.infer<typeof AuthorizationRequestedEventSchema>;
export type AuthorizationApprovedEvent = z.infer<typeof AuthorizationApprovedEventSchema>;
export type HealthDataUpdatedEvent = z.infer<typeof HealthDataUpdatedEventSchema>;
export type DocumentUploadedEvent = z.infer<typeof DocumentUploadedEventSchema>;
export type DocumentProcessedEvent = z.infer<typeof DocumentProcessedEventSchema>;
export type TasySyncCompletedEvent = z.infer<typeof TasySyncCompletedEventSchema>;
export type NotificationScheduledEvent = z.infer<typeof NotificationScheduledEventSchema>;
export type FhirResourceCreatedEvent = z.infer<typeof FhirResourceCreatedEventSchema>;
export type FhirResourceUpdatedEvent = z.infer<typeof FhirResourceUpdatedEventSchema>;
export type FhirResourceDeletedEvent = z.infer<typeof FhirResourceDeletedEventSchema>;
export type MlPredictionCompletedEvent = z.infer<typeof MlPredictionCompletedEventSchema>;
export type MlPredictionFailedEvent = z.infer<typeof MlPredictionFailedEventSchema>;
export type MlTrainingCompletedEvent = z.infer<typeof MlTrainingCompletedEventSchema>;

// Union type for all events
export type DomainEvent = 
  | UserRegisteredEvent
  | ConversationStartedEvent
  | MessageReceivedEvent
  | SymptomAnalyzedEvent
  | RiskScoreCalculatedEvent
  | AuthorizationRequestedEvent
  | AuthorizationApprovedEvent
  | HealthDataUpdatedEvent
  | DocumentUploadedEvent
  | DocumentProcessedEvent
  | TasySyncCompletedEvent
  | NotificationScheduledEvent
  | FhirResourceCreatedEvent
  | FhirResourceUpdatedEvent
  | FhirResourceDeletedEvent
  | MlPredictionCompletedEvent
  | MlPredictionFailedEvent
  | MlTrainingCompletedEvent;