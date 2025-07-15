/**
 * API Response Types
 * 
 * Standardized response types for consistent API communication
 */

// Standard API response statuses
export enum APIStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PENDING = 'pending',
  PARTIAL = 'partial'
}

// Base response interface
export interface BaseResponse {
  status: APIStatus;
  timestamp: string;
  correlationId?: string;
  version?: string;
}

// Success response
export interface APISuccessResponse<T = any> extends BaseResponse {
  status: APIStatus.SUCCESS;
  data: T;
  metadata?: ResponseMetadata;
}

// Error response
export interface APIErrorResponse extends BaseResponse {
  status: APIStatus.ERROR;
  error: APIError;
}

// Partial response (for long-running operations)
export interface APIPartialResponse<T = any> extends BaseResponse {
  status: APIStatus.PARTIAL;
  data: T;
  progress: {
    completed: number;
    total: number;
    percentage: number;
  };
  metadata?: ResponseMetadata;
}

// Pending response (for async operations)
export interface APIPendingResponse extends BaseResponse {
  status: APIStatus.PENDING;
  taskId: string;
  estimatedCompletionTime?: string;
  checkStatusUrl?: string;
}

// API Error structure
export interface APIError {
  code: string;
  message: string;
  details?: any;
  stack?: string; // Only in development
  help?: string; // Help URL or message
  retryable?: boolean;
  retryAfter?: number; // Seconds
}

// Response metadata
export interface ResponseMetadata {
  requestId?: string;
  duration?: number; // Milliseconds
  pagination?: PaginationMetadata;
  warnings?: string[];
  deprecation?: DeprecationNotice;
  rateLimit?: RateLimitInfo;
}

// Pagination metadata
export interface PaginationMetadata {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  links?: {
    self: string;
    first?: string;
    last?: string;
    next?: string;
    previous?: string;
  };
}

// Deprecation notice
export interface DeprecationNotice {
  message: string;
  deprecatedAt: string;
  removeAt?: string;
  alternative?: string;
}

// Rate limit information
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: string; // ISO date
  retryAfter?: number; // Seconds
}

// Batch operation response
export interface BatchResponse<T = any> {
  successful: T[];
  failed: BatchFailure[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

// Batch failure item
export interface BatchFailure {
  index: number;
  item: any;
  error: APIError;
}

// Health check response
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  services: {
    [key: string]: ServiceHealth;
  };
}

// Service health status
export interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  error?: string;
  lastCheck: string;
}

// Validation error response
export interface ValidationErrorResponse extends APIErrorResponse {
  error: APIError & {
    code: 'VALIDATION_ERROR';
    validationErrors: ValidationFieldError[];
  };
}

// Field validation error
export interface ValidationFieldError {
  field: string;
  value?: any;
  message: string;
  code: string;
  constraints?: Record<string, any>;
}

// File upload response
export interface FileUploadResponse {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  url?: string;
  metadata?: Record<string, any>;
}

// Search response
export interface SearchResponse<T = any> extends APISuccessResponse<T[]> {
  data: T[];
  metadata: ResponseMetadata & {
    query: string;
    filters?: Record<string, any>;
    facets?: SearchFacet[];
    suggestions?: string[];
    totalResults: number;
    searchTime: number;
  };
}

// Search facet
export interface SearchFacet {
  field: string;
  values: {
    value: string;
    count: number;
  }[];
}

// Streaming response header
export interface StreamingResponseHeader {
  type: 'streaming';
  encoding: 'utf-8' | 'base64';
  contentType: string;
  totalChunks?: number;
}

// Response type guards
export const isSuccessResponse = <T = any>(
  response: BaseResponse
): response is APISuccessResponse<T> => {
  return response.status === APIStatus.SUCCESS;
};

export const isErrorResponse = (
  response: BaseResponse
): response is APIErrorResponse => {
  return response.status === APIStatus.ERROR;
};

export const isPendingResponse = (
  response: BaseResponse
): response is APIPendingResponse => {
  return response.status === APIStatus.PENDING;
};

export const isPartialResponse = <T = any>(
  response: BaseResponse
): response is APIPartialResponse<T> => {
  return response.status === APIStatus.PARTIAL;
};

// Common error codes
export enum ErrorCode {
  // Client errors
  BAD_REQUEST = 'BAD_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  
  // Server errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  
  // Business logic errors
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  OPERATION_NOT_ALLOWED = 'OPERATION_NOT_ALLOWED',
  RESOURCE_LOCKED = 'RESOURCE_LOCKED',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR'
}

// Union type for all API responses
export type APIResponse<T = any> = 
  | APISuccessResponse<T>
  | APIErrorResponse
  | APIPendingResponse
  | APIPartialResponse<T>;

// Response builder utility
export class ResponseBuilder {
  static success<T>(data: T, metadata?: ResponseMetadata): APISuccessResponse<T> {
    return {
      status: APIStatus.SUCCESS,
      timestamp: new Date().toISOString(),
      data,
      metadata
    };
  }

  static error(error: Partial<APIError> & { code: string; message: string }): APIErrorResponse {
    return {
      status: APIStatus.ERROR,
      timestamp: new Date().toISOString(),
      error: {
        retryable: false,
        ...error
      }
    };
  }

  static pending(taskId: string, estimatedTime?: string): APIPendingResponse {
    return {
      status: APIStatus.PENDING,
      timestamp: new Date().toISOString(),
      taskId,
      estimatedCompletionTime: estimatedTime
    };
  }

  static partial<T>(
    data: T,
    completed: number,
    total: number,
    metadata?: ResponseMetadata
  ): APIPartialResponse<T> {
    return {
      status: APIStatus.PARTIAL,
      timestamp: new Date().toISOString(),
      data,
      progress: {
        completed,
        total,
        percentage: Math.round((completed / total) * 100)
      },
      metadata
    };
  }
}