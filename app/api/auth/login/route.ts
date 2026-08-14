/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - LOGIN
 * POST /api/auth/login
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies
} from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  handleError,
  parseBody
} from '@/lib/api';
import { loginSchema } from '@/lib/validations';
import type { UserRole } from '@/lib/types/db';

interface LoginUserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  tenant_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  tenant_id_ref: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  tenant_is_active: boolean | null;
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await parseBody(request, loginSchema);

    // Find user by email
    const rows = await query<LoginUserRow>(
      `SELECT
         u.id,
         u.email,
         u."passwordHash" AS password_hash,
         u."firstName" AS first_name,
         u."lastName" AS last_name,
         u.role,
         u."tenantId" AS tenant_id,
         u."isActive" AS is_active,
         u."mustChangePassword" AS must_change_password,
         t.id AS tenant_id_ref,
         t.name AS tenant_name,
         t.slug AS tenant_slug,
         t."isActive" AS tenant_is_active
       FROM "User" u
       LEFT JOIN "Tenant" t ON t.id = u."tenantId"
       WHERE u.email = $1`,
      [email.toLowerCase()]
    );
    const row = rows[0];

    if (!row) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    const user = {
      id: row.id,
      email: row.email,
      passwordHash: row.password_hash,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      tenantId: row.tenant_id,
      isActive: row.is_active,
      mustChangePassword: row.must_change_password,
      tenant: row.tenant_id_ref
        ? {
            id: row.tenant_id_ref,
            name: row.tenant_name!,
            slug: row.tenant_slug!,
            isActive: row.tenant_is_active!,
          }
        : null,
    };

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

    // Check if user is active
    if (!user.isActive) {
      return errorResponse('ACCOUNT_DISABLED', 'Your account has been disabled', 403);
    }

    // Check if tenant is active (for non-Super Admin)
    if (user.role !== 'SUPER_ADMIN' && user.tenant && !user.tenant.isActive) {
      return errorResponse('TENANT_INACTIVE', 'Your organization is currently inactive', 403);
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
    const refreshToken = generateRefreshToken(user.id);

    // Set cookies
    await setAuthCookies(accessToken, refreshToken);

    // Update last login
    await query(
      `UPDATE "User" SET "lastLoginAt" = NOW() WHERE id = $1`,
      [user.id]
    );

    // Calculate expiry (15 minutes from now)
    const expiresAt = Date.now() + 15 * 60 * 1000;

    return successResponse({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        tenantId: user.tenantId,
        mustChangePassword: user.mustChangePassword,
        tenant: user.tenant ? {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        } : null,
      },
      accessToken,
      refreshToken,
      expiresAt,
    });
  } catch (error) {
    return handleError(error);
  }
}
