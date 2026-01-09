/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION TYPES
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Type definitions for authentication, authorization, and session management.
 */

import { UserRole } from '../generated/prisma';

/**
 * JWT Token payload structure
 * Contains essential user information for authorization
 */
export interface TokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId: string | null; // null for SUPER_ADMIN
  iat?: number;
  exp?: number;
}

/**
 * Authenticated user context available throughout the request
 */
export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  tenantId: string | null;
  isActive: boolean;
  mustChangePassword?: boolean;
}

/**
 * Session context combining auth and tenant information
 */
export interface SessionContext {
  user: AuthUser;
  tenantId: string | null;
  isSuperAdmin: boolean;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response payload
 */
export interface LoginResponse {
  user: Omit<AuthUser, 'isActive'>;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  invitationToken?: string; // For invited users joining a tenant
}

/**
 * Token refresh request
 */
export interface RefreshTokenRequest {
  refreshToken: string;
}

/**
 * Password reset request
 */
export interface PasswordResetRequest {
  email: string;
}

/**
 * Password reset confirmation
 */
export interface PasswordResetConfirmRequest {
  token: string;
  newPassword: string;
}

/**
 * Change password request (for authenticated users)
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
