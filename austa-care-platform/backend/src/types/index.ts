/**
 * Master Type Index
 * 
 * Central export point for all type definitions in the application
 */

// Core types
export * from './core';

// Domain types
export * from './user.types';
export * from './risk.types';
export * from './questionnaire.types';
export * from './workflow.types';
export * from './whatsapp.types';
export * from './tasy-integration.types';

// Common type aliases for convenience
export type {
  // From core
  UserId,
  OrganizationId,
  PatientId,
  SessionId,
  AuthenticatedRequest,
  APISuccessResponse,
  APIErrorResponse
} from './core';

export type {
  // From user types
  User,
  UserRole
} from './user.types';

export type {
  // From risk types
  RiskAssessment,
  CompoundRiskAnalysis,
  TemporalRiskPattern,
  PredictiveRiskModel,
  InterventionOpportunity,
  RiskMitigationStrategy,
  AdvancedRiskAssessment
} from './risk.types';

export type {
  // From questionnaire types
  QuestionnaireResponse
} from './questionnaire.types';

export type {
  // From workflow types
  WorkflowState
} from './workflow.types';

export type {
  // From WhatsApp types
  WhatsAppMessage
} from './whatsapp.types';

export type {
  // From TASY integration types
  TasyPatient
} from './tasy-integration.types';

// Re-export enums
export {
  APIStatus,
  ErrorCode
} from './core';

// Additional risk types exports
export type {
  CardiovascularRisk,
  DiabetesRisk,
  MentalHealthRisk,
  RespiratoryRisk,
  CompositeRisk,
  RiskFactor
} from './risk.types';

// Type guards
export {
  isUserId,
  isPhoneNumber,
  isEmail,
  isCPF
} from './core/branded.types';

export {
  isSuccessResponse,
  isErrorResponse
} from './core';