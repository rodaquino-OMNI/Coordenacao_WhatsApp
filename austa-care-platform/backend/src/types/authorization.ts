import { z } from 'zod';

// Authorization States
export enum AuthorizationState {
  INITIATED = 'initiated',
  DOCUMENT_COLLECTION = 'document_collection',
  MEDICAL_REVIEW = 'medical_review',
  ADMINISTRATIVE_REVIEW = 'administrative_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  APPEALED = 'appealed',
  EXPIRED = 'expired',
  CANCELED = 'canceled',
  ON_HOLD = 'on_hold',
  PENDING_ADDITIONAL_INFO = 'pending_additional_info'
}

// Workflow Actions
export enum WorkflowAction {
  INITIATE = 'initiate',
  SUBMIT_DOCUMENTS = 'submit_documents',
  DOCUMENT_UPLOADED = 'document_uploaded',
  REQUEST_ADDITIONAL_INFO = 'request_additional_info',
  PROVIDE_ADDITIONAL_INFO = 'provide_additional_info',
  START_MEDICAL_REVIEW = 'start_medical_review',
  COMPLETE_MEDICAL_REVIEW = 'complete_medical_review',
  START_ADMIN_REVIEW = 'start_admin_review',
  COMPLETE_ADMIN_REVIEW = 'complete_admin_review',
  APPROVE = 'approve',
  REJECT = 'reject',
  APPEAL = 'appeal',
  CANCEL = 'cancel',
  PUT_ON_HOLD = 'put_on_hold',
  RESUME = 'resume',
  EXPIRE = 'expire',
  ESCALATE = 'escalate'
}

// Document Types
export enum DocumentType {
  MEDICAL_REPORT = 'medical_report',
  PRESCRIPTION = 'prescription',
  EXAM_RESULTS = 'exam_results',
  INSURANCE_CARD = 'insurance_card',
  ID_DOCUMENT = 'id_document',
  AUTHORIZATION_REQUEST = 'authorization_request',
  MEDICAL_HISTORY = 'medical_history',
  REFERRAL_LETTER = 'referral_letter',
  PRIOR_AUTH_FORM = 'prior_auth_form',
  COST_ESTIMATE = 'cost_estimate'
}

// Priority Levels
export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
  EMERGENCY = 'emergency'
}

// Procedure Categories
export enum ProcedureCategory {
  CONSULTATION = 'consultation',
  DIAGNOSTIC = 'diagnostic',
  THERAPEUTIC = 'therapeutic',
  SURGICAL = 'surgical',
  EMERGENCY = 'emergency',
  PREVENTIVE = 'preventive',
  REHABILITATION = 'rehabilitation',
  MENTAL_HEALTH = 'mental_health'
}

// Schemas
export const DocumentSchema = z.object({
  id: z.string().uuid(),
  type: z.nativeEnum(DocumentType),
  fileName: z.string(),
  filePath: z.string(),
  mimeType: z.string(),
  fileSize: z.number(),
  uploadedAt: z.date(),
  uploadedBy: z.string().uuid(),
  isValid: z.boolean().default(false),
  validationNotes: z.string().optional(),
  ocrData: z.record(z.any()).optional(),
  metadata: z.record(z.any()).optional()
});

export const ProcedureSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  category: z.nativeEnum(ProcedureCategory),
  code: z.string(), // TUSS or internal code
  estimatedCost: z.number(),
  estimatedDuration: z.number(), // in minutes
  requiresAuthorization: z.boolean(),
  autoApprovalThreshold: z.number().optional(),
  requiredDocuments: z.array(z.nativeEnum(DocumentType)),
  isActive: z.boolean().default(true)
});

export const AuthorizationRequestSchema = z.object({
  id: z.string().uuid(),
  patientId: z.string().uuid(),
  providerId: z.string().uuid(),
  procedureId: z.string(),
  requestedDate: z.date(),
  preferredDate: z.date().optional(),
  urgency: z.nativeEnum(Priority),
  clinicalJustification: z.string(),
  estimatedCost: z.number(),
  state: z.nativeEnum(AuthorizationState),
  currentStep: z.string(),
  
  // Workflow tracking
  workflowId: z.string(),
  assignedTo: z.string().uuid().optional(),
  reviewers: z.array(z.string().uuid()).default([]),
  
  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  expiresAt: z.date().optional(),
  approvedAt: z.date().optional(),
  rejectedAt: z.date().optional(),
  
  // Documents
  documents: z.array(DocumentSchema).default([]),
  requiredDocuments: z.array(z.nativeEnum(DocumentType)),
  missingDocuments: z.array(z.nativeEnum(DocumentType)).default([]),
  
  // Review data
  medicalReview: z.object({
    reviewerId: z.string().uuid().optional(),
    decision: z.enum(['approved', 'rejected', 'needs_info']).optional(),
    notes: z.string().optional(),
    reviewedAt: z.date().optional(),
    isComplete: z.boolean().default(false)
  }).optional(),
  
  administrativeReview: z.object({
    reviewerId: z.string().uuid().optional(),
    decision: z.enum(['approved', 'rejected', 'needs_info']).optional(),
    notes: z.string().optional(),
    reviewedAt: z.date().optional(),
    eligibilityConfirmed: z.boolean().default(false),
    coverageConfirmed: z.boolean().default(false),
    isComplete: z.boolean().default(false)
  }).optional(),
  
  // Appeals
  appeals: z.array(z.object({
    id: z.string().uuid(),
    reason: z.string(),
    submittedAt: z.date(),
    submittedBy: z.string().uuid(),
    status: z.enum(['pending', 'approved', 'rejected']),
    reviewedAt: z.date().optional(),
    reviewedBy: z.string().uuid().optional(),
    notes: z.string().optional()
  })).default([]),
  
  // Audit trail
  auditTrail: z.array(z.object({
    id: z.string().uuid(),
    timestamp: z.date(),
    action: z.nativeEnum(WorkflowAction),
    performedBy: z.string().uuid(),
    fromState: z.nativeEnum(AuthorizationState).optional(),
    toState: z.nativeEnum(AuthorizationState).optional(),
    notes: z.string().optional(),
    metadata: z.record(z.any()).optional()
  })).default([]),
  
  // Integration data
  tasyData: z.object({
    authorizationNumber: z.string().optional(),
    claimNumber: z.string().optional(),
    synchronizedAt: z.date().optional(),
    lastSyncStatus: z.enum(['success', 'failed', 'pending']).optional()
  }).optional(),
  
  // Notifications
  notifications: z.array(z.object({
    id: z.string().uuid(),
    type: z.enum(['email', 'sms', 'whatsapp', 'system']),
    recipient: z.string(),
    subject: z.string(),
    message: z.string(),
    sentAt: z.date(),
    status: z.enum(['sent', 'delivered', 'failed', 'pending'])
  })).default([]),
  
  // Metadata
  metadata: z.record(z.any()).optional()
});

export const WorkflowStepSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  state: z.nativeEnum(AuthorizationState),
  isAutomatic: z.boolean().default(false),
  requiredRole: z.string().optional(),
  timeoutMinutes: z.number().optional(),
  nextSteps: z.array(z.string()).default([]),
  conditions: z.record(z.any()).optional(),
  actions: z.array(z.string()).default([])
});

export const WorkflowDefinitionSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  version: z.string(),
  isActive: z.boolean().default(true),
  procedureCategory: z.nativeEnum(ProcedureCategory).optional(),
  steps: z.array(WorkflowStepSchema),
  transitions: z.record(z.array(z.string())),
  businessRules: z.array(z.object({
    id: z.string(),
    condition: z.string(),
    action: z.string(),
    priority: z.number(),
    isActive: z.boolean().default(true)
  })).default([]),
  slaTargets: z.object({
    initiationToDecision: z.number(), // hours
    documentSubmissionTimeout: z.number(), // hours
    medicalReviewTimeout: z.number(), // hours
    administrativeReviewTimeout: z.number() // hours
  }),
  createdAt: z.date(),
  updatedAt: z.date()
});

export const BusinessRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  ruleType: z.enum(['eligibility', 'coverage', 'medical_necessity', 'authorization_required', 'auto_approval']),
  procedureCategory: z.nativeEnum(ProcedureCategory).optional(),
  procedureCode: z.string().optional(),
  conditions: z.record(z.any()),
  actions: z.record(z.any()),
  priority: z.number(),
  isActive: z.boolean().default(true),
  effectiveFrom: z.date(),
  effectiveTo: z.date().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

// Type exports
export type Document = z.infer<typeof DocumentSchema>;
export type Procedure = z.infer<typeof ProcedureSchema>;
export type AuthorizationRequest = z.infer<typeof AuthorizationRequestSchema>;
export type WorkflowStep = z.infer<typeof WorkflowStepSchema>;
export type WorkflowDefinition = z.infer<typeof WorkflowDefinitionSchema>;
export type BusinessRule = z.infer<typeof BusinessRuleSchema>;

// Event types for workflow engine
export interface WorkflowEvent {
  id: string;
  authorizationId: string;
  action: WorkflowAction;
  performedBy: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface StateTransition {
  from: AuthorizationState;
  to: AuthorizationState;
  action: WorkflowAction;
  conditions?: Record<string, any>;
  sideEffects?: string[];
}

export interface WorkflowContext {
  authorizationRequest: AuthorizationRequest;
  currentUser: string;
  systemMetadata: Record<string, any>;
  externalSystemData?: Record<string, any>;
}

// Notification types
export interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'whatsapp' | 'system';
  trigger: WorkflowAction;
  recipients: string[];
  subject: string;
  template: string;
  isActive: boolean;
}

// Integration types
export interface TasyIntegration {
  eligibilityCheck: (patientId: string, procedureCode: string) => Promise<boolean>;
  coverageVerification: (patientId: string, procedureCode: string) => Promise<number>;
  submitAuthorization: (request: AuthorizationRequest) => Promise<string>;
  updateAuthorizationStatus: (authNumber: string, status: string) => Promise<void>;
  syncPatientData: (patientId: string) => Promise<any>;
}

// Performance metrics
export interface WorkflowMetrics {
  totalRequests: number;
  averageProcessingTime: number;
  approvalRate: number;
  rejectionRate: number;
  appealRate: number;
  slaComplianceRate: number;
  bottlenecks: string[];
  performanceByCategory: Record<ProcedureCategory, {
    count: number;
    averageTime: number;
    approvalRate: number;
  }>;
}