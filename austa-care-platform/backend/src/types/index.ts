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
  APIErrorResponse,
  
  // From domain
  User,
  UserRole,
  RiskAssessment,
  QuestionnaireResponse,
  WorkflowState,
  WhatsAppMessage,
  TasyPatient
} from './core';

// Re-export enums
export {
  APIStatus,
  ErrorCode
} from './core';

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