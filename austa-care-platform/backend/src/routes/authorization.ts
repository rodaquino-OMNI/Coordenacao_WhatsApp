import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import {
  createAuthorization,
  getAuthorization,
  executeAction,
  uploadDocuments,
  submitAppeal,
  getMetrics,
  generateComplianceReport,
  searchAuthorizations,
  getHealthStatus
} from '../controllers/authorizationController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { rateLimit } from 'express-rate-limit';
import { logger } from '../utils/logger';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/documents/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '.' + file.originalname.split('.').pop());
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Accept only specific file types
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/jpg',
      'application/pdf',
      'image/tiff'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, PDF, and TIFF files are allowed.'));
    }
  }
});

// Rate limiting configurations
const standardRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900 // 15 minutes in seconds
  }
});

const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 900
  }
});

const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 50, // limit each IP to 50 upload requests per hour
  message: {
    error: 'Too many upload requests from this IP, please try again later.',
    retryAfter: 3600 // 1 hour in seconds
  }
});

// Validation schemas
const CreateAuthorizationSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID format'),
  providerId: z.string().uuid('Invalid provider ID format'),
  procedureId: z.string().min(1, 'Procedure ID is required'),
  requestedDate: z.string().datetime('Invalid requested date format'),
  preferredDate: z.string().datetime('Invalid preferred date format').optional(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent', 'emergency']),
  clinicalJustification: z.string().min(20, 'Clinical justification must be at least 20 characters'),
  estimatedCost: z.number().positive('Estimated cost must be positive'),
  requiredDocuments: z.array(z.string()).optional()
});

const ExecuteActionSchema = z.object({
  action: z.enum([
    'initiate',
    'submit_documents',
    'request_additional_info',
    'provide_additional_info',
    'start_medical_review',
    'complete_medical_review',
    'start_admin_review',
    'complete_admin_review',
    'approve',
    'reject',
    'appeal',
    'cancel',
    'put_on_hold',
    'resume',
    'expire',
    'escalate'
  ]),
  metadata: z.record(z.any()).optional()
});

const SubmitAppealSchema = z.object({
  reason: z.string().min(10, 'Appeal reason must be at least 10 characters'),
  additionalDocuments: z.array(z.string()).optional()
});

const ComplianceReportSchema = z.object({
  regulation: z.enum(['LGPD', 'ANS', 'Internal']),
  startDate: z.string().datetime('Invalid start date format'),
  endDate: z.string().datetime('Invalid end date format')
});

const SearchAuthorizationsSchema = z.object({
  patientId: z.string().uuid('Invalid patient ID format').optional(),
  providerId: z.string().uuid('Invalid provider ID format').optional(),
  state: z.enum([
    'initiated',
    'document_collection',
    'medical_review',
    'administrative_review',
    'approved',
    'rejected',
    'appealed',
    'expired',
    'canceled',
    'on_hold',
    'pending_additional_info'
  ]).optional(),
  urgency: z.enum(['low', 'medium', 'high', 'urgent', 'emergency']).optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  limit: z.string().transform(Number).refine(n => n > 0 && n <= 100, 'Limit must be between 1 and 100').optional(),
  offset: z.string().transform(Number).refine(n => n >= 0, 'Offset must be non-negative').optional()
});

// Middleware for logging requests
const logRequest = (req: any, res: any, next: any) => {
  logger.info('Authorization API request', {
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  next();
};

// Apply middleware
router.use(logRequest);
router.use(authenticateToken);

/**
 * @route   POST /api/authorization
 * @desc    Create new authorization request
 * @access  Private
 */
router.post(
  '/',
  standardRateLimit,
  validateRequest(CreateAuthorizationSchema),
  createAuthorization
);

/**
 * @route   GET /api/authorization/:authorizationId
 * @desc    Get authorization details
 * @access  Private
 */
router.get(
  '/:authorizationId',
  standardRateLimit,
  (req, res, next) => {
    const { authorizationId } = req.params;
    if (!authorizationId.match(/^auth-\d+-[a-z0-9]+$/)) {
      return res.status(400).json({
        error: 'Invalid authorization ID format'
      });
    }
    next();
  },
  getAuthorization
);

/**
 * @route   POST /api/authorization/:authorizationId/action
 * @desc    Execute workflow action
 * @access  Private
 */
router.post(
  '/:authorizationId/action',
  standardRateLimit,
  validateRequest(ExecuteActionSchema),
  executeAction
);

/**
 * @route   POST /api/authorization/:authorizationId/documents
 * @desc    Upload and process documents
 * @access  Private
 */
router.post(
  '/:authorizationId/documents',
  uploadRateLimit,
  upload.array('documents', 10),
  (req, res, next) => {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      return res.status(400).json({
        error: 'No files uploaded'
      });
    }
    next();
  },
  uploadDocuments
);

/**
 * @route   POST /api/authorization/:authorizationId/appeal
 * @desc    Submit appeal for rejected authorization
 * @access  Private
 */
router.post(
  '/:authorizationId/appeal',
  strictRateLimit,
  validateRequest(SubmitAppealSchema),
  submitAppeal
);

/**
 * @route   GET /api/authorization/search
 * @desc    Search authorizations with filters
 * @access  Private
 */
router.get(
  '/search',
  standardRateLimit,
  (req, res, next) => {
    const validationResult = SearchAuthorizationsSchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid search parameters',
        details: validationResult.error.errors
      });
    }
    req.query = validationResult.data;
    next();
  },
  searchAuthorizations
);

/**
 * @route   GET /api/authorization/metrics
 * @desc    Get workflow metrics and analytics
 * @access  Private (Admin only)
 */
router.get(
  '/metrics',
  standardRateLimit,
  (req, res, next) => {
    // Check if user has admin role
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        error: 'Access denied. Admin role required.'
      });
    }
    next();
  },
  getMetrics
);

/**
 * @route   POST /api/authorization/compliance/report
 * @desc    Generate compliance report
 * @access  Private (Compliance role required)
 */
router.post(
  '/compliance/report',
  strictRateLimit,
  (req, res, next) => {
    // Check if user has compliance role
    if (!req.user?.roles?.includes('compliance') && !req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        error: 'Access denied. Compliance role required.'
      });
    }
    next();
  },
  validateRequest(ComplianceReportSchema),
  generateComplianceReport
);

/**
 * @route   GET /api/authorization/health
 * @desc    Get system health status
 * @access  Private (Admin only)
 */
router.get(
  '/health',
  standardRateLimit,
  (req, res, next) => {
    // Check if user has admin role
    if (!req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        error: 'Access denied. Admin role required.'
      });
    }
    next();
  },
  getHealthStatus
);

/**
 * @route   GET /api/authorization/:authorizationId/audit
 * @desc    Get audit trail for authorization
 * @access  Private (Auditor role required)
 */
router.get(
  '/:authorizationId/audit',
  standardRateLimit,
  (req, res, next) => {
    // Check if user has auditor role
    if (!req.user?.roles?.includes('auditor') && !req.user?.roles?.includes('admin')) {
      return res.status(403).json({
        error: 'Access denied. Auditor role required.'
      });
    }
    next();
  },
  async (req, res) => {
    try {
      const { authorizationId } = req.params;
      
      // This would be handled by the audit service
      // For now, return a placeholder response
      res.json({
        authorizationId,
        auditTrail: [],
        message: 'Audit trail endpoint - to be implemented with full audit service integration'
      });
    } catch (error) {
      logger.error('Failed to retrieve audit trail', { error });
      res.status(500).json({
        error: 'Failed to retrieve audit trail'
      });
    }
  }
);

/**
 * @route   GET /api/authorization/:authorizationId/documents/:documentId
 * @desc    Download specific document
 * @access  Private
 */
router.get(
  '/:authorizationId/documents/:documentId',
  standardRateLimit,
  async (req, res) => {
    try {
      const { authorizationId, documentId } = req.params;
      const userId = req.user?.id;

      // Log document access for LGPD compliance
      logger.info('Document access request', {
        authorizationId,
        documentId,
        userId,
        ip: req.ip
      });

      // In production, implement actual document retrieval
      res.status(404).json({
        error: 'Document not found or access denied'
      });
    } catch (error) {
      logger.error('Failed to retrieve document', { error });
      res.status(500).json({
        error: 'Failed to retrieve document'
      });
    }
  }
);

/**
 * @route   DELETE /api/authorization/:authorizationId
 * @desc    Cancel/delete authorization (LGPD compliance)
 * @access  Private
 */
router.delete(
  '/:authorizationId',
  strictRateLimit,
  async (req, res) => {
    try {
      const { authorizationId } = req.params;
      const userId = req.user?.id;

      logger.info('Authorization deletion request', {
        authorizationId,
        userId,
        ip: req.ip
      });

      // In production, implement proper deletion logic with LGPD compliance
      res.json({
        message: 'Authorization cancellation/deletion request received',
        authorizationId,
        note: 'Deletion will be processed according to LGPD retention policies'
      });
    } catch (error) {
      logger.error('Failed to process deletion request', { error });
      res.status(500).json({
        error: 'Failed to process deletion request'
      });
    }
  }
);

// Error handling middleware for multer
router.use((error: any, req: any, res: any, next: any) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large. Maximum size is 10MB per file.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files. Maximum 10 files per request.'
      });
    }
    return res.status(400).json({
      error: 'File upload error',
      details: error.message
    });
  }
  
  if (error.message === 'Invalid file type. Only JPEG, PNG, PDF, and TIFF files are allowed.') {
    return res.status(400).json({
      error: error.message
    });
  }
  
  next(error);
});

export default router;