/**
 * Workflow Types
 * 
 * Type definitions for workflow management and orchestration
 */

import { WorkflowId, TaskId, UserId, PatientId } from './core/branded.types';

// Workflow status enumeration
export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  FAILED = 'failed'
}

// Workflow state enumeration
export enum WorkflowState {
  INITIAL = 'initial',
  IN_PROGRESS = 'in_progress',
  WAITING_FOR_INPUT = 'waiting_for_input',
  WAITING_FOR_APPROVAL = 'waiting_for_approval',
  COMPLETED = 'completed',
  ERROR = 'error',
  CANCELLED = 'cancelled'
}

// Task status enumeration
export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  CANCELLED = 'cancelled'
}

// Task type enumeration
export enum TaskType {
  MANUAL = 'manual',
  AUTOMATED = 'automated',
  APPROVAL = 'approval',
  NOTIFICATION = 'notification',
  INTEGRATION = 'integration',
  CONDITION = 'condition'
}

// Workflow definition
export interface WorkflowDefinition {
  id: WorkflowId;
  name: string;
  description?: string;
  version: string;
  status: WorkflowStatus;
  tasks: TaskDefinition[];
  rules: WorkflowRule[];
  triggers: WorkflowTrigger[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: UserId;
}

// Task definition
export interface TaskDefinition {
  id: TaskId;
  name: string;
  description?: string;
  type: TaskType;
  order: number;
  dependencies: TaskId[];
  conditions?: TaskCondition[];
  actions: TaskAction[];
  timeout?: number; // in minutes
  retryPolicy?: RetryPolicy;
  metadata?: Record<string, any>;
}

// Task condition
export interface TaskCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'exists';
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

// Task action
export interface TaskAction {
  type: 'webhook' | 'email' | 'sms' | 'update_field' | 'create_record' | 'custom';
  config: Record<string, any>;
  order: number;
}

// Retry policy
export interface RetryPolicy {
  maxAttempts: number;
  backoffStrategy: 'fixed' | 'exponential' | 'linear';
  baseDelay: number; // in milliseconds
  maxDelay?: number; // in milliseconds
}

// Workflow rule
export interface WorkflowRule {
  id: string;
  name: string;
  conditions: TaskCondition[];
  actions: {
    type: 'skip_task' | 'add_task' | 'complete_workflow' | 'fail_workflow' | 'pause_workflow';
    target?: TaskId | WorkflowId;
    config?: Record<string, any>;
  }[];
}

// Workflow trigger
export interface WorkflowTrigger {
  id: string;
  name: string;
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  config: Record<string, any>;
  enabled: boolean;
}

// Workflow instance
export interface WorkflowInstance {
  id: string;
  workflowId: WorkflowId;
  patientId?: PatientId;
  userId?: UserId;
  state: WorkflowState;
  status: WorkflowStatus;
  currentTask?: TaskId;
  variables: Record<string, any>;
  history: WorkflowHistoryEntry[];
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, any>;
}

// Workflow history entry
export interface WorkflowHistoryEntry {
  timestamp: Date;
  taskId?: TaskId;
  previousState: WorkflowState;
  newState: WorkflowState;
  userId?: UserId;
  details?: Record<string, any>;
  error?: string;
}

// Task instance
export interface TaskInstance {
  id: string;
  taskId: TaskId;
  workflowInstanceId: string;
  status: TaskStatus;
  assignedTo?: UserId;
  variables: Record<string, any>;
  result?: Record<string, any>;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
  metadata?: Record<string, any>;
}

// Workflow execution context
export interface WorkflowExecutionContext {
  workflowInstance: WorkflowInstance;
  taskInstances: TaskInstance[];
  currentUser?: UserId;
  variables: Record<string, any>;
  metadata?: Record<string, any>;
}

// Type guards
export const isWorkflowStatus = (value: any): value is WorkflowStatus => {
  return Object.values(WorkflowStatus).includes(value);
};

export const isWorkflowState = (value: any): value is WorkflowState => {
  return Object.values(WorkflowState).includes(value);
};

export const isTaskStatus = (value: any): value is TaskStatus => {
  return Object.values(TaskStatus).includes(value);
};

export const isTaskType = (value: any): value is TaskType => {
  return Object.values(TaskType).includes(value);
};