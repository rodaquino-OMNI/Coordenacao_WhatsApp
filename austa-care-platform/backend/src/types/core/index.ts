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
  // Branded IDs
  UserId,
  OrganizationId,
  PatientId,
  SessionId,
  
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

export type {
  // API Response types
  APISuccessResponse,
  APIErrorResponse,
  APIResponse,
  BaseResponse,
  APIPendingResponse,
  APIPartialResponse
} from './api-response.types';

export {
  // Response builders
  ResponseBuilder,
  
  // Enums
  APIStatus,
  ErrorCode
} from './api-response.types';

export {
  // API Response builder
  APIResponse
} from './express.types';

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