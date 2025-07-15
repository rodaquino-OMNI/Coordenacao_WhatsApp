/**
 * Branded Types for Type Safety
 * 
 * These types provide compile-time safety for string/number values
 * that have specific semantic meaning in our domain.
 */

// Utility type for creating branded types
type Brand<K, T> = K & { __brand: T };

// User-related branded types
export type UserId = Brand<string, 'UserId'>;
export type PhoneNumber = Brand<string, 'PhoneNumber'>;
export type Email = Brand<string, 'Email'>;
export type CPF = Brand<string, 'CPF'>;

// Organization-related branded types
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type TenantId = Brand<string, 'TenantId'>;

// Medical-related branded types
export type PatientId = Brand<string, 'PatientId'>;
export type PractitionerId = Brand<string, 'PractitionerId'>;
export type AuthorizationId = Brand<string, 'AuthorizationId'>;
export type DocumentId = Brand<string, 'DocumentId'>;
export type ProcedureCode = Brand<string, 'ProcedureCode'>;
export type DiagnosisCode = Brand<string, 'DiagnosisCode'>;

// Session and conversation branded types
export type SessionId = Brand<string, 'SessionId'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type MessageId = Brand<string, 'MessageId'>;

// FHIR-related branded types
export type FHIRResourceId = Brand<string, 'FHIRResourceId'>;
export type FHIRReference = Brand<string, 'FHIRReference'>;

// Workflow branded types
export type WorkflowId = Brand<string, 'WorkflowId'>;
export type TaskId = Brand<string, 'TaskId'>;

// Type guards for branded types
export const isUserId = (value: string): value is UserId => {
  return typeof value === 'string' && value.length > 0;
};

export const isPhoneNumber = (value: string): value is PhoneNumber => {
  return /^\+?[1-9]\d{1,14}$/.test(value);
};

export const isEmail = (value: string): value is Email => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

export const isCPF = (value: string): value is CPF => {
  const cleanCPF = value.replace(/[^\d]/g, '');
  return cleanCPF.length === 11;
};

// Helper functions to create branded types
export const toUserId = (value: string): UserId => {
  if (!isUserId(value)) {
    throw new Error('Invalid user ID');
  }
  return value as UserId;
};

export const toPhoneNumber = (value: string): PhoneNumber => {
  if (!isPhoneNumber(value)) {
    throw new Error('Invalid phone number');
  }
  return value as PhoneNumber;
};

export const toEmail = (value: string): Email => {
  if (!isEmail(value)) {
    throw new Error('Invalid email');
  }
  return value as Email;
};

export const toCPF = (value: string): CPF => {
  if (!isCPF(value)) {
    throw new Error('Invalid CPF');
  }
  return value as CPF;
};

// Generic branded type creators
export const toBrandedId = <T extends string>(value: string, type: string): Brand<string, T> => {
  if (!value || typeof value !== 'string') {
    throw new Error(`Invalid ${type}`);
  }
  return value as Brand<string, T>;
};