/**
 * Express Type Utilities
 * 
 * Enhanced type definitions for Express request/response handling
 * with proper generic constraints and type safety.
 */

import { Request, Response, NextFunction } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';
import { UserId, OrganizationId, TenantId } from './branded.types';

// Enhanced User type for authenticated requests
export interface AuthenticatedUser {
  id: UserId;
  email: string;
  phone: string;
  organizationId: OrganizationId;
  tenantId?: TenantId;
  roles: string[];
  permissions: string[];
}

// Base request with authentication
export interface AuthenticatedRequest<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs,
  Locals extends Record<string, any> = Record<string, any>
> extends Request<P, ResBody, ReqBody, ReqQuery, Locals> {
  user: AuthenticatedUser;
  sessionId?: string;
  correlationId?: string;
}

// Typed request handler
export type TypedRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => void | Promise<void>;

// Authenticated request handler
export type AuthenticatedRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
> = (
  req: AuthenticatedRequest<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => void | Promise<void>;

// Async request handler wrapper type
export type AsyncRequestHandler<
  P = ParamsDictionary,
  ResBody = any,
  ReqBody = any,
  ReqQuery = ParsedQs
> = (
  req: Request<P, ResBody, ReqBody, ReqQuery>,
  res: Response<ResBody>,
  next: NextFunction
) => Promise<void>;

// Error response type
export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    path?: string;
    correlationId?: string;
  };
}

// Success response wrapper
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  metadata?: {
    timestamp: string;
    version?: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  };
}

// Paginated request query
export interface PaginatedQuery extends ParsedQs {
  page?: string;
  limit?: string;
  sort?: string;
  order?: 'asc' | 'desc';
  search?: string;
}

// File upload request
export interface FileUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

// Validation error details
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
  constraint?: string;
}

// Note: APIResponse moved to api-response.types.ts to avoid duplication
// Import from there instead: import { ResponseBuilder } from './api-response.types';

// Middleware type definitions
export type ErrorHandlerMiddleware = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => void;

export type ValidationMiddleware<T = any> = (
  schema: T
) => TypedRequestHandler;

// Route configuration type
export interface RouteConfig {
  path: string;
  method: 'get' | 'post' | 'put' | 'patch' | 'delete';
  handler: TypedRequestHandler | AuthenticatedRequestHandler;
  middleware?: (TypedRequestHandler | AuthenticatedRequestHandler)[];
  validation?: {
    body?: any;
    query?: any;
    params?: any;
  };
  auth?: boolean;
  permissions?: string[];
}

// Controller base interface
export interface Controller {
  routes: RouteConfig[];
  basePath: string;
}

// Service response type
export interface ServiceResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Repository query options
export interface QueryOptions {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  include?: string[];
  select?: string[];
  where?: Record<string, any>;
}

// Export commonly used Express types
export { Request, Response, NextFunction } from 'express';
export { ParamsDictionary } from 'express-serve-static-core';
export { ParsedQs } from 'qs';