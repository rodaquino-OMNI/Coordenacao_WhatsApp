import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { logger } from '../utils/logger';

/**
 * Validation middleware for request validation using Zod schemas
 */
export const validateRequest = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      const validationResult = schema.safeParse(req.body);
      
      if (!validationResult.success) {
        logger.warn('Request validation failed', {
          path: req.path,
          method: req.method,
          errors: validationResult.error.errors,
          body: req.body
        });

        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      // Replace request body with validated data
      req.body = validationResult.data;
      next();
    } catch (error) {
      logger.error('Validation middleware error', { error });
      res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
};

/**
 * Validation middleware for query parameters
 */
export const validateQuery = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.query);
      
      if (!validationResult.success) {
        logger.warn('Query validation failed', {
          path: req.path,
          method: req.method,
          errors: validationResult.error.errors,
          query: req.query
        });

        return res.status(400).json({
          error: 'Query validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      req.query = validationResult.data;
      next();
    } catch (error) {
      logger.error('Query validation middleware error', { error });
      res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
};

/**
 * Validation middleware for URL parameters
 */
export const validateParams = (schema: z.ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const validationResult = schema.safeParse(req.params);
      
      if (!validationResult.success) {
        logger.warn('Params validation failed', {
          path: req.path,
          method: req.method,
          errors: validationResult.error.errors,
          params: req.params
        });

        return res.status(400).json({
          error: 'Parameter validation failed',
          details: validationResult.error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            code: err.code
          }))
        });
      }

      req.params = validationResult.data;
      next();
    } catch (error) {
      logger.error('Params validation middleware error', { error });
      res.status(500).json({
        error: 'Internal validation error'
      });
    }
  };
};