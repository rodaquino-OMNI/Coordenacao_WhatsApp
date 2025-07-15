import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { AuthorizationStateMachine } from './stateMachine';
import { BusinessRulesEngine } from './businessRulesEngine';
import { DocumentIntelligenceService } from './documentIntelligence';
import { TasyIntegrationService } from './tasyIntegration';
import { NotificationService } from './notificationService';
import { AuditService } from './auditService';
import {
  AuthorizationRequest,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowAction,
  AuthorizationState,
  Priority,
  WorkflowContext,
  WorkflowMetrics
} from '../types/authorization';

/**
 * Advanced Workflow Orchestration Engine
 * Manages complex authorization workflows with parallel processing,
 * intelligent routing, and automated decision making
 */
export class WorkflowOrchestrator extends EventEmitter {
  private stateMachine: AuthorizationStateMachine;
  private businessRules: BusinessRulesEngine;
  private documentIntelligence: DocumentIntelligenceService;
  private tasyIntegration: TasyIntegrationService;
  private notificationService: NotificationService;
  private auditService: AuditService;
  
  private activeWorkflows: Map<string, WorkflowContext>;
  private workflowDefinitions: Map<string, WorkflowDefinition>;
  private scheduledTasks: Map<string, NodeJS.Timeout>;
  private performanceMetrics: WorkflowMetrics;

  constructor(
    businessRules: BusinessRulesEngine,
    documentIntelligence: DocumentIntelligenceService,
    tasyIntegration: TasyIntegrationService,
    notificationService: NotificationService,
    auditService: AuditService
  ) {
    super();
    
    this.stateMachine = new AuthorizationStateMachine();
    this.businessRules = businessRules;
    this.documentIntelligence = documentIntelligence;
    this.tasyIntegration = tasyIntegration;
    this.notificationService = notificationService;
    this.auditService = auditService;
    
    this.activeWorkflows = new Map();
    this.workflowDefinitions = new Map();
    this.scheduledTasks = new Map();
    this.performanceMetrics = this.initializeMetrics();
    
    this.setupEventHandlers();
    this.loadWorkflowDefinitions();
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): WorkflowMetrics {
    return {
      totalRequests: 0,
      averageProcessingTime: 0,
      approvalRate: 0,
      rejectionRate: 0,
      appealRate: 0,
      slaComplianceRate: 0,
      bottlenecks: [],
      performanceByCategory: {}
    };
  }

  /**
   * Setup event handlers for state machine and services
   */
  private setupEventHandlers(): void {
    // State machine events
    this.stateMachine.on('stateTransition', this.handleStateTransition.bind(this));
    this.stateMachine.on('assignReviewer', this.handleReviewerAssignment.bind(this));
    this.stateMachine.on('sendNotification', this.handleNotification.bind(this));
    this.stateMachine.on('syncWithExternalSystem', this.handleExternalSync.bind(this));
    this.stateMachine.on('createAppeal', this.handleAppealCreation.bind(this));
    this.stateMachine.on('escalateReview', this.handleReviewEscalation.bind(this));

    // Business rules events
    this.businessRules.on('ruleEvaluated', this.handleRuleEvaluation.bind(this));
    this.businessRules.on('autoDecisionMade', this.handleAutoDecision.bind(this));

    // Document intelligence events
    this.documentIntelligence.on('documentProcessed', this.handleDocumentProcessed.bind(this));
    this.documentIntelligence.on('validationComplete', this.handleValidationComplete.bind(this));

    // External system events
    this.tasyIntegration.on('eligibilityChecked', this.handleEligibilityResult.bind(this));
    this.tasyIntegration.on('syncComplete', this.handleTasySyncComplete.bind(this));
  }

  /**
   * Load workflow definitions from database/configuration
   */
  private async loadWorkflowDefinitions(): Promise<void> {
    // In production, load from database
    // For now, define standard workflow
    const standardWorkflow: WorkflowDefinition = {
      id: 'standard-authorization',
      name: 'Standard Authorization Workflow',
      description: 'Default workflow for medical procedure authorization',
      version: '1.0.0',
      isActive: true,
      steps: [
        {
          id: 'initiation',
          name: 'Request Initiation',
          description: 'Initial request submission and validation',
          state: AuthorizationState.INITIATED,
          isAutomatic: true,
          timeoutMinutes: 60,
          nextSteps: ['document-collection'],
          actions: ['validateRequest', 'checkEligibility']
        },
        {
          id: 'document-collection',
          name: 'Document Collection',
          description: 'Collect and validate required documents',
          state: AuthorizationState.DOCUMENT_COLLECTION,
          isAutomatic: false,
          timeoutMinutes: 10080, // 7 days
          nextSteps: ['medical-review', 'auto-approval'],
          actions: ['processDocuments', 'validateDocuments']
        },
        {
          id: 'medical-review',
          name: 'Medical Review',
          description: 'Clinical review of medical necessity',
          state: AuthorizationState.MEDICAL_REVIEW,
          isAutomatic: false,
          requiredRole: 'medical_reviewer',
          timeoutMinutes: 4320, // 3 days
          nextSteps: ['administrative-review', 'approval', 'rejection'],
          actions: ['assignReviewer', 'escalateIfTimeout']
        },
        {
          id: 'administrative-review',
          name: 'Administrative Review',
          description: 'Administrative and financial review',
          state: AuthorizationState.ADMINISTRATIVE_REVIEW,
          isAutomatic: false,
          requiredRole: 'admin_reviewer',
          timeoutMinutes: 2880, // 2 days
          nextSteps: ['approval', 'rejection'],
          actions: ['verifyEligibility', 'checkCoverage']
        }
      ],
      transitions: {
        [AuthorizationState.INITIATED]: ['document-collection'],
        [AuthorizationState.DOCUMENT_COLLECTION]: ['medical-review', 'auto-approval'],
        [AuthorizationState.MEDICAL_REVIEW]: ['administrative-review', 'approval', 'rejection'],
        [AuthorizationState.ADMINISTRATIVE_REVIEW]: ['approval', 'rejection']
      },
      businessRules: [],
      slaTargets: {
        initiationToDecision: 168, // 7 days
        documentSubmissionTimeout: 168, // 7 days
        medicalReviewTimeout: 72, // 3 days
        administrativeReviewTimeout: 48 // 2 days
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.workflowDefinitions.set(standardWorkflow.id, standardWorkflow);
    logger.info('Workflow definitions loaded successfully');
  }

  /**
   * Start workflow for new authorization request
   */
  async startWorkflow(request: AuthorizationRequest, userId: string): Promise<void> {
    logger.info(`Starting workflow for authorization ${request.id}`, {
      procedureId: request.procedureId,
      patientId: request.patientId,
      urgency: request.urgency
    });

    // Create workflow context
    const context: WorkflowContext = {
      authorizationRequest: request,
      currentUser: userId,
      systemMetadata: {
        workflowStartTime: Date.now(),
        workflowDefinitionId: 'standard-authorization'
      }
    };

    // Store active workflow
    this.activeWorkflows.set(request.id, context);

    // Update metrics
    this.performanceMetrics.totalRequests++;

    // Audit workflow start
    await this.auditService.recordEvent({
      authorizationId: request.id,
      action: 'workflow_started',
      performedBy: userId,
      timestamp: new Date(),
      metadata: { workflowDefinitionId: 'standard-authorization' }
    });

    // Execute initial business rules
    await this.businessRules.evaluateInitialRules(context);

    // Check for auto-approval eligibility
    if (await this.checkAutoApprovalEligibility(context)) {
      await this.executeAction(request.id, WorkflowAction.APPROVE, userId);
      return;
    }

    // Start document collection phase
    await this.executeAction(request.id, WorkflowAction.INITIATE, userId);

    // Schedule timeout checks
    this.scheduleTimeoutCheck(request.id, 'initiation', 60);

    // Emit workflow started event
    this.emit('workflowStarted', {
      authorizationId: request.id,
      workflowDefinitionId: 'standard-authorization',
      startedBy: userId
    });
  }

  /**
   * Execute workflow action
   */
  async executeAction(
    authorizationId: string,
    action: WorkflowAction,
    userId: string,
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; error?: string }> {
    const context = this.activeWorkflows.get(authorizationId);
    if (!context) {
      const error = `No active workflow found for authorization ${authorizationId}`;
      logger.error(error);
      return { success: false, error };
    }

    // Update context
    context.currentUser = userId;
    if (metadata) {
      context.systemMetadata = { ...context.systemMetadata, ...metadata };
    }

    logger.info(`Executing action ${action} for authorization ${authorizationId}`, {
      currentState: context.authorizationRequest.state,
      performedBy: userId
    });

    // Execute state transition
    const result = await this.stateMachine.executeTransition(context, action);

    if (result.success && result.newState) {
      // Update request state
      context.authorizationRequest.state = result.newState;
      context.authorizationRequest.updatedAt = new Date();

      // Record audit trail
      await this.auditService.recordStateTransition({
        authorizationId,
        fromState: context.authorizationRequest.state,
        toState: result.newState,
        action,
        performedBy: userId,
        timestamp: new Date(),
        metadata
      });

      // Check if workflow is complete
      if (this.isWorkflowComplete(result.newState)) {
        await this.completeWorkflow(authorizationId);
      } else {
        // Schedule next steps
        await this.scheduleNextSteps(authorizationId, result.newState);
      }

      // Update performance metrics
      this.updatePerformanceMetrics(context, action, result.newState);
    }

    return result;
  }

  /**
   * Handle parallel document processing
   */
  async processDocumentsParallel(authorizationId: string): Promise<void> {
    const context = this.activeWorkflows.get(authorizationId);
    if (!context) return;

    const documents = context.authorizationRequest.documents;
    logger.info(`Processing ${documents.length} documents in parallel for authorization ${authorizationId}`);

    // Process all documents concurrently
    const processingPromises = documents.map(async (document) => {
      try {
        // Extract text using OCR
        const ocrResult = await this.documentIntelligence.extractText(document);
        
        // Validate document content
        const validationResult = await this.documentIntelligence.validateDocument(document, ocrResult);
        
        // Update document status
        document.isValid = validationResult.isValid;
        document.validationNotes = validationResult.notes;
        document.ocrData = ocrResult;

        return { documentId: document.id, success: true };
      } catch (error) {
        logger.error(`Failed to process document ${document.id}`, { error });
        return { documentId: document.id, success: false, error };
      }
    });

    // Wait for all processing to complete
    const results = await Promise.all(processingPromises);
    
    // Check if all documents are valid
    const allValid = documents.every(doc => doc.isValid);
    const hasRequired = this.hasAllRequiredDocuments(context.authorizationRequest);

    if (allValid && hasRequired) {
      // Move to next phase
      await this.executeAction(authorizationId, WorkflowAction.SUBMIT_DOCUMENTS, 'system');
    } else {
      // Request additional documents
      await this.executeAction(authorizationId, WorkflowAction.REQUEST_ADDITIONAL_INFO, 'system');
    }

    // Emit document processing complete event
    this.emit('documentsProcessed', {
      authorizationId,
      results,
      allValid,
      hasRequired
    });
  }

  /**
   * Assign reviewer based on workload and expertise
   */
  async assignReviewer(
    authorizationId: string,
    reviewType: 'medical' | 'administrative',
    urgency: Priority
  ): Promise<string | null> {
    // In production, implement intelligent reviewer assignment
    // Consider: workload, expertise, availability, urgency
    
    logger.info(`Assigning ${reviewType} reviewer for authorization ${authorizationId}`, { urgency });

    // Mock implementation - in production, query reviewer database
    const mockReviewerId = `reviewer-${reviewType}-${Date.now()}`;

    // Schedule escalation if not reviewed within SLA
    const escalationMinutes = urgency === 'emergency' ? 60 : 
                             urgency === 'urgent' ? 240 : 
                             reviewType === 'medical' ? 4320 : 2880;

    this.scheduleEscalation(authorizationId, mockReviewerId, escalationMinutes);

    return mockReviewerId;
  }

  /**
   * Check auto-approval eligibility
   */
  private async checkAutoApprovalEligibility(context: WorkflowContext): Promise<boolean> {
    const request = context.authorizationRequest;
    
    // Business rules for auto-approval
    const autoApprovalCriteria = {
      maxCost: 1000,
      allowedUrgency: ['low', 'medium'],
      requiredDocumentTypes: ['prescription', 'medical_report'],
      patientHistoryCheck: true
    };

    // Check cost threshold
    if (request.estimatedCost > autoApprovalCriteria.maxCost) {
      return false;
    }

    // Check urgency level
    if (!autoApprovalCriteria.allowedUrgency.includes(request.urgency)) {
      return false;
    }

    // Check if all required documents are present and valid
    const hasRequiredDocs = this.hasAllRequiredDocuments(request);
    if (!hasRequiredDocs) {
      return false;
    }

    // Check patient eligibility via Tasy
    try {
      const isEligible = await this.tasyIntegration.checkEligibility(
        request.patientId,
        request.procedureId
      );
      if (!isEligible) {
        return false;
      }
    } catch (error) {
      logger.error('Failed to check patient eligibility', { error });
      return false;
    }

    // Evaluate business rules
    const ruleResult = await this.businessRules.evaluateAutoApprovalRules(context);
    
    return ruleResult.approved;
  }

  /**
   * Schedule timeout checks
   */
  private scheduleTimeoutCheck(
    authorizationId: string,
    step: string,
    timeoutMinutes: number
  ): void {
    const timeoutMs = timeoutMinutes * 60 * 1000;
    const timeoutId = setTimeout(async () => {
      await this.handleTimeout(authorizationId, step);
    }, timeoutMs);

    this.scheduledTasks.set(`${authorizationId}-${step}`, timeoutId);
  }

  /**
   * Schedule escalation
   */
  private scheduleEscalation(
    authorizationId: string,
    reviewerId: string,
    escalationMinutes: number
  ): void {
    const escalationMs = escalationMinutes * 60 * 1000;
    const timeoutId = setTimeout(async () => {
      await this.handleReviewEscalation({
        authorizationId,
        currentReviewer: reviewerId
      });
    }, escalationMs);

    this.scheduledTasks.set(`${authorizationId}-escalation`, timeoutId);
  }

  /**
   * Handle timeout events
   */
  private async handleTimeout(authorizationId: string, step: string): Promise<void> {
    logger.warn(`Timeout occurred for authorization ${authorizationId} at step ${step}`);

    const context = this.activeWorkflows.get(authorizationId);
    if (!context) return;

    // Handle different timeout scenarios
    switch (step) {
      case 'initiation':
        // Cancel if no documents submitted
        await this.executeAction(authorizationId, WorkflowAction.CANCEL, 'system');
        break;
      
      case 'document-collection':
        // Move to expired state
        await this.executeAction(authorizationId, WorkflowAction.EXPIRE, 'system');
        break;
      
      case 'medical-review':
      case 'administrative-review':
        // Escalate to senior reviewer
        await this.executeAction(authorizationId, WorkflowAction.ESCALATE, 'system');
        break;
    }

    // Emit timeout event
    this.emit('timeoutOccurred', {
      authorizationId,
      step,
      timestamp: new Date()
    });
  }

  /**
   * Schedule next steps based on current state
   */
  private async scheduleNextSteps(
    authorizationId: string,
    currentState: AuthorizationState
  ): Promise<void> {
    const workflowDefinition = this.workflowDefinitions.get('standard-authorization');
    if (!workflowDefinition) return;

    const currentStep = workflowDefinition.steps.find(step => step.state === currentState);
    if (!currentStep) return;

    // Schedule timeout for current step
    if (currentStep.timeoutMinutes) {
      this.scheduleTimeoutCheck(authorizationId, currentStep.id, currentStep.timeoutMinutes);
    }

    // Execute automatic actions
    if (currentStep.isAutomatic && currentStep.actions) {
      for (const actionName of currentStep.actions) {
        await this.executeStepAction(authorizationId, actionName);
      }
    }
  }

  /**
   * Execute step-specific actions
   */
  private async executeStepAction(authorizationId: string, actionName: string): Promise<void> {
    const context = this.activeWorkflows.get(authorizationId);
    if (!context) return;

    switch (actionName) {
      case 'validateRequest':
        await this.businessRules.validateRequest(context);
        break;
      
      case 'checkEligibility':
        await this.tasyIntegration.checkEligibility(
          context.authorizationRequest.patientId,
          context.authorizationRequest.procedureId
        );
        break;
      
      case 'processDocuments':
        await this.processDocumentsParallel(authorizationId);
        break;
      
      case 'assignReviewer':
        await this.assignReviewer(authorizationId, 'medical', context.authorizationRequest.urgency);
        break;
      
      case 'verifyEligibility':
        // Comprehensive eligibility check
        break;
      
      case 'checkCoverage':
        // Check insurance coverage
        break;
    }
  }

  /**
   * Check if all required documents are present
   */
  private hasAllRequiredDocuments(request: AuthorizationRequest): boolean {
    const providedTypes = request.documents.map(doc => doc.type);
    return request.requiredDocuments.every(requiredType => 
      providedTypes.includes(requiredType)
    );
  }

  /**
   * Check if workflow is complete
   */
  private isWorkflowComplete(state: AuthorizationState): boolean {
    return [
      AuthorizationState.APPROVED,
      AuthorizationState.REJECTED,
      AuthorizationState.EXPIRED,
      AuthorizationState.CANCELED
    ].includes(state);
  }

  /**
   * Complete workflow
   */
  private async completeWorkflow(authorizationId: string): Promise<void> {
    const context = this.activeWorkflows.get(authorizationId);
    if (!context) return;

    const startTime = context.systemMetadata.workflowStartTime as number;
    const processingTime = Date.now() - startTime;

    logger.info(`Workflow completed for authorization ${authorizationId}`, {
      finalState: context.authorizationRequest.state,
      processingTimeMs: processingTime
    });

    // Clean up scheduled tasks
    this.cleanupScheduledTasks(authorizationId);

    // Update metrics
    this.updateCompletionMetrics(context, processingTime);

    // Remove from active workflows
    this.activeWorkflows.delete(authorizationId);

    // Emit completion event
    this.emit('workflowCompleted', {
      authorizationId,
      finalState: context.authorizationRequest.state,
      processingTime
    });
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(
    context: WorkflowContext,
    action: WorkflowAction,
    newState: AuthorizationState
  ): void {
    // Implementation for real-time metrics updates
    if (newState === AuthorizationState.APPROVED) {
      this.performanceMetrics.approvalRate = this.calculateApprovalRate();
    } else if (newState === AuthorizationState.REJECTED) {
      this.performanceMetrics.rejectionRate = this.calculateRejectionRate();
    }
  }

  /**
   * Update completion metrics
   */
  private updateCompletionMetrics(context: WorkflowContext, processingTime: number): void {
    // Update average processing time
    const currentAvg = this.performanceMetrics.averageProcessingTime;
    const totalRequests = this.performanceMetrics.totalRequests;
    
    this.performanceMetrics.averageProcessingTime = 
      (currentAvg * (totalRequests - 1) + processingTime) / totalRequests;
  }

  /**
   * Calculate approval rate
   */
  private calculateApprovalRate(): number {
    // Implementation for calculating current approval rate
    return 0.85; // Mock value
  }

  /**
   * Calculate rejection rate
   */
  private calculateRejectionRate(): number {
    // Implementation for calculating current rejection rate
    return 0.15; // Mock value
  }

  /**
   * Clean up scheduled tasks for authorization
   */
  private cleanupScheduledTasks(authorizationId: string): void {
    for (const [taskId, timeout] of this.scheduledTasks.entries()) {
      if (taskId.startsWith(authorizationId)) {
        clearTimeout(timeout);
        this.scheduledTasks.delete(taskId);
      }
    }
  }

  // Event handlers
  private async handleStateTransition(event: any): Promise<void> {
    logger.info('State transition occurred', event);
  }

  private async handleReviewerAssignment(event: any): Promise<void> {
    const reviewerId = await this.assignReviewer(
      event.authorizationId,
      event.reviewType,
      event.urgency
    );
    
    if (reviewerId) {
      await this.notificationService.sendReviewerAssignment(event.authorizationId, reviewerId);
    }
  }

  private async handleNotification(event: any): Promise<void> {
    await this.notificationService.sendNotification(event);
  }

  private async handleExternalSync(event: any): Promise<void> {
    if (event.system === 'tasy') {
      await this.tasyIntegration.syncAuthorizationStatus(event.authorizationId);
    }
  }

  private async handleAppealCreation(event: any): Promise<void> {
    logger.info('Creating appeal record', event);
    // Implementation for appeal creation
  }

  private async handleReviewEscalation(event: any): Promise<void> {
    logger.info('Escalating review', event);
    // Implementation for review escalation
  }

  private async handleRuleEvaluation(event: any): Promise<void> {
    logger.info('Business rule evaluated', event);
  }

  private async handleAutoDecision(event: any): Promise<void> {
    await this.executeAction(
      event.authorizationId,
      event.decision === 'approve' ? WorkflowAction.APPROVE : WorkflowAction.REJECT,
      'system'
    );
  }

  private async handleDocumentProcessed(event: any): Promise<void> {
    logger.info('Document processed', event);
  }

  private async handleValidationComplete(event: any): Promise<void> {
    if (event.allDocumentsValid) {
      await this.executeAction(event.authorizationId, WorkflowAction.SUBMIT_DOCUMENTS, 'system');
    }
  }

  private async handleEligibilityResult(event: any): Promise<void> {
    logger.info('Eligibility check result', event);
  }

  private async handleTasySyncComplete(event: any): Promise<void> {
    logger.info('Tasy sync completed', event);
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): WorkflowMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get active workflow count
   */
  getActiveWorkflowCount(): number {
    return this.activeWorkflows.size;
  }

  /**
   * Get workflow status
   */
  getWorkflowStatus(authorizationId: string): WorkflowContext | null {
    return this.activeWorkflows.get(authorizationId) || null;
  }
}