/**
 * Core Types Index
 * 
 * Central export point for all core type definitions
 */

// Export all branded types
export * from './branded.types';

// Export all Express types
export * from './express.types';

// Export all API response types
export * from './api-response.types';

// Re-export commonly used types at top level
export type {
  // Request types
  AuthenticatedRequest,
  TypedRequestHandler,
  AuthenticatedRequestHandler,
  
  // Response types
  ErrorResponse,
  SuccessResponse,
  
  // Utilities
  ServiceResponse,
  QueryOptions
} from './express.types';

// Re-export additional branded types
export type {
  // All branded IDs
  UserId,
  OrganizationId,
  PatientId,
  SessionId,
  ConversationId,
  MessageId,
  PractitionerId,
  AuthorizationId,
  DocumentId,
  TenantId,
  WorkflowId,
  TaskId,
  PhoneNumber,
  Email,
  CPF,
  ProcedureCode,
  DiagnosisCode,
  FHIRResourceId,
  FHIRReference
} from './branded.types';

// Re-export QuestionnaireResponse from questionnaire.types.ts
export type {
  QuestionnaireResponse,
  MedicalQuestionnaire,
  QuestionnaireQuestion
} from '../questionnaire.types';

// Re-export User types from user.types.ts
export type {
  User,
  UserRole,
  UserStatus,
  UserProfile,
  UserAuthData
} from '../user.types';

// Re-export Workflow types from workflow.types.ts
export type {
  WorkflowState,
  WorkflowStatus,
  WorkflowDefinition,
  WorkflowInstance
} from '../workflow.types';

// Re-export TASY types from tasy-integration.types.ts
export type {
  TasyPatient,
  TasyAuthorization,
  TasyProcedure,
  TasyPractitioner
} from '../tasy-integration.types';

// Re-export WhatsApp types from whatsapp.types.ts
export type {
  WhatsAppMessage,
  WhatsAppConversation,
  WhatsAppSession,
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  WhatsAppMessageContent
} from '../whatsapp.types';

export type {
  // API Response types
  APISuccessResponse,
  APIErrorResponse,
  APIResponse,
  BaseResponse,
  APIPendingResponse,
  APIPartialResponse
} from './api-response.types';

// Re-export risk types from risk.types.ts
export type {
  CompoundRiskAnalysis,
  TemporalRiskPattern,
  PredictiveRiskModel,
  InterventionOpportunity,
  RiskMitigationStrategy,
  AdvancedRiskAssessment,
  CardiovascularRisk,
  DiabetesRisk,
  MentalHealthRisk,
  RespiratoryRisk,
  CompositeRisk,
  RiskAssessment,
  RiskFactor
} from '../risk.types';

export {
  // Response builders
  ResponseBuilder,
  
  // Enums
  APIStatus,
  ErrorCode
} from './api-response.types';

// Type guard re-exports
export {
  isUserId,
  isPhoneNumber,
  isEmail,
  isCPF
} from './branded.types';

export {
  isSuccessResponse,
  isErrorResponse,
  isPendingResponse,
  isPartialResponse
} from './api-response.types';