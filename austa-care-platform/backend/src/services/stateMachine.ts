import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  AuthorizationState,
  WorkflowAction,
  StateTransition,
  WorkflowEvent,
  WorkflowContext,
  AuthorizationRequest
} from '../types/authorization';

/**
 * Advanced State Machine Engine for Authorization Workflow
 * Handles complex state transitions, validations, and side effects
 */
export class AuthorizationStateMachine extends EventEmitter {
  private transitions: Map<string, StateTransition[]>;
  private guards: Map<string, (context: WorkflowContext) => boolean>;
  private actions: Map<string, (context: WorkflowContext) => Promise<void>>;

  constructor() {
    super();
    this.transitions = new Map();
    this.guards = new Map();
    this.actions = new Map();
    this.initializeStateMachine();
  }

  /**
   * Initialize state machine with all valid transitions
   */
  private initializeStateMachine(): void {
    // Define all valid state transitions
    const validTransitions: StateTransition[] = [
      // From INITIATED
      {
        from: AuthorizationState.INITIATED,
        to: AuthorizationState.DOCUMENT_COLLECTION,
        action: WorkflowAction.INITIATE,
        conditions: { hasRequiredInfo: true }
      },
      {
        from: AuthorizationState.INITIATED,
        to: AuthorizationState.CANCELED,
        action: WorkflowAction.CANCEL
      },

      // From DOCUMENT_COLLECTION
      {
        from: AuthorizationState.DOCUMENT_COLLECTION,
        to: AuthorizationState.MEDICAL_REVIEW,
        action: WorkflowAction.SUBMIT_DOCUMENTS,
        conditions: { allDocumentsProvided: true, documentsValid: true },
        sideEffects: ['assignMedicalReviewer', 'sendNotificationToReviewer']
      },
      {
        from: AuthorizationState.DOCUMENT_COLLECTION,
        to: AuthorizationState.PENDING_ADDITIONAL_INFO,
        action: WorkflowAction.REQUEST_ADDITIONAL_INFO,
        sideEffects: ['sendAdditionalInfoRequest']
      },
      {
        from: AuthorizationState.DOCUMENT_COLLECTION,
        to: AuthorizationState.APPROVED,
        action: WorkflowAction.APPROVE,
        conditions: { isAutoApprovalEligible: true },
        sideEffects: ['sendApprovalNotification', 'syncWithTasy']
      },
      {
        from: AuthorizationState.DOCUMENT_COLLECTION,
        to: AuthorizationState.EXPIRED,
        action: WorkflowAction.EXPIRE,
        conditions: { hasExpired: true }
      },

      // From PENDING_ADDITIONAL_INFO
      {
        from: AuthorizationState.PENDING_ADDITIONAL_INFO,
        to: AuthorizationState.DOCUMENT_COLLECTION,
        action: WorkflowAction.PROVIDE_ADDITIONAL_INFO
      },
      {
        from: AuthorizationState.PENDING_ADDITIONAL_INFO,
        to: AuthorizationState.EXPIRED,
        action: WorkflowAction.EXPIRE,
        conditions: { hasExpired: true }
      },
      {
        from: AuthorizationState.PENDING_ADDITIONAL_INFO,
        to: AuthorizationState.CANCELED,
        action: WorkflowAction.CANCEL
      },

      // From MEDICAL_REVIEW
      {
        from: AuthorizationState.MEDICAL_REVIEW,
        to: AuthorizationState.ADMINISTRATIVE_REVIEW,
        action: WorkflowAction.COMPLETE_MEDICAL_REVIEW,
        conditions: { medicalReviewApproved: true },
        sideEffects: ['assignAdministrativeReviewer']
      },
      {
        from: AuthorizationState.MEDICAL_REVIEW,
        to: AuthorizationState.REJECTED,
        action: WorkflowAction.REJECT,
        conditions: { medicalReviewRejected: true },
        sideEffects: ['sendRejectionNotification', 'syncWithTasy']
      },
      {
        from: AuthorizationState.MEDICAL_REVIEW,
        to: AuthorizationState.PENDING_ADDITIONAL_INFO,
        action: WorkflowAction.REQUEST_ADDITIONAL_INFO,
        sideEffects: ['sendAdditionalInfoRequest']
      },
      {
        from: AuthorizationState.MEDICAL_REVIEW,
        to: AuthorizationState.ON_HOLD,
        action: WorkflowAction.PUT_ON_HOLD,
        sideEffects: ['sendHoldNotification']
      },
      {
        from: AuthorizationState.MEDICAL_REVIEW,
        to: AuthorizationState.APPROVED,
        action: WorkflowAction.APPROVE,
        conditions: { isSimpleProcedure: true, medicalReviewApproved: true },
        sideEffects: ['sendApprovalNotification', 'syncWithTasy']
      },

      // From ADMINISTRATIVE_REVIEW
      {
        from: AuthorizationState.ADMINISTRATIVE_REVIEW,
        to: AuthorizationState.APPROVED,
        action: WorkflowAction.APPROVE,
        conditions: { adminReviewApproved: true, eligibilityConfirmed: true, coverageConfirmed: true },
        sideEffects: ['sendApprovalNotification', 'syncWithTasy']
      },
      {
        from: AuthorizationState.ADMINISTRATIVE_REVIEW,
        to: AuthorizationState.REJECTED,
        action: WorkflowAction.REJECT,
        conditions: { adminReviewRejected: true },
        sideEffects: ['sendRejectionNotification', 'syncWithTasy']
      },
      {
        from: AuthorizationState.ADMINISTRATIVE_REVIEW,
        to: AuthorizationState.PENDING_ADDITIONAL_INFO,
        action: WorkflowAction.REQUEST_ADDITIONAL_INFO,
        sideEffects: ['sendAdditionalInfoRequest']
      },
      {
        from: AuthorizationState.ADMINISTRATIVE_REVIEW,
        to: AuthorizationState.ON_HOLD,
        action: WorkflowAction.PUT_ON_HOLD,
        sideEffects: ['sendHoldNotification']
      },

      // From ON_HOLD
      {
        from: AuthorizationState.ON_HOLD,
        to: AuthorizationState.MEDICAL_REVIEW,
        action: WorkflowAction.RESUME,
        conditions: { wasInMedicalReview: true }
      },
      {
        from: AuthorizationState.ON_HOLD,
        to: AuthorizationState.ADMINISTRATIVE_REVIEW,
        action: WorkflowAction.RESUME,
        conditions: { wasInAdministrativeReview: true }
      },
      {
        from: AuthorizationState.ON_HOLD,
        to: AuthorizationState.EXPIRED,
        action: WorkflowAction.EXPIRE,
        conditions: { hasExpired: true }
      },

      // From REJECTED
      {
        from: AuthorizationState.REJECTED,
        to: AuthorizationState.APPEALED,
        action: WorkflowAction.APPEAL,
        sideEffects: ['createAppealRecord', 'assignAppealReviewer']
      },

      // From APPEALED
      {
        from: AuthorizationState.APPEALED,
        to: AuthorizationState.APPROVED,
        action: WorkflowAction.APPROVE,
        conditions: { appealApproved: true },
        sideEffects: ['sendApprovalNotification', 'syncWithTasy', 'recordAppealOutcome']
      },
      {
        from: AuthorizationState.APPEALED,
        to: AuthorizationState.REJECTED,
        action: WorkflowAction.REJECT,
        conditions: { appealRejected: true },
        sideEffects: ['sendFinalRejectionNotification', 'syncWithTasy', 'recordAppealOutcome']
      },

      // Escalation transitions (from any state)
      {
        from: AuthorizationState.MEDICAL_REVIEW,
        to: AuthorizationState.MEDICAL_REVIEW,
        action: WorkflowAction.ESCALATE,
        sideEffects: ['escalateToSeniorReviewer']
      },
      {
        from: AuthorizationState.ADMINISTRATIVE_REVIEW,
        to: AuthorizationState.ADMINISTRATIVE_REVIEW,
        action: WorkflowAction.ESCALATE,
        sideEffects: ['escalateToSeniorReviewer']
      }
    ];

    // Group transitions by state
    validTransitions.forEach(transition => {
      const key = `${transition.from}-${transition.action}`;
      if (!this.transitions.has(key)) {
        this.transitions.set(key, []);
      }
      this.transitions.get(key)!.push(transition);
    });

    // Initialize guards
    this.initializeGuards();

    // Initialize side effect actions
    this.initializeSideEffects();
  }

  /**
   * Initialize guard conditions
   */
  private initializeGuards(): void {
    this.guards.set('hasRequiredInfo', (context) => {
      const request = context.authorizationRequest;
      return !!(request.clinicalJustification && request.procedureId && request.patientId);
    });

    this.guards.set('allDocumentsProvided', (context) => {
      const request = context.authorizationRequest;
      return request.missingDocuments.length === 0;
    });

    this.guards.set('documentsValid', (context) => {
      const request = context.authorizationRequest;
      return request.documents.every(doc => doc.isValid);
    });

    this.guards.set('isAutoApprovalEligible', (context) => {
      const request = context.authorizationRequest;
      // Auto-approval logic based on procedure type, cost, and patient history
      return request.estimatedCost < 1000 && request.urgency !== 'emergency';
    });

    this.guards.set('hasExpired', (context) => {
      const request = context.authorizationRequest;
      return request.expiresAt ? new Date() > request.expiresAt : false;
    });

    this.guards.set('medicalReviewApproved', (context) => {
      const request = context.authorizationRequest;
      return request.medicalReview?.decision === 'approved';
    });

    this.guards.set('medicalReviewRejected', (context) => {
      const request = context.authorizationRequest;
      return request.medicalReview?.decision === 'rejected';
    });

    this.guards.set('adminReviewApproved', (context) => {
      const request = context.authorizationRequest;
      return request.administrativeReview?.decision === 'approved';
    });

    this.guards.set('adminReviewRejected', (context) => {
      const request = context.authorizationRequest;
      return request.administrativeReview?.decision === 'rejected';
    });

    this.guards.set('eligibilityConfirmed', (context) => {
      const request = context.authorizationRequest;
      return request.administrativeReview?.eligibilityConfirmed === true;
    });

    this.guards.set('coverageConfirmed', (context) => {
      const request = context.authorizationRequest;
      return request.administrativeReview?.coverageConfirmed === true;
    });

    this.guards.set('isSimpleProcedure', (context) => {
      // Logic to determine if procedure bypasses administrative review
      return context.authorizationRequest.estimatedCost < 500;
    });

    this.guards.set('wasInMedicalReview', (context) => {
      const request = context.authorizationRequest;
      return request.auditTrail.some(entry => 
        entry.fromState === AuthorizationState.MEDICAL_REVIEW
      );
    });

    this.guards.set('wasInAdministrativeReview', (context) => {
      const request = context.authorizationRequest;
      return request.auditTrail.some(entry => 
        entry.fromState === AuthorizationState.ADMINISTRATIVE_REVIEW
      );
    });

    this.guards.set('appealApproved', (context) => {
      const request = context.authorizationRequest;
      const latestAppeal = request.appeals[request.appeals.length - 1];
      return latestAppeal?.status === 'approved';
    });

    this.guards.set('appealRejected', (context) => {
      const request = context.authorizationRequest;
      const latestAppeal = request.appeals[request.appeals.length - 1];
      return latestAppeal?.status === 'rejected';
    });
  }

  /**
   * Initialize side effect actions
   */
  private initializeSideEffects(): void {
    this.actions.set('assignMedicalReviewer', async (context) => {
      // Auto-assign medical reviewer based on specialty and workload
      logger.info(`Assigning medical reviewer for authorization ${context.authorizationRequest.id}`);
      this.emit('assignReviewer', {
        authorizationId: context.authorizationRequest.id,
        reviewType: 'medical',
        urgency: context.authorizationRequest.urgency
      });
    });

    this.actions.set('assignAdministrativeReviewer', async (context) => {
      logger.info(`Assigning administrative reviewer for authorization ${context.authorizationRequest.id}`);
      this.emit('assignReviewer', {
        authorizationId: context.authorizationRequest.id,
        reviewType: 'administrative',
        urgency: context.authorizationRequest.urgency
      });
    });

    this.actions.set('sendNotificationToReviewer', async (context) => {
      this.emit('sendNotification', {
        authorizationId: context.authorizationRequest.id,
        type: 'reviewer_assignment',
        urgency: context.authorizationRequest.urgency
      });
    });

    this.actions.set('sendApprovalNotification', async (context) => {
      this.emit('sendNotification', {
        authorizationId: context.authorizationRequest.id,
        type: 'approval',
        recipients: ['patient', 'provider']
      });
    });

    this.actions.set('sendRejectionNotification', async (context) => {
      this.emit('sendNotification', {
        authorizationId: context.authorizationRequest.id,
        type: 'rejection',
        recipients: ['patient', 'provider']
      });
    });

    this.actions.set('sendAdditionalInfoRequest', async (context) => {
      this.emit('sendNotification', {
        authorizationId: context.authorizationRequest.id,
        type: 'additional_info_request',
        recipients: ['patient', 'provider']
      });
    });

    this.actions.set('syncWithTasy', async (context) => {
      this.emit('syncWithExternalSystem', {
        system: 'tasy',
        authorizationId: context.authorizationRequest.id,
        action: 'updateStatus'
      });
    });

    this.actions.set('createAppealRecord', async (context) => {
      logger.info(`Creating appeal record for authorization ${context.authorizationRequest.id}`);
      this.emit('createAppeal', {
        authorizationId: context.authorizationRequest.id
      });
    });

    this.actions.set('escalateToSeniorReviewer', async (context) => {
      this.emit('escalateReview', {
        authorizationId: context.authorizationRequest.id,
        currentReviewer: context.authorizationRequest.assignedTo
      });
    });

    this.actions.set('sendHoldNotification', async (context) => {
      this.emit('sendNotification', {
        authorizationId: context.authorizationRequest.id,
        type: 'put_on_hold',
        recipients: ['patient', 'provider']
      });
    });

    this.actions.set('recordAppealOutcome', async (context) => {
      logger.info(`Recording appeal outcome for authorization ${context.authorizationRequest.id}`);
      this.emit('recordAppealOutcome', {
        authorizationId: context.authorizationRequest.id
      });
    });

    this.actions.set('sendFinalRejectionNotification', async (context) => {
      this.emit('sendNotification', {
        authorizationId: context.authorizationRequest.id,
        type: 'final_rejection',
        recipients: ['patient', 'provider']
      });
    });
  }

  /**
   * Execute state transition
   */
  async executeTransition(
    context: WorkflowContext,
    action: WorkflowAction
  ): Promise<{ success: boolean; newState?: AuthorizationState; error?: string }> {
    const currentState = context.authorizationRequest.state;
    const key = `${currentState}-${action}`;
    
    logger.info(`Attempting transition: ${currentState} -> ${action}`, {
      authorizationId: context.authorizationRequest.id,
      performedBy: context.currentUser
    });

    const possibleTransitions = this.transitions.get(key);
    if (!possibleTransitions) {
      const error = `No valid transition from ${currentState} with action ${action}`;
      logger.warn(error, { authorizationId: context.authorizationRequest.id });
      return { success: false, error };
    }

    // Find the first transition that satisfies all conditions
    for (const transition of possibleTransitions) {
      if (await this.evaluateConditions(transition, context)) {
        try {
          // Execute side effects
          if (transition.sideEffects) {
            await this.executeSideEffects(transition.sideEffects, context);
          }

          logger.info(`Transition successful: ${currentState} -> ${transition.to}`, {
            authorizationId: context.authorizationRequest.id,
            action,
            performedBy: context.currentUser
          });

          // Emit transition event
          this.emit('stateTransition', {
            authorizationId: context.authorizationRequest.id,
            from: currentState,
            to: transition.to,
            action,
            performedBy: context.currentUser,
            timestamp: new Date()
          });

          return { success: true, newState: transition.to };
        } catch (error) {
          logger.error('Error executing transition side effects', {
            error: error instanceof Error ? error.message : 'Unknown error',
            authorizationId: context.authorizationRequest.id,
            transition
          });
          return { 
            success: false, 
            error: `Failed to execute transition: ${error instanceof Error ? error.message : 'Unknown error'}` 
          };
        }
      }
    }

    const error = `Transition conditions not met for ${currentState} -> ${action}`;
    logger.warn(error, { authorizationId: context.authorizationRequest.id });
    return { success: false, error };
  }

  /**
   * Evaluate all conditions for a transition
   */
  private async evaluateConditions(
    transition: StateTransition,
    context: WorkflowContext
  ): Promise<boolean> {
    if (!transition.conditions) {
      return true;
    }

    for (const [conditionName, expectedValue] of Object.entries(transition.conditions)) {
      const guard = this.guards.get(conditionName);
      if (!guard) {
        logger.warn(`Unknown guard condition: ${conditionName}`);
        return false;
      }

      const result = guard(context);
      if (result !== expectedValue) {
        logger.debug(`Guard condition failed: ${conditionName}`, {
          expected: expectedValue,
          actual: result,
          authorizationId: context.authorizationRequest.id
        });
        return false;
      }
    }

    return true;
  }

  /**
   * Execute side effects for a transition
   */
  private async executeSideEffects(
    sideEffects: string[],
    context: WorkflowContext
  ): Promise<void> {
    for (const effectName of sideEffects) {
      const action = this.actions.get(effectName);
      if (action) {
        await action(context);
      } else {
        logger.warn(`Unknown side effect: ${effectName}`);
      }
    }
  }

  /**
   * Get possible actions from current state
   */
  getPossibleActions(currentState: AuthorizationState): WorkflowAction[] {
    const actions: WorkflowAction[] = [];
    
    for (const [key, transitions] of this.transitions.entries()) {
      const [state, action] = key.split('-');
      if (state === currentState) {
        actions.push(action as WorkflowAction);
      }
    }

    return [...new Set(actions)]; // Remove duplicates
  }

  /**
   * Validate if transition is possible
   */
  isTransitionValid(
    from: AuthorizationState,
    action: WorkflowAction,
    context?: WorkflowContext
  ): boolean {
    const key = `${from}-${action}`;
    const transitions = this.transitions.get(key);
    
    if (!transitions) {
      return false;
    }

    // If no context provided, just check if transition exists
    if (!context) {
      return true;
    }

    // Check if any transition satisfies conditions
    return transitions.some(transition => {
      if (!transition.conditions) return true;
      
      return Object.entries(transition.conditions).every(([conditionName, expectedValue]) => {
        const guard = this.guards.get(conditionName);
        return guard ? guard(context) === expectedValue : false;
      });
    });
  }

  /**
   * Get state machine visualization data
   */
  getStateMachineDefinition() {
    const states = Object.values(AuthorizationState);
    const transitions = Array.from(this.transitions.entries()).map(([key, transitions]) => {
      const [from, action] = key.split('-');
      return transitions.map(t => ({
        from: from as AuthorizationState,
        to: t.to,
        action: action as WorkflowAction,
        conditions: t.conditions,
        sideEffects: t.sideEffects
      }));
    }).flat();

    return { states, transitions };
  }
}