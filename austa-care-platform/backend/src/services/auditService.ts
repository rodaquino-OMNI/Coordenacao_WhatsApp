import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { 
  AuthorizationState, 
  WorkflowAction,
  WorkflowEvent
} from '../types/authorization';

/**
 * Audit Service for Authorization Workflow
 * Provides comprehensive audit trail and compliance tracking
 */
export class AuditService extends EventEmitter {
  private auditBuffer: Map<string, AuditEntry[]>;
  private complianceRules: Map<string, ComplianceRule>;
  private retentionPolicies: Map<string, RetentionPolicy>;
  private encryptionKey: string;

  constructor() {
    super();
    this.auditBuffer = new Map();
    this.complianceRules = new Map();
    this.retentionPolicies = new Map();
    this.encryptionKey = process.env.AUDIT_ENCRYPTION_KEY || 'default-key';
    this.initializeComplianceRules();
    this.initializeRetentionPolicies();
    this.startPeriodicFlush();
  }

  /**
   * Initialize compliance rules for LGPD and ANS
   */
  private initializeComplianceRules(): void {
    const rules: ComplianceRule[] = [
      // LGPD (Lei Geral de Proteção de Dados) Rules
      {
        id: 'lgpd-data-access',
        name: 'LGPD Data Access Logging',
        description: 'Log all access to patient personal data',
        regulation: 'LGPD',
        triggers: ['patient_data_access', 'medical_data_view'],
        requiredFields: ['userId', 'patientId', 'dataType', 'purpose', 'timestamp'],
        retentionDays: 2190, // 6 years
        isActive: true
      },
      {
        id: 'lgpd-consent-tracking',
        name: 'LGPD Consent Tracking',
        description: 'Track patient consent for data processing',
        regulation: 'LGPD',
        triggers: ['consent_given', 'consent_withdrawn', 'data_processing'],
        requiredFields: ['patientId', 'consentType', 'purpose', 'timestamp'],
        retentionDays: 2190,
        isActive: true
      },
      {
        id: 'lgpd-data-deletion',
        name: 'LGPD Data Deletion Tracking',
        description: 'Track patient data deletion requests',
        regulation: 'LGPD',
        triggers: ['deletion_request', 'data_deleted', 'anonymization'],
        requiredFields: ['patientId', 'requestReason', 'deletionMethod', 'timestamp'],
        retentionDays: 3650, // 10 years for deletion records
        isActive: true
      },

      // ANS (Agência Nacional de Saúde Suplementar) Rules
      {
        id: 'ans-authorization-decisions',
        name: 'ANS Authorization Decision Tracking',
        description: 'Track all authorization decisions for ANS reporting',
        regulation: 'ANS',
        triggers: ['authorization_approved', 'authorization_rejected', 'appeal_decision'],
        requiredFields: ['authorizationId', 'decision', 'reviewerId', 'justification', 'timestamp'],
        retentionDays: 1825, // 5 years
        isActive: true
      },
      {
        id: 'ans-processing-times',
        name: 'ANS Processing Time Tracking',
        description: 'Track processing times for ANS compliance',
        regulation: 'ANS',
        triggers: ['workflow_started', 'review_started', 'decision_made'],
        requiredFields: ['authorizationId', 'phase', 'duration', 'timestamp'],
        retentionDays: 1825,
        isActive: true
      },
      {
        id: 'ans-appeal-tracking',
        name: 'ANS Appeal Process Tracking',
        description: 'Track appeal processes for ANS reporting',
        regulation: 'ANS',
        triggers: ['appeal_submitted', 'appeal_reviewed', 'appeal_decided'],
        requiredFields: ['authorizationId', 'appealId', 'reason', 'outcome', 'timestamp'],
        retentionDays: 3650, // 10 years for appeals
        isActive: true
      },

      // Internal Compliance Rules
      {
        id: 'internal-security-events',
        name: 'Security Events Logging',
        description: 'Log all security-related events',
        regulation: 'Internal',
        triggers: ['login_failure', 'unauthorized_access', 'privilege_escalation'],
        requiredFields: ['userId', 'eventType', 'ipAddress', 'timestamp'],
        retentionDays: 2555, // 7 years
        isActive: true
      },
      {
        id: 'internal-data-export',
        name: 'Data Export Tracking',
        description: 'Track all data exports for compliance',
        regulation: 'Internal',
        triggers: ['data_export', 'report_generation', 'bulk_access'],
        requiredFields: ['userId', 'exportType', 'recordCount', 'purpose', 'timestamp'],
        retentionDays: 2190,
        isActive: true
      }
    ];

    rules.forEach(rule => {
      this.complianceRules.set(rule.id, rule);
    });

    logger.info(`Loaded ${rules.length} compliance rules`);
  }

  /**
   * Initialize data retention policies
   */
  private initializeRetentionPolicies(): void {
    const policies: RetentionPolicy[] = [
      {
        id: 'patient-authorization-data',
        name: 'Patient Authorization Data',
        description: 'Retention policy for patient authorization records',
        category: 'authorization',
        retentionDays: 2190, // 6 years as per Brazilian healthcare regulations
        archiveAfterDays: 1095, // 3 years
        anonymizeAfterDays: 2555, // 7 years
        deleteAfterDays: 3650, // 10 years
        exceptions: ['legal_hold', 'ongoing_treatment'],
        isActive: true
      },
      {
        id: 'audit-trail-data',
        name: 'Audit Trail Data',
        description: 'Retention policy for audit trail records',
        category: 'audit',
        retentionDays: 3650, // 10 years
        archiveAfterDays: 1825, // 5 years
        anonymizeAfterDays: null, // Never anonymize audit trails
        deleteAfterDays: 3650,
        exceptions: ['investigation', 'litigation'],
        isActive: true
      },
      {
        id: 'compliance-reports',
        name: 'Compliance Reports',
        description: 'Retention policy for compliance reports',
        category: 'compliance',
        retentionDays: 2555, // 7 years
        archiveAfterDays: 1095, // 3 years
        anonymizeAfterDays: null,
        deleteAfterDays: 2555,
        exceptions: ['regulatory_inquiry'],
        isActive: true
      }
    ];

    policies.forEach(policy => {
      this.retentionPolicies.set(policy.id, policy);
    });

    logger.info(`Loaded ${policies.length} retention policies`);
  }

  /**
   * Record a workflow event
   */
  async recordEvent(event: WorkflowEvent): Promise<void> {
    const auditEntry: AuditEntry = {
      id: this.generateAuditId(),
      timestamp: event.timestamp,
      authorizationId: event.authorizationId,
      eventType: 'workflow_event',
      action: event.action,
      performedBy: event.performedBy,
      metadata: event.metadata || {},
      ipAddress: this.getCurrentIpAddress(),
      userAgent: this.getCurrentUserAgent(),
      sessionId: this.getCurrentSessionId(),
      complianceFlags: this.getComplianceFlags(event),
      severity: this.calculateEventSeverity(event),
      encrypted: false
    };

    await this.storeAuditEntry(auditEntry);

    // Check compliance rules
    await this.checkComplianceRules(auditEntry);

    logger.info('Workflow event recorded', {
      auditId: auditEntry.id,
      authorizationId: event.authorizationId,
      action: event.action
    });
  }

  /**
   * Record state transition
   */
  async recordStateTransition(transition: {
    authorizationId: string;
    fromState: AuthorizationState;
    toState: AuthorizationState;
    action: WorkflowAction;
    performedBy: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const auditEntry: AuditEntry = {
      id: this.generateAuditId(),
      timestamp: transition.timestamp,
      authorizationId: transition.authorizationId,
      eventType: 'state_transition',
      action: transition.action,
      performedBy: transition.performedBy,
      metadata: {
        fromState: transition.fromState,
        toState: transition.toState,
        ...transition.metadata
      },
      ipAddress: this.getCurrentIpAddress(),
      userAgent: this.getCurrentUserAgent(),
      sessionId: this.getCurrentSessionId(),
      complianceFlags: this.getComplianceFlags(transition),
      severity: 'medium',
      encrypted: false
    };

    await this.storeAuditEntry(auditEntry);

    // ANS compliance tracking
    if (this.isANSReportableTransition(transition)) {
      await this.createANSComplianceRecord(auditEntry, transition);
    }

    logger.info('State transition recorded', {
      auditId: auditEntry.id,
      authorizationId: transition.authorizationId,
      fromState: transition.fromState,
      toState: transition.toState
    });
  }

  /**
   * Record data access for LGPD compliance
   */
  async recordDataAccess(access: {
    userId: string;
    patientId: string;
    dataType: string;
    purpose: string;
    accessMethod: string;
    timestamp: Date;
  }): Promise<void> {
    const auditEntry: AuditEntry = {
      id: this.generateAuditId(),
      timestamp: access.timestamp,
      authorizationId: null,
      eventType: 'data_access',
      action: 'data_access',
      performedBy: access.userId,
      metadata: {
        patientId: access.patientId,
        dataType: access.dataType,
        purpose: access.purpose,
        accessMethod: access.accessMethod
      },
      ipAddress: this.getCurrentIpAddress(),
      userAgent: this.getCurrentUserAgent(),
      sessionId: this.getCurrentSessionId(),
      complianceFlags: ['LGPD'],
      severity: 'low',
      encrypted: true // Encrypt personal data access logs
    };

    await this.storeAuditEntry(auditEntry);

    logger.info('Data access recorded for LGPD compliance', {
      auditId: auditEntry.id,
      userId: access.userId,
      dataType: access.dataType
    });
  }

  /**
   * Record security event
   */
  async recordSecurityEvent(event: {
    eventType: string;
    userId?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    ipAddress?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
  }): Promise<void> {
    const auditEntry: AuditEntry = {
      id: this.generateAuditId(),
      timestamp: event.timestamp,
      authorizationId: null,
      eventType: 'security_event',
      action: event.eventType,
      performedBy: event.userId || 'system',
      metadata: {
        description: event.description,
        ...event.metadata
      },
      ipAddress: event.ipAddress || this.getCurrentIpAddress(),
      userAgent: this.getCurrentUserAgent(),
      sessionId: this.getCurrentSessionId(),
      complianceFlags: ['Internal Security'],
      severity: event.severity,
      encrypted: true
    };

    await this.storeAuditEntry(auditEntry);

    // Alert on high severity events
    if (event.severity === 'high' || event.severity === 'critical') {
      this.emit('securityAlert', {
        auditId: auditEntry.id,
        severity: event.severity,
        description: event.description,
        timestamp: event.timestamp
      });
    }

    logger.warn('Security event recorded', {
      auditId: auditEntry.id,
      eventType: event.eventType,
      severity: event.severity
    });
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(params: {
    regulation: 'LGPD' | 'ANS' | 'Internal';
    startDate: Date;
    endDate: Date;
    authorizationIds?: string[];
  }): Promise<ComplianceReport> {
    logger.info('Generating compliance report', {
      regulation: params.regulation,
      startDate: params.startDate,
      endDate: params.endDate
    });

    const relevantRules = Array.from(this.complianceRules.values())
      .filter(rule => rule.regulation === params.regulation && rule.isActive);

    const auditEntries = await this.getAuditEntries({
      startDate: params.startDate,
      endDate: params.endDate,
      authorizationIds: params.authorizationIds,
      complianceFlags: [params.regulation]
    });

    const report: ComplianceReport = {
      id: this.generateReportId(),
      regulation: params.regulation,
      generatedAt: new Date(),
      reportPeriod: {
        startDate: params.startDate,
        endDate: params.endDate
      },
      totalEvents: auditEntries.length,
      eventsByType: this.groupEventsByType(auditEntries),
      complianceViolations: await this.detectComplianceViolations(auditEntries, relevantRules),
      processingTimeMetrics: this.calculateProcessingTimeMetrics(auditEntries),
      dataAccessMetrics: this.calculateDataAccessMetrics(auditEntries),
      recommendations: this.generateComplianceRecommendations(auditEntries, relevantRules),
      summary: this.generateReportSummary(auditEntries, params.regulation)
    };

    // Store report
    await this.storeComplianceReport(report);

    this.emit('complianceReportGenerated', {
      reportId: report.id,
      regulation: params.regulation,
      eventCount: auditEntries.length
    });

    return report;
  }

  /**
   * Get audit trail for authorization
   */
  async getAuthorizationAuditTrail(authorizationId: string): Promise<AuditEntry[]> {
    return this.getAuditEntries({
      authorizationIds: [authorizationId]
    });
  }

  /**
   * Search audit logs
   */
  async searchAuditLogs(criteria: AuditSearchCriteria): Promise<AuditEntry[]> {
    return this.getAuditEntries(criteria);
  }

  /**
   * Store audit entry
   */
  private async storeAuditEntry(entry: AuditEntry): Promise<void> {
    // Add to buffer for batch processing
    const authId = entry.authorizationId || 'system';
    if (!this.auditBuffer.has(authId)) {
      this.auditBuffer.set(authId, []);
    }
    
    // Encrypt sensitive data if required
    if (entry.encrypted) {
      entry.metadata = await this.encryptMetadata(entry.metadata);
    }

    this.auditBuffer.get(authId)!.push(entry);

    // Immediate flush for critical events
    if (entry.severity === 'critical') {
      await this.flushAuditBuffer();
    }
  }

  /**
   * Check compliance rules against audit entry
   */
  private async checkComplianceRules(entry: AuditEntry): Promise<void> {
    const applicableRules = Array.from(this.complianceRules.values())
      .filter(rule => 
        rule.isActive && 
        rule.triggers.includes(entry.action)
      );

    for (const rule of applicableRules) {
      const hasRequiredFields = rule.requiredFields.every(field => 
        entry.hasOwnProperty(field) || entry.metadata.hasOwnProperty(field)
      );

      if (!hasRequiredFields) {
        logger.warn('Compliance rule violation detected', {
          ruleId: rule.id,
          auditId: entry.id,
          missingFields: rule.requiredFields.filter(field => 
            !entry.hasOwnProperty(field) && !entry.metadata.hasOwnProperty(field)
          )
        });

        this.emit('complianceViolation', {
          ruleId: rule.id,
          auditId: entry.id,
          violation: 'missing_required_fields'
        });
      }
    }
  }

  /**
   * Get compliance flags for event
   */
  private getComplianceFlags(event: any): string[] {
    const flags: string[] = [];

    // LGPD flags
    if (event.metadata?.patientId || event.action.includes('patient')) {
      flags.push('LGPD');
    }

    // ANS flags
    if (event.action.includes('authorization') || event.action.includes('approval')) {
      flags.push('ANS');
    }

    // Security flags
    if (event.action.includes('security') || event.action.includes('access')) {
      flags.push('Security');
    }

    return flags;
  }

  /**
   * Calculate event severity
   */
  private calculateEventSeverity(event: any): string {
    if (event.action.includes('security') || event.action.includes('unauthorized')) {
      return 'high';
    }
    
    if (event.action.includes('approval') || event.action.includes('rejection')) {
      return 'medium';
    }
    
    return 'low';
  }

  /**
   * Check if transition is ANS reportable
   */
  private isANSReportableTransition(transition: any): boolean {
    const reportableActions = [
      'approve',
      'reject',
      'appeal',
      'escalate'
    ];

    return reportableActions.includes(transition.action);
  }

  /**
   * Create ANS compliance record
   */
  private async createANSComplianceRecord(entry: AuditEntry, transition: any): Promise<void> {
    // Create specific ANS compliance record
    logger.info('Creating ANS compliance record', {
      auditId: entry.id,
      authorizationId: transition.authorizationId
    });

    // In production, store in ANS-specific compliance table
  }

  /**
   * Encrypt metadata for sensitive entries
   */
  private async encryptMetadata(metadata: Record<string, any>): Promise<Record<string, any>> {
    // In production, implement proper encryption
    // For now, return as-is
    return metadata;
  }

  /**
   * Start periodic flush of audit buffer
   */
  private startPeriodicFlush(): void {
    setInterval(() => {
      this.flushAuditBuffer().catch(error => {
        logger.error('Failed to flush audit buffer', { error });
      });
    }, 30000); // Flush every 30 seconds
  }

  /**
   * Flush audit buffer to persistent storage
   */
  private async flushAuditBuffer(): Promise<void> {
    if (this.auditBuffer.size === 0) return;

    const entriesToFlush: AuditEntry[] = [];
    
    for (const [authId, entries] of this.auditBuffer.entries()) {
      entriesToFlush.push(...entries);
    }

    if (entriesToFlush.length === 0) return;

    try {
      // In production, batch insert to database
      logger.info(`Flushing ${entriesToFlush.length} audit entries`);
      
      // Clear buffer after successful flush
      this.auditBuffer.clear();

      this.emit('auditBufferFlushed', {
        entriesCount: entriesToFlush.length,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Failed to flush audit entries', { 
        error,
        entriesCount: entriesToFlush.length 
      });
    }
  }

  /**
   * Get audit entries based on criteria
   */
  private async getAuditEntries(criteria: AuditSearchCriteria): Promise<AuditEntry[]> {
    // In production, query database with criteria
    // For now, return mock data
    return [];
  }

  /**
   * Group events by type for reporting
   */
  private groupEventsByType(entries: AuditEntry[]): Record<string, number> {
    const grouped: Record<string, number> = {};
    
    entries.forEach(entry => {
      grouped[entry.eventType] = (grouped[entry.eventType] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Detect compliance violations
   */
  private async detectComplianceViolations(
    entries: AuditEntry[], 
    rules: ComplianceRule[]
  ): Promise<ComplianceViolation[]> {
    // In production, implement sophisticated violation detection
    return [];
  }

  /**
   * Calculate processing time metrics
   */
  private calculateProcessingTimeMetrics(entries: AuditEntry[]): ProcessingTimeMetrics {
    // In production, calculate actual metrics from entries
    return {
      averageProcessingTime: 0,
      slaComplianceRate: 0.95,
      bottlenecks: []
    };
  }

  /**
   * Calculate data access metrics
   */
  private calculateDataAccessMetrics(entries: AuditEntry[]): DataAccessMetrics {
    // In production, calculate actual metrics from entries
    return {
      totalAccesses: 0,
      uniqueUsers: 0,
      accessByPurpose: {}
    };
  }

  /**
   * Generate compliance recommendations
   */
  private generateComplianceRecommendations(
    entries: AuditEntry[], 
    rules: ComplianceRule[]
  ): string[] {
    // In production, implement intelligent recommendation engine
    return [
      'Consider implementing additional access controls',
      'Review user access patterns for anomalies',
      'Update data retention policies'
    ];
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(entries: AuditEntry[], regulation: string): string {
    return `Compliance report for ${regulation} covering ${entries.length} audit events.`;
  }

  /**
   * Store compliance report
   */
  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    // In production, store in database
    logger.info(`Stored compliance report ${report.id}`);
  }

  /**
   * Utility methods
   */
  private generateAuditId(): string {
    return `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCurrentIpAddress(): string {
    // In production, get from request context
    return '192.168.1.1';
  }

  private getCurrentUserAgent(): string {
    // In production, get from request context
    return 'AUSTA-Care-Platform/1.0';
  }

  private getCurrentSessionId(): string {
    // In production, get from session context
    return `session-${Date.now()}`;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.flushAuditBuffer();
    logger.info('Audit service cleaned up');
  }
}

// Type definitions
interface AuditEntry {
  id: string;
  timestamp: Date;
  authorizationId: string | null;
  eventType: string;
  action: string;
  performedBy: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  complianceFlags: string[];
  severity: string;
  encrypted: boolean;
}

interface ComplianceRule {
  id: string;
  name: string;
  description: string;
  regulation: string;
  triggers: string[];
  requiredFields: string[];
  retentionDays: number;
  isActive: boolean;
}

interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  category: string;
  retentionDays: number;
  archiveAfterDays: number;
  anonymizeAfterDays: number | null;
  deleteAfterDays: number;
  exceptions: string[];
  isActive: boolean;
}

interface AuditSearchCriteria {
  startDate?: Date;
  endDate?: Date;
  authorizationIds?: string[];
  eventTypes?: string[];
  performedBy?: string;
  complianceFlags?: string[];
  severity?: string;
  limit?: number;
  offset?: number;
}

interface ComplianceReport {
  id: string;
  regulation: string;
  generatedAt: Date;
  reportPeriod: {
    startDate: Date;
    endDate: Date;
  };
  totalEvents: number;
  eventsByType: Record<string, number>;
  complianceViolations: ComplianceViolation[];
  processingTimeMetrics: ProcessingTimeMetrics;
  dataAccessMetrics: DataAccessMetrics;
  recommendations: string[];
  summary: string;
}

interface ComplianceViolation {
  id: string;
  ruleId: string;
  auditId: string;
  violationType: string;
  description: string;
  severity: string;
  detectedAt: Date;
}

interface ProcessingTimeMetrics {
  averageProcessingTime: number;
  slaComplianceRate: number;
  bottlenecks: string[];
}

interface DataAccessMetrics {
  totalAccesses: number;
  uniqueUsers: number;
  accessByPurpose: Record<string, number>;
}