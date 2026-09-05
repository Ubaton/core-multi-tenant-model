/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTHENTICATION UTILITIES
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Core authentication functions including JWT management, password hashing,
 * and user verification. All security-critical operations happen server-side.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies, headers } from 'next/headers';
import { query } from './db';
import type { AuthUser, TokenPayload, SessionContext } from './types';
import { UserRole } from './types/db';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const SALT_ROUNDS = 12;

// Cookie configuration
const AUTH_COOKIE_NAME = 'auth_token';
const REFRESH_COOKIE_NAME = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

// ════════════════════════════════════════════════════════════════════════════
// PASSWORD UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Hash a plain-text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against its hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// ════════════════════════════════════════════════════════════════════════════
// TOKEN UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Generate an access token
 */
export function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

/**
 * Generate a refresh token
 */
export function generateRefreshToken(userId: string): string {
  return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRY });
}

/**
 * Verify and decode an access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Verify and decode a refresh token
 */
export function verifyRefreshToken(
  token: string
): { userId: string; iat?: number } | null {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET) as { userId: string; iat?: number };
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export async function getTokenFromHeader(): Promise<string | null> {
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice(7);
}

/**
 * Get token from cookie
 */
export async function getTokenFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

// ════════════════════════════════════════════════════════════════════════════
// SESSION MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

/**
 * Get the current authenticated user from the request
 * Checks both Authorization header and cookies
 */
/**
 * True when a token predates the user's session cutoff, i.e. it was issued
 * before a password reset signed every device out.
 *
 * `iat` is whole seconds, so the comparison is done in seconds and is strict:
 * a token minted in the same second as the cutoff is kept. That way a user who
 * signs in immediately after resetting is not bounced straight back out by
 * sub-second ordering.
 */
export function isTokenRevoked(
  issuedAt: number | undefined,
  sessionsValidFrom: Date | null
): boolean {
  if (!sessionsValidFrom) {
    return false;
  }
  // A token with no iat cannot be placed relative to the cutoff; refuse it
  // rather than let an unplaceable token through.
  if (issuedAt === undefined) {
    return true;
  }
  return issuedAt < Math.floor(new Date(sessionsValidFrom).getTime() / 1000);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  // Try header first (API calls), then cookie (browser navigation)
  const token = await getTokenFromHeader() ?? await getTokenFromCookie();
  
  if (!token) {
    return null;
  }

  const payload = verifyAccessToken(token);
  if (!payload) {
    return null;
  }

  // Fetch fresh user data from database to ensure it's current
  const rows = await query<{
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    tenant_id: string | null;
    is_active: boolean;
    sessions_valid_from: Date | null;
  }>(
    `SELECT id, email, first_name, last_name, role, tenant_id, is_active,
            sessions_valid_from
     FROM "user" WHERE id = $1 AND deleted_at IS NULL`,
    [payload.userId]
  );
  const row = rows[0];

  if (!row || !row.is_active) {
    return null;
  }

  // Signed out everywhere by a password reset since this token was issued.
  if (isTokenRevoked(payload.iat, row.sessions_valid_from)) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    tenantId: row.tenant_id,
    isActive: row.is_active,
  };
}

/**
 * Get full session context including tenant information
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  return {
    user,
    tenantId: user.tenantId,
    isSuperAdmin: user.role === UserRole.SUPER_ADMIN,
  };
}

/**
 * Require authentication - throws if not authenticated
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new AuthenticationError('Authentication required');
  }

  return user;
}

/**
 * Require specific role(s) - throws if not authorized
 */
export async function requireRole(...roles: UserRole[]): Promise<AuthUser> {
  const user = await requireAuth();
  
  if (!roles.includes(user.role)) {
    throw new AuthorizationError('Insufficient permissions');
  }

  return user;
}

/**
 * Set authentication cookies after login
 */
export async function setAuthCookies(accessToken: string, refreshToken: string): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set(AUTH_COOKIE_NAME, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 15 * 60, // 15 minutes
  });

  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });
}

/**
 * Clear authentication cookies on logout
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}

// ════════════════════════════════════════════════════════════════════════════
// ERROR CLASSES
// ════════════════════════════════════════════════════════════════════════════

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication required') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string = 'Insufficient permissions') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate a secure random token for invitations, password resets, etc.
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  return token;
}
