import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import {
  BusinessRule,
  WorkflowContext,
  AuthorizationRequest,
  ProcedureCategory,
  Priority,
  DocumentType
} from '../types/authorization';

/**
 * Business Rules Engine for Authorization Decisions
 * Implements configurable rules for eligibility, coverage, and automated decision making
 */
export class BusinessRulesEngine extends EventEmitter {
  private rules: Map<string, BusinessRule>;
  private rulesByCategory: Map<string, BusinessRule[]>;
  private ruleExecutionCache: Map<string, any>;

  constructor() {
    super();
    this.rules = new Map();
    this.rulesByCategory = new Map();
    this.ruleExecutionCache = new Map();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default business rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: BusinessRule[] = [
      // Auto-approval rules
      {
        id: 'auto-approval-low-cost',
        name: 'Auto Approval for Low Cost Procedures',
        description: 'Automatically approve procedures under R$ 500 with valid documents',
        ruleType: 'auto_approval',
        conditions: {
          'procedure.estimatedCost': { operator: '<', value: 500 },
          'request.urgency': { operator: 'in', value: ['low', 'medium'] },
          'documents.allValid': { operator: '==', value: true },
          'documents.allRequired': { operator: '==', value: true },
          'patient.eligibility': { operator: '==', value: true }
        },
        actions: {
          decision: 'approve',
          skipReview: true,
          notifyParties: ['patient', 'provider'],
          syncWithTasy: true
        },
        priority: 100,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Eligibility rules
      {
        id: 'eligibility-active-coverage',
        name: 'Active Coverage Requirement',
        description: 'Patient must have active insurance coverage',
        ruleType: 'eligibility',
        conditions: {
          'patient.coverage.status': { operator: '==', value: 'active' },
          'patient.coverage.expiryDate': { operator: '>', value: 'now' }
        },
        actions: {
          decision: 'eligible',
          checkCoverage: true
        },
        priority: 200,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Medical necessity rules
      {
        id: 'medical-necessity-emergency',
        name: 'Emergency Procedure Necessity',
        description: 'Emergency procedures require immediate medical review',
        ruleType: 'medical_necessity',
        procedureCategory: ProcedureCategory.EMERGENCY,
        conditions: {
          'request.urgency': { operator: '==', value: 'emergency' },
          'documents.medicalReport': { operator: '==', value: true },
          'documents.emergencyJustification': { operator: '==', value: true }
        },
        actions: {
          requireMedicalReview: true,
          escalatePriority: 'urgent',
          notifyReviewer: true,
          timeoutMinutes: 60
        },
        priority: 300,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Coverage rules
      {
        id: 'coverage-surgical-procedures',
        name: 'Surgical Procedure Coverage',
        description: 'Surgical procedures require specific coverage verification',
        ruleType: 'coverage',
        procedureCategory: ProcedureCategory.SURGICAL,
        conditions: {
          'procedure.category': { operator: '==', value: 'surgical' },
          'patient.plan.coversSurgical': { operator: '==', value: true },
          'procedure.estimatedCost': { operator: '<=', value: 'patient.plan.surgicalLimit' }
        },
        actions: {
          verifyCoverage: true,
          checkPreAuthorization: true,
          requireAdminReview: true
        },
        priority: 150,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Authorization required rules
      {
        id: 'authorization-high-cost',
        name: 'High Cost Procedure Authorization',
        description: 'Procedures over R$ 5000 require authorization',
        ruleType: 'authorization_required',
        conditions: {
          'procedure.estimatedCost': { operator: '>', value: 5000 }
        },
        actions: {
          requireAuthorization: true,
          requireMedicalReview: true,
          requireAdminReview: true,
          escalatePriority: 'high'
        },
        priority: 250,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Document requirement rules
      {
        id: 'documents-diagnostic-procedures',
        name: 'Diagnostic Procedure Document Requirements',
        description: 'Diagnostic procedures require specific documents',
        ruleType: 'authorization_required',
        procedureCategory: ProcedureCategory.DIAGNOSTIC,
        conditions: {
          'procedure.category': { operator: '==', value: 'diagnostic' }
        },
        actions: {
          requiredDocuments: [
            DocumentType.PRESCRIPTION,
            DocumentType.MEDICAL_REPORT,
            DocumentType.REFERRAL_LETTER
          ],
          validateDocuments: true
        },
        priority: 180,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Age-based rules
      {
        id: 'pediatric-special-handling',
        name: 'Pediatric Patient Special Handling',
        description: 'Special rules for patients under 18',
        ruleType: 'medical_necessity',
        conditions: {
          'patient.age': { operator: '<', value: 18 }
        },
        actions: {
          requirePediatricReviewer: true,
          requiredDocuments: [DocumentType.MEDICAL_REPORT, DocumentType.REFERRAL_LETTER],
          notifyGuardian: true
        },
        priority: 220,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Network provider rules
      {
        id: 'network-provider-verification',
        name: 'Network Provider Verification',
        description: 'Verify provider is in network',
        ruleType: 'eligibility',
        conditions: {
          'provider.networkStatus': { operator: '==', value: 'in_network' },
          'provider.credentialsActive': { operator: '==', value: true }
        },
        actions: {
          verifyProvider: true,
          checkCredentials: true
        },
        priority: 190,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },

      // Prior authorization rules
      {
        id: 'prior-auth-therapeutic',
        name: 'Prior Authorization for Therapeutic Procedures',
        description: 'Therapeutic procedures over R$ 2000 need prior auth',
        ruleType: 'authorization_required',
        procedureCategory: ProcedureCategory.THERAPEUTIC,
        conditions: {
          'procedure.category': { operator: '==', value: 'therapeutic' },
          'procedure.estimatedCost': { operator: '>', value: 2000 }
        },
        actions: {
          requirePriorAuth: true,
          requireMedicalReview: true,
          checkPreviousTreatments: true
        },
        priority: 170,
        isActive: true,
        effectiveFrom: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    // Load rules into maps
    defaultRules.forEach(rule => {
      this.rules.set(rule.id, rule);
      
      // Group by category
      const category = rule.procedureCategory || 'general';
      if (!this.rulesByCategory.has(category)) {
        this.rulesByCategory.set(category, []);
      }
      this.rulesByCategory.get(category)!.push(rule);
    });

    // Sort rules by priority
    this.rulesByCategory.forEach(rules => {
      rules.sort((a, b) => b.priority - a.priority);
    });

    logger.info(`Loaded ${defaultRules.length} business rules`);
  }

  /**
   * Evaluate initial rules when workflow starts
   */
  async evaluateInitialRules(context: WorkflowContext): Promise<void> {
    logger.info(`Evaluating initial rules for authorization ${context.authorizationRequest.id}`);

    // Get applicable rules
    const applicableRules = this.getApplicableRules(context);
    
    // Evaluate each rule
    for (const rule of applicableRules) {
      await this.evaluateRule(rule, context);
    }

    this.emit('initialRulesEvaluated', {
      authorizationId: context.authorizationRequest.id,
      rulesEvaluated: applicableRules.length
    });
  }

  /**
   * Evaluate auto-approval rules
   */
  async evaluateAutoApprovalRules(context: WorkflowContext): Promise<{ approved: boolean; reason?: string }> {
    const autoApprovalRules = Array.from(this.rules.values())
      .filter(rule => rule.ruleType === 'auto_approval' && rule.isActive)
      .sort((a, b) => b.priority - a.priority);

    for (const rule of autoApprovalRules) {
      const result = await this.evaluateRule(rule, context);
      
      if (result.passed) {
        logger.info(`Auto-approval rule passed: ${rule.name}`, {
          authorizationId: context.authorizationRequest.id,
          ruleId: rule.id
        });

        // Execute auto-approval actions
        await this.executeRuleActions(rule, context);

        this.emit('autoDecisionMade', {
          authorizationId: context.authorizationRequest.id,
          decision: 'approve',
          ruleId: rule.id,
          ruleName: rule.name
        });

        return { approved: true, reason: rule.name };
      }
    }

    return { approved: false };
  }

  /**
   * Validate authorization request
   */
  async validateRequest(context: WorkflowContext): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const request = context.authorizationRequest;

    // Basic validation rules
    if (!request.patientId) {
      errors.push('Patient ID is required');
    }

    if (!request.providerId) {
      errors.push('Provider ID is required');
    }

    if (!request.procedureId) {
      errors.push('Procedure ID is required');
    }

    if (!request.clinicalJustification) {
      errors.push('Clinical justification is required');
    }

    if (request.estimatedCost <= 0) {
      errors.push('Valid estimated cost is required');
    }

    // Evaluate validation rules
    const validationRules = Array.from(this.rules.values())
      .filter(rule => rule.ruleType === 'eligibility' && rule.isActive);

    for (const rule of validationRules) {
      const result = await this.evaluateRule(rule, context);
      if (!result.passed && result.error) {
        errors.push(result.error);
      }
    }

    const isValid = errors.length === 0;

    this.emit('requestValidated', {
      authorizationId: request.id,
      valid: isValid,
      errors
    });

    return { valid: isValid, errors };
  }

  /**
   * Get applicable rules for context
   */
  private getApplicableRules(context: WorkflowContext): BusinessRule[] {
    const request = context.authorizationRequest;
    const allRules = Array.from(this.rules.values());

    return allRules.filter(rule => {
      // Check if rule is active
      if (!rule.isActive) return false;

      // Check effective dates
      const now = new Date();
      if (rule.effectiveFrom > now) return false;
      if (rule.effectiveTo && rule.effectiveTo < now) return false;

      // Check procedure category if specified
      if (rule.procedureCategory) {
        // In production, get procedure details from database
        // For now, assume category matches
      }

      // Check procedure code if specified
      if (rule.procedureCode && rule.procedureCode !== request.procedureId) {
        return false;
      }

      return true;
    });
  }

  /**
   * Evaluate a single rule
   */
  private async evaluateRule(
    rule: BusinessRule, 
    context: WorkflowContext
  ): Promise<{ passed: boolean; error?: string; actions?: any }> {
    const cacheKey = `${rule.id}-${context.authorizationRequest.id}`;
    
    // Check cache first
    if (this.ruleExecutionCache.has(cacheKey)) {
      return this.ruleExecutionCache.get(cacheKey);
    }

    try {
      logger.debug(`Evaluating rule: ${rule.name}`, {
        authorizationId: context.authorizationRequest.id,
        ruleId: rule.id
      });

      // Evaluate all conditions
      const conditionResults = await Promise.all(
        Object.entries(rule.conditions).map(([conditionPath, condition]) =>
          this.evaluateCondition(conditionPath, condition, context)
        )
      );

      const allConditionsPassed = conditionResults.every(result => result.passed);
      
      const result = {
        passed: allConditionsPassed,
        error: allConditionsPassed ? undefined : 'Rule conditions not met',
        actions: allConditionsPassed ? rule.actions : undefined
      };

      // Cache result
      this.ruleExecutionCache.set(cacheKey, result);

      this.emit('ruleEvaluated', {
        authorizationId: context.authorizationRequest.id,
        ruleId: rule.id,
        ruleName: rule.name,
        passed: result.passed,
        conditions: conditionResults
      });

      return result;
    } catch (error) {
      logger.error(`Error evaluating rule ${rule.id}`, { error });
      return { 
        passed: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    conditionPath: string,
    condition: any,
    context: WorkflowContext
  ): Promise<{ passed: boolean; actual?: any; expected?: any }> {
    try {
      // Get actual value from context
      const actualValue = this.getValueFromPath(conditionPath, context);
      const operator = condition.operator;
      const expectedValue = condition.value;

      let passed = false;

      switch (operator) {
        case '==':
          passed = actualValue === expectedValue;
          break;
        
        case '!=':
          passed = actualValue !== expectedValue;
          break;
        
        case '>':
          passed = this.compareValues(actualValue, expectedValue) > 0;
          break;
        
        case '>=':
          passed = this.compareValues(actualValue, expectedValue) >= 0;
          break;
        
        case '<':
          passed = this.compareValues(actualValue, expectedValue) < 0;
          break;
        
        case '<=':
          passed = this.compareValues(actualValue, expectedValue) <= 0;
          break;
        
        case 'in':
          passed = Array.isArray(expectedValue) && expectedValue.includes(actualValue);
          break;
        
        case 'not_in':
          passed = Array.isArray(expectedValue) && !expectedValue.includes(actualValue);
          break;
        
        case 'contains':
          passed = Array.isArray(actualValue) && actualValue.includes(expectedValue);
          break;
        
        case 'regex':
          passed = typeof actualValue === 'string' && new RegExp(expectedValue).test(actualValue);
          break;
        
        default:
          throw new Error(`Unknown operator: ${operator}`);
      }

      return { passed, actual: actualValue, expected: expectedValue };
    } catch (error) {
      logger.error(`Error evaluating condition ${conditionPath}`, { error });
      return { passed: false };
    }
  }

  /**
   * Get value from context using dot notation path
   */
  private getValueFromPath(path: string, context: WorkflowContext): any {
    const parts = path.split('.');
    let current: any = context;

    // Special handling for dynamic values
    if (path === 'now') {
      return new Date();
    }

    // Map common paths to context data
    const pathMappings: Record<string, any> = {
      'procedure.estimatedCost': context.authorizationRequest.estimatedCost,
      'request.urgency': context.authorizationRequest.urgency,
      'request.patientId': context.authorizationRequest.patientId,
      'request.providerId': context.authorizationRequest.providerId,
      'documents.allValid': context.authorizationRequest.documents.every(doc => doc.isValid),
      'documents.allRequired': context.authorizationRequest.missingDocuments.length === 0,
      'documents.medicalReport': context.authorizationRequest.documents.some(doc => 
        doc.type === DocumentType.MEDICAL_REPORT
      ),
      'documents.emergencyJustification': context.authorizationRequest.clinicalJustification.includes('emergency'),
      'procedure.category': 'diagnostic', // Mock - get from procedure service
      'patient.eligibility': true, // Mock - get from eligibility service
      'patient.coverage.status': 'active', // Mock - get from coverage service
      'patient.coverage.expiryDate': new Date('2025-12-31'), // Mock
      'patient.plan.coversSurgical': true, // Mock
      'patient.plan.surgicalLimit': 50000, // Mock
      'patient.age': 35, // Mock - get from patient service
      'provider.networkStatus': 'in_network', // Mock
      'provider.credentialsActive': true // Mock
    };

    if (pathMappings.hasOwnProperty(path)) {
      return pathMappings[path];
    }

    // Fallback to traversing object
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Compare values handling different types
   */
  private compareValues(a: any, b: any): number {
    // Handle dates
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() - b.getTime();
    }
    
    if (a instanceof Date && typeof b === 'string' && b === 'now') {
      return a.getTime() - Date.now();
    }

    // Handle numbers
    if (typeof a === 'number' && typeof b === 'number') {
      return a - b;
    }

    // Handle strings
    if (typeof a === 'string' && typeof b === 'string') {
      return a.localeCompare(b);
    }

    // Convert to string and compare
    return String(a).localeCompare(String(b));
  }

  /**
   * Execute rule actions
   */
  private async executeRuleActions(rule: BusinessRule, context: WorkflowContext): Promise<void> {
    const actions = rule.actions;

    if (actions.decision) {
      this.emit('autoDecisionMade', {
        authorizationId: context.authorizationRequest.id,
        decision: actions.decision,
        ruleId: rule.id
      });
    }

    if (actions.requireMedicalReview) {
      this.emit('medicalReviewRequired', {
        authorizationId: context.authorizationRequest.id,
        priority: actions.escalatePriority || context.authorizationRequest.urgency
      });
    }

    if (actions.requireAdminReview) {
      this.emit('adminReviewRequired', {
        authorizationId: context.authorizationRequest.id
      });
    }

    if (actions.notifyParties) {
      this.emit('notificationRequired', {
        authorizationId: context.authorizationRequest.id,
        recipients: actions.notifyParties
      });
    }

    if (actions.syncWithTasy) {
      this.emit('tasySync Required', {
        authorizationId: context.authorizationRequest.id
      });
    }

    logger.info(`Executed actions for rule ${rule.name}`, {
      authorizationId: context.authorizationRequest.id,
      actions: Object.keys(actions)
    });
  }

  /**
   * Add custom rule
   */
  addRule(rule: BusinessRule): void {
    this.rules.set(rule.id, rule);
    
    const category = rule.procedureCategory || 'general';
    if (!this.rulesByCategory.has(category)) {
      this.rulesByCategory.set(category, []);
    }
    this.rulesByCategory.get(category)!.push(rule);
    
    // Re-sort by priority
    this.rulesByCategory.get(category)!.sort((a, b) => b.priority - a.priority);

    logger.info(`Added custom rule: ${rule.name}`);
  }

  /**
   * Update existing rule
   */
  updateRule(rule: BusinessRule): void {
    this.rules.set(rule.id, rule);
    
    // Clear cache for this rule
    for (const key of this.ruleExecutionCache.keys()) {
      if (key.startsWith(rule.id)) {
        this.ruleExecutionCache.delete(key);
      }
    }

    logger.info(`Updated rule: ${rule.name}`);
  }

  /**
   * Get all rules
   */
  getAllRules(): BusinessRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get rules by type
   */
  getRulesByType(ruleType: string): BusinessRule[] {
    return Array.from(this.rules.values()).filter(rule => rule.ruleType === ruleType);
  }

  /**
   * Clear rule cache
   */
  clearCache(): void {
    this.ruleExecutionCache.clear();
    logger.info('Rule execution cache cleared');
  }

  /**
   * Get rule execution statistics
   */
  getRuleExecutionStats(): Record<string, any> {
    return {
      totalRules: this.rules.size,
      cacheSize: this.ruleExecutionCache.size,
      rulesByType: Object.fromEntries(
        Object.entries(this.getRulesByType).map(([type, rules]) => [type, rules.length])
      )
    };
  }
}