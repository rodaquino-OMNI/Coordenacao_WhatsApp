import { Request, Response, NextFunction } from 'express';
import * as jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        roles: string[];
        permissions: string[];
      };
    }
  }
}

/**
 * Verify JWT token (used for WebSocket authentication)
 */
export const verifyToken = (token: string): any => {
  try {
    return jwt.verify(token, config.jwt.secret);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

/**
 * JWT Authentication middleware
 */
export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    logger.warn('Authentication failed: No token provided', {
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    return res.status(401).json({
      error: 'Access denied. No token provided.'
    });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    
    // Add user information to request
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      roles: decoded.roles || ['user'],
      permissions: decoded.permissions || []
    };

    logger.debug('Authentication successful', {
      userId: req.user.id,
      path: req.path,
      method: req.method
    });

    next();
  } catch (error) {
    logger.warn('Authentication failed: Invalid token', {
      path: req.path,
      method: req.method,
      ip: req.ip,
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        error: 'Access denied. Token has expired.'
      });
    }

    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        error: 'Access denied. Invalid token.'
      });
    }

    return res.status(401).json({
      error: 'Access denied. Token verification failed.'
    });
  }
};

/**
 * Role-based authorization middleware
 */
export const requireRole = (requiredRoles: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
    const hasRequiredRole = roles.some(role => req.user!.roles.includes(role));

    if (!hasRequiredRole) {
      logger.warn('Authorization failed: Insufficient permissions', {
        userId: req.user.id,
        userRoles: req.user.roles,
        requiredRoles: roles,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Access denied. Insufficient permissions.',
        requiredRoles: roles
      });
    }

    logger.debug('Authorization successful', {
      userId: req.user.id,
      userRoles: req.user.roles,
      path: req.path,
      method: req.method
    });

    next();
  };
};

/**
 * Permission-based authorization middleware
 */
export const requirePermission = (requiredPermissions: string | string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Authentication required.'
      });
    }

    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];
    const hasRequiredPermission = permissions.some(permission => 
      req.user!.permissions.includes(permission)
    );

    if (!hasRequiredPermission) {
      logger.warn('Authorization failed: Missing permissions', {
        userId: req.user.id,
        userPermissions: req.user.permissions,
        requiredPermissions: permissions,
        path: req.path,
        method: req.method
      });

      return res.status(403).json({
        error: 'Access denied. Missing required permissions.',
        requiredPermissions: permissions
      });
    }

    next();
  };
};

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next(); // Continue without user info
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.user = {
      id: decoded.userId || decoded.id,
      email: decoded.email,
      roles: decoded.roles || ['user'],
      permissions: decoded.permissions || []
    };
  } catch (error) {
    // Log but don't fail
    logger.debug('Optional auth failed', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  next();
};

/**
 * Alias for authenticateToken for backward compatibility
 */
export const authMiddleware = authenticateToken;