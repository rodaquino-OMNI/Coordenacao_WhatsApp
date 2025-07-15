import { Request, Response } from 'express';
import { logger } from '../utils/logger';
import { WorkflowOrchestrator } from '../services/workflowOrchestrator';
import { BusinessRulesEngine } from '../services/businessRulesEngine';
import { DocumentIntelligenceService } from '../services/documentIntelligence';
import { TasyIntegrationService } from '../services/tasyIntegration';
import { NotificationService } from '../services/notificationService';
import { AuditService } from '../services/auditService';
import {
  AuthorizationRequest,
  AuthorizationState,
  WorkflowAction,
  Priority,
  ProcedureCategory,
  DocumentType,
  AuthorizationRequestSchema
} from '../types/authorization';

/**
 * Authorization Controller
 * Main controller for managing authorization workflow operations
 */
export class AuthorizationController {
  private workflowOrchestrator: WorkflowOrchestrator;
  private businessRules: BusinessRulesEngine;
  private documentIntelligence: DocumentIntelligenceService;
  private tasyIntegration: TasyIntegrationService;
  private notificationService: NotificationService;
  private auditService: AuditService;

  constructor() {
    // Initialize services
    this.businessRules = new BusinessRulesEngine();
    this.documentIntelligence = new DocumentIntelligenceService();
    this.tasyIntegration = new TasyIntegrationService();
    this.notificationService = new NotificationService();
    this.auditService = new AuditService();

    // Initialize orchestrator with all services
    this.workflowOrchestrator = new WorkflowOrchestrator(
      this.businessRules,
      this.documentIntelligence,
      this.tasyIntegration,
      this.notificationService,
      this.auditService
    );

    this.setupEventHandlers();
  }

  /**
   * Setup event handlers for cross-service coordination
   */
  private setupEventHandlers(): void {
    // Workflow orchestrator events
    this.workflowOrchestrator.on('workflowStarted', this.handleWorkflowStarted.bind(this));
    this.workflowOrchestrator.on('workflowCompleted', this.handleWorkflowCompleted.bind(this));
    
    // Business rules events
    this.businessRules.on('autoDecisionMade', this.handleAutoDecision.bind(this));
    
    // Document intelligence events
    this.documentIntelligence.on('documentsProcessed', this.handleDocumentsProcessed.bind(this));
    
    // Tasy integration events
    this.tasyIntegration.on('syncComplete', this.handleTasySync.bind(this));
    
    // Notification events
    this.notificationService.on('notificationSent', this.handleNotificationSent.bind(this));
    
    // Audit events
    this.auditService.on('complianceViolation', this.handleComplianceViolation.bind(this));
  }

  /**
   * Create new authorization request
   */
  async createAuthorization(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || 'anonymous';
      
      logger.info('Creating new authorization request', {
        userId,
        body: req.body
      });

      // Validate request data
      const validationResult = AuthorizationRequestSchema.safeParse({
        ...req.body,
        id: this.generateAuthorizationId(),
        state: AuthorizationState.INITIATED,
        createdAt: new Date(),
        updatedAt: new Date(),
        auditTrail: [],
        documents: [],
        missingDocuments: req.body.requiredDocuments || [],
        appeals: [],
        notifications: []
      });

      if (!validationResult.success) {
        res.status(400).json({
          error: 'Invalid authorization request data',
          details: validationResult.error.errors
        });
        return;
      }

      const authorizationRequest = validationResult.data;

      // Record audit event
      await this.auditService.recordEvent({
        id: this.generateEventId(),
        authorizationId: authorizationRequest.id,
        action: WorkflowAction.INITIATE,
        performedBy: userId,
        timestamp: new Date(),
        metadata: {
          procedureId: authorizationRequest.procedureId,
          estimatedCost: authorizationRequest.estimatedCost,
          urgency: authorizationRequest.urgency
        }
      });

      // Start workflow
      await this.workflowOrchestrator.startWorkflow(authorizationRequest, userId);

      res.status(201).json({
        message: 'Authorization request created successfully',
        authorizationId: authorizationRequest.id,
        state: authorizationRequest.state,
        workflowId: authorizationRequest.workflowId
      });

    } catch (error) {
      logger.error('Failed to create authorization request', { error });
      res.status(500).json({
        error: 'Failed to create authorization request',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get authorization details
   */
  async getAuthorization(req: Request, res: Response): Promise<void> {
    try {
      const { authorizationId } = req.params;
      const userId = req.user?.id || 'anonymous';

      logger.info('Retrieving authorization details', {
        authorizationId,
        userId
      });

      // Record data access for LGPD compliance
      await this.auditService.recordDataAccess({
        userId,
        patientId: 'patient-id', // Get from authorization record
        dataType: 'authorization_record',
        purpose: 'authorization_inquiry',
        accessMethod: 'api',
        timestamp: new Date()
      });

      // Get authorization status from workflow
      const workflowStatus = this.workflowOrchestrator.getWorkflowStatus(authorizationId);
      
      if (!workflowStatus) {
        res.status(404).json({
          error: 'Authorization not found'
        });
        return;
      }

      // Get audit trail
      const auditTrail = await this.auditService.getAuthorizationAuditTrail(authorizationId);

      res.json({
        authorization: workflowStatus.authorizationRequest,
        workflowStatus: {
          currentState: workflowStatus.authorizationRequest.state,
          assignedTo: workflowStatus.authorizationRequest.assignedTo,
          startTime: workflowStatus.systemMetadata.workflowStartTime
        },
        auditTrail,
        possibleActions: this.getPossibleActions(workflowStatus.authorizationRequest)
      });

    } catch (error) {
      logger.error('Failed to retrieve authorization', { error });
      res.status(500).json({
        error: 'Failed to retrieve authorization',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Execute workflow action
   */
  async executeAction(req: Request, res: Response): Promise<void> {
    try {
      const { authorizationId } = req.params;
      const { action, metadata } = req.body;
      const userId = req.user?.id || 'anonymous';

      logger.info('Executing workflow action', {
        authorizationId,
        action,
        userId
      });

      // Validate action
      if (!Object.values(WorkflowAction).includes(action)) {
        res.status(400).json({
          error: 'Invalid workflow action',
          validActions: Object.values(WorkflowAction)
        });
        return;
      }

      // Execute action through orchestrator
      const result = await this.workflowOrchestrator.executeAction(
        authorizationId,
        action,
        userId,
        metadata
      );

      if (result.success) {
        res.json({
          message: 'Action executed successfully',
          authorizationId,
          action,
          newState: result.success ? 'updated' : undefined
        });
      } else {
        res.status(400).json({
          error: 'Action execution failed',
          reason: result.error
        });
      }

    } catch (error) {
      logger.error('Failed to execute workflow action', { error });
      res.status(500).json({
        error: 'Failed to execute workflow action',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Upload and process documents
   */
  async uploadDocuments(req: Request, res: Response): Promise<void> {
    try {
      const { authorizationId } = req.params;
      const userId = req.user?.id || 'anonymous';
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          error: 'No files uploaded'
        });
        return;
      }

      logger.info('Processing uploaded documents', {
        authorizationId,
        fileCount: files.length,
        userId
      });

      const processedDocuments = [];

      // Process each file
      for (const file of files) {
        const document = {
          id: this.generateDocumentId(),
          type: this.inferDocumentType(file.originalname),
          fileName: file.originalname,
          filePath: file.path,
          mimeType: file.mimetype,
          fileSize: file.size,
          uploadedAt: new Date(),
          uploadedBy: userId,
          isValid: false,
          ocrData: {}
        };

        // Extract text using OCR
        const ocrResult = await this.documentIntelligence.extractText(document);
        
        // Validate document
        const validationResult = await this.documentIntelligence.validateDocument(document, ocrResult);
        
        (document as any).isValid = validationResult.isValid;
        (document as any).validationNotes = validationResult.notes;
        (document as any).ocrData = ocrResult;

        processedDocuments.push({
          ...document,
          validationResult
        });

        // Record document processing
        await this.auditService.recordEvent({
          id: this.generateEventId(),
          authorizationId,
          action: WorkflowAction.DOCUMENT_UPLOADED,
          performedBy: userId,
          timestamp: new Date(),
          metadata: {
            documentId: document.id,
            documentType: document.type,
            fileName: file.originalname,
            isValid: document.isValid
          }
        });
      }

      // Check if all required documents are now available
      const allValid = processedDocuments.every(doc => doc.isValid);
      
      if (allValid) {
        // Trigger document submission workflow action
        await this.workflowOrchestrator.executeAction(
          authorizationId,
          WorkflowAction.SUBMIT_DOCUMENTS,
          userId
        );
      }

      res.json({
        message: 'Documents processed successfully',
        documents: processedDocuments,
        allValid,
        nextStep: allValid ? 'review' : 'additional_documents_needed'
      });

    } catch (error) {
      logger.error('Failed to process uploaded documents', { error });
      res.status(500).json({
        error: 'Failed to process documents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Submit appeal
   */
  async submitAppeal(req: Request, res: Response): Promise<void> {
    try {
      const { authorizationId } = req.params;
      const { reason, additionalDocuments } = req.body;
      const userId = req.user?.id || 'anonymous';

      logger.info('Submitting appeal', {
        authorizationId,
        userId,
        reason
      });

      // Validate appeal data
      if (!reason || reason.trim().length < 10) {
        res.status(400).json({
          error: 'Appeal reason must be at least 10 characters long'
        });
        return;
      }

      // Execute appeal action
      const result = await this.workflowOrchestrator.executeAction(
        authorizationId,
        WorkflowAction.APPEAL,
        userId,
        {
          appealReason: reason,
          additionalDocuments: additionalDocuments || []
        }
      );

      if (result.success) {
        res.json({
          message: 'Appeal submitted successfully',
          authorizationId,
          appealId: this.generateAppealId(),
          estimatedReviewTime: '5-10 business days'
        });
      } else {
        res.status(400).json({
          error: 'Failed to submit appeal',
          reason: result.error
        });
      }

    } catch (error) {
      logger.error('Failed to submit appeal', { error });
      res.status(500).json({
        error: 'Failed to submit appeal',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get workflow metrics and analytics
   */
  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      logger.info('Retrieving workflow metrics');

      const metrics = this.workflowOrchestrator.getPerformanceMetrics();
      const activeWorkflowCount = this.workflowOrchestrator.getActiveWorkflowCount();
      const businessRulesStats = this.businessRules.getRuleExecutionStats();
      const notificationStats = this.notificationService.getDeliveryStats();
      const tasyIntegrationMetrics = this.tasyIntegration.getIntegrationMetrics();

      res.json({
        workflow: {
          ...metrics,
          activeWorkflows: activeWorkflowCount
        },
        businessRules: businessRulesStats,
        notifications: notificationStats,
        integration: tasyIntegrationMetrics,
        timestamp: new Date()
      });

    } catch (error) {
      logger.error('Failed to retrieve metrics', { error });
      res.status(500).json({
        error: 'Failed to retrieve metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(req: Request, res: Response): Promise<void> {
    try {
      const { regulation, startDate, endDate } = req.body;
      const userId = req.user?.id || 'anonymous';

      logger.info('Generating compliance report', {
        regulation,
        startDate,
        endDate,
        userId
      });

      // Validate parameters
      if (!regulation || !['LGPD', 'ANS', 'Internal'].includes(regulation)) {
        res.status(400).json({
          error: 'Invalid regulation type',
          validTypes: ['LGPD', 'ANS', 'Internal']
        });
        return;
      }

      const report = await this.auditService.generateComplianceReport({
        regulation,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      });

      res.json({
        message: 'Compliance report generated successfully',
        report
      });

    } catch (error) {
      logger.error('Failed to generate compliance report', { error });
      res.status(500).json({
        error: 'Failed to generate compliance report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search authorizations
   */
  async searchAuthorizations(req: Request, res: Response): Promise<void> {
    try {
      const {
        patientId,
        providerId,
        state,
        urgency,
        startDate,
        endDate,
        limit = 20,
        offset = 0
      } = req.query;

      logger.info('Searching authorizations', {
        patientId,
        providerId,
        state,
        limit,
        offset
      });

      // In production, implement actual search in database
      const mockResults = {
        total: 0,
        authorizations: [],
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
          totalPages: 0
        }
      };

      res.json(mockResults);

    } catch (error) {
      logger.error('Failed to search authorizations', { error });
      res.status(500).json({
        error: 'Failed to search authorizations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(req: Request, res: Response): Promise<void> {
    try {
      const tasyHealth = await this.tasyIntegration.getSystemHealth();
      
      const healthStatus = {
        status: 'healthy',
        timestamp: new Date(),
        services: {
          workflowOrchestrator: {
            status: 'healthy',
            activeWorkflows: this.workflowOrchestrator.getActiveWorkflowCount()
          },
          businessRules: {
            status: 'healthy',
            totalRules: this.businessRules.getAllRules().length
          },
          documentIntelligence: {
            status: 'healthy'
          },
          tasyIntegration: tasyHealth,
          notifications: {
            status: 'healthy'
          },
          audit: {
            status: 'healthy'
          }
        }
      };

      res.json(healthStatus);

    } catch (error) {
      logger.error('Failed to get health status', { error });
      res.status(500).json({
        error: 'Failed to get health status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Event handlers
  private handleWorkflowStarted(event: any): void {
    logger.info('Workflow started event received', event);
  }

  private handleWorkflowCompleted(event: any): void {
    logger.info('Workflow completed event received', event);
  }

  private handleAutoDecision(event: any): void {
    logger.info('Auto decision made event received', event);
  }

  private handleDocumentsProcessed(event: any): void {
    logger.info('Documents processed event received', event);
  }

  private handleTasySync(event: any): void {
    logger.info('Tasy sync event received', event);
  }

  private handleNotificationSent(event: any): void {
    logger.info('Notification sent event received', event);
  }

  private handleComplianceViolation(event: any): void {
    logger.warn('Compliance violation detected', event);
  }

  // Utility methods
  private generateAuthorizationId(): string {
    return `auth-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateDocumentId(): string {
    return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateAppealId(): string {
    return `appeal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private inferDocumentType(filename: string): DocumentType {
    const lowerName = filename.toLowerCase();
    
    if (lowerName.includes('receita') || lowerName.includes('prescription')) {
      return DocumentType.PRESCRIPTION;
    }
    if (lowerName.includes('exame') || lowerName.includes('exam')) {
      return DocumentType.EXAM_RESULTS;
    }
    if (lowerName.includes('cartao') || lowerName.includes('card')) {
      return DocumentType.INSURANCE_CARD;
    }
    if (lowerName.includes('identidade') || lowerName.includes('cpf') || lowerName.includes('id')) {
      return DocumentType.ID_DOCUMENT;
    }
    
    return DocumentType.MEDICAL_REPORT; // Default
  }

  private getPossibleActions(authorization: AuthorizationRequest): WorkflowAction[] {
    // In production, get from state machine
    const actionsByState: Record<AuthorizationState, WorkflowAction[]> = {
      [AuthorizationState.INITIATED]: [WorkflowAction.INITIATE, WorkflowAction.CANCEL],
      [AuthorizationState.DOCUMENT_COLLECTION]: [
        WorkflowAction.SUBMIT_DOCUMENTS,
        WorkflowAction.REQUEST_ADDITIONAL_INFO,
        WorkflowAction.CANCEL
      ],
      [AuthorizationState.MEDICAL_REVIEW]: [
        WorkflowAction.APPROVE,
        WorkflowAction.REJECT,
        WorkflowAction.REQUEST_ADDITIONAL_INFO,
        WorkflowAction.ESCALATE
      ],
      [AuthorizationState.ADMINISTRATIVE_REVIEW]: [
        WorkflowAction.APPROVE,
        WorkflowAction.REJECT,
        WorkflowAction.ESCALATE
      ],
      [AuthorizationState.APPROVED]: [],
      [AuthorizationState.REJECTED]: [WorkflowAction.APPEAL],
      [AuthorizationState.APPEALED]: [WorkflowAction.APPROVE, WorkflowAction.REJECT],
      [AuthorizationState.EXPIRED]: [],
      [AuthorizationState.CANCELED]: [],
      [AuthorizationState.ON_HOLD]: [WorkflowAction.RESUME, WorkflowAction.CANCEL],
      [AuthorizationState.PENDING_ADDITIONAL_INFO]: [
        WorkflowAction.PROVIDE_ADDITIONAL_INFO,
        WorkflowAction.CANCEL
      ]
    };

    return actionsByState[authorization.state] || [];
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.documentIntelligence.cleanup();
    await this.auditService.cleanup();
    this.tasyIntegration.cleanup();
    this.notificationService.cleanup();
    
    logger.info('Authorization controller cleaned up');
  }
}

// Create singleton instance
export const authorizationController = new AuthorizationController();

// Export route handlers
export const createAuthorization = authorizationController.createAuthorization.bind(authorizationController);
export const getAuthorization = authorizationController.getAuthorization.bind(authorizationController);
export const executeAction = authorizationController.executeAction.bind(authorizationController);
export const uploadDocuments = authorizationController.uploadDocuments.bind(authorizationController);
export const submitAppeal = authorizationController.submitAppeal.bind(authorizationController);
export const getMetrics = authorizationController.getMetrics.bind(authorizationController);
export const generateComplianceReport = authorizationController.generateComplianceReport.bind(authorizationController);
export const searchAuthorizations = authorizationController.searchAuthorizations.bind(authorizationController);
export const getHealthStatus = authorizationController.getHealthStatus.bind(authorizationController);