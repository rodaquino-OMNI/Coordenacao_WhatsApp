/**
 * User Types
 * 
 * Type definitions for user management and authentication
 */

import { UserId, OrganizationId, TenantId, PhoneNumber, Email, CPF } from './core/branded.types';

// User role enumeration
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  MANAGER = 'manager',
  OPERATOR = 'operator',
  VIEWER = 'viewer',
  PATIENT = 'patient',
  PRACTITIONER = 'practitioner'
}

// User status enumeration
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING = 'pending'
}

// Base user interface
export interface User {
  id: UserId;
  email: Email;
  phone: PhoneNumber;
  cpf?: CPF;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  organizationId: OrganizationId;
  tenantId?: TenantId;
  permissions: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

// User creation data
export interface CreateUserData {
  email: string;
  phone: string;
  cpf?: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
  tenantId?: string;
  password: string;
  permissions?: string[];
  metadata?: Record<string, any>;
}

// User update data
export interface UpdateUserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  permissions?: string[];
  metadata?: Record<string, any>;
}

// User authentication data
export interface UserAuthData {
  id: UserId;
  email: Email;
  role: UserRole;
  organizationId: OrganizationId;
  tenantId?: TenantId;
  permissions: string[];
  sessionId: string;
  tokenVersion: number;
}

// User profile data
export interface UserProfile {
  id: UserId;
  email: Email;
  phone: PhoneNumber;
  firstName: string;
  lastName: string;
  fullName: string;
  avatar?: string;
  preferences?: UserPreferences;
  lastLoginAt?: Date;
}

// User preferences
export interface UserPreferences {
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  theme?: 'light' | 'dark' | 'auto';
}

// User search criteria
export interface UserSearchCriteria {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  organizationId?: OrganizationId;
  tenantId?: TenantId;
  createdAfter?: Date;
  createdBefore?: Date;
}

// Type guards
export const isUserRole = (value: any): value is UserRole => {
  return Object.values(UserRole).includes(value);
};

export const isUserStatus = (value: any): value is UserStatus => {
  return Object.values(UserStatus).includes(value);
};