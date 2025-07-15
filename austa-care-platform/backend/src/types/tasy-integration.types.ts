/**
 * TASY Integration Types
 * 
 * Type definitions for TASY hospital management system integration
 */

import { PatientId, PractitionerId, AuthorizationId, DocumentId, CPF } from './core/branded.types';

// TASY API response status
export enum TasyResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  PARTIAL = 'partial'
}

// TASY patient status
export enum TasyPatientStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DECEASED = 'deceased',
  BLOCKED = 'blocked'
}

// TASY authorization status
export enum TasyAuthorizationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  DENIED = 'denied',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

// TASY procedure status
export enum TasyProcedureStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show'
}

// Base TASY API response
export interface TasyAPIResponse<T = any> {
  status: TasyResponseStatus;
  message?: string;
  data?: T;
  errors?: TasyError[];
  timestamp: string;
  requestId?: string;
}

// TASY error structure
export interface TasyError {
  code: string;
  message: string;
  field?: string;
  details?: any;
}

// TASY patient information
export interface TasyPatient {
  patientId: PatientId;
  cpf: CPF;
  name: string;
  socialName?: string;
  dateOfBirth: Date;
  gender: 'M' | 'F' | 'O';
  status: TasyPatientStatus;
  contact: {
    phone?: string;
    mobile?: string;
    email?: string;
    address?: TasyAddress;
  };
  insurance?: TasyInsurance[];
  emergencyContact?: TasyEmergencyContact;
  medicalRecord: string;
  registrationDate: Date;
  lastUpdate: Date;
}

// TASY address structure
export interface TasyAddress {
  street: string;
  number?: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// TASY insurance information
export interface TasyInsurance {
  code: string;
  name: string;
  cardNumber?: string;
  validFrom: Date;
  validTo?: Date;
  isPrimary: boolean;
  coverage?: string[];
}

// TASY emergency contact
export interface TasyEmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  mobile?: string;
}

// TASY authorization request
export interface TasyAuthorizationRequest {
  patientId: PatientId;
  procedureCode: string;
  procedureName: string;
  practitionerId: PractitionerId;
  requestDate: Date;
  urgency: 'routine' | 'urgent' | 'emergency';
  justification: string;
  estimatedCost?: number;
  attachments?: DocumentId[];
  metadata?: Record<string, any>;
}

// TASY authorization response
export interface TasyAuthorization {
  authorizationId: AuthorizationId;
  patientId: PatientId;
  procedureCode: string;
  status: TasyAuthorizationStatus;
  approvedAmount?: number;
  approvedQuantity?: number;
  validFrom?: Date;
  validTo?: Date;
  restrictions?: string[];
  reviewer?: {
    practitionerId: PractitionerId;
    name: string;
    reviewDate: Date;
    comments?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// TASY procedure information
export interface TasyProcedure {
  procedureId: string;
  authorizationId?: AuthorizationId;
  patientId: PatientId;
  practitionerId: PractitionerId;
  procedureCode: string;
  procedureName: string;
  status: TasyProcedureStatus;
  scheduledDate?: Date;
  performedDate?: Date;
  location?: string;
  cost?: number;
  results?: string;
  complications?: string;
  followUp?: string;
  attachments?: DocumentId[];
  metadata?: Record<string, any>;
}

// TASY practitioner information
export interface TasyPractitioner {
  practitionerId: PractitionerId;
  cpf: CPF;
  name: string;
  specialty: string;
  license: string;
  isActive: boolean;
  contact: {
    phone?: string;
    email?: string;
  };
  department?: string;
  schedule?: TasySchedule[];
}

// TASY schedule information
export interface TasySchedule {
  dayOfWeek: number; // 0-6 (Sunday to Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  location?: string;
  maxAppointments?: number;
}

// TASY appointment information
export interface TasyAppointment {
  appointmentId: string;
  patientId: PatientId;
  practitionerId: PractitionerId;
  scheduledDate: Date;
  duration: number; // in minutes
  type: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  location?: string;
  notes?: string;
  reminders?: TasyReminder[];
}

// TASY reminder information
export interface TasyReminder {
  type: 'email' | 'sms' | 'call';
  scheduledFor: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  message?: string;
}

// TASY integration configuration
export interface TasyIntegrationConfig {
  baseUrl: string;
  apiKey: string;
  timeout: number;
  retryAttempts: number;
  rateLimiting: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
  webhooks?: {
    url: string;
    events: string[];
    secret: string;
  };
}

// TASY sync status
export interface TasySyncStatus {
  lastSync: Date;
  status: 'success' | 'error' | 'in_progress';
  recordsSynced: number;
  errors?: TasyError[];
  nextSync?: Date;
}

// TASY search criteria
export interface TasySearchCriteria {
  patientId?: PatientId;
  cpf?: string;
  name?: string;
  dateOfBirth?: Date;
  medicalRecord?: string;
  dateRange?: {
    from: Date;
    to: Date;
  };
  status?: TasyPatientStatus[];
  limit?: number;
  offset?: number;
}

// Type guards
export const isTasyResponseStatus = (value: any): value is TasyResponseStatus => {
  return Object.values(TasyResponseStatus).includes(value);
};

export const isTasyPatientStatus = (value: any): value is TasyPatientStatus => {
  return Object.values(TasyPatientStatus).includes(value);
};

export const isTasyAuthorizationStatus = (value: any): value is TasyAuthorizationStatus => {
  return Object.values(TasyAuthorizationStatus).includes(value);
};

export const isTasyProcedureStatus = (value: any): value is TasyProcedureStatus => {
  return Object.values(TasyProcedureStatus).includes(value);
};