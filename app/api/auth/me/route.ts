/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - GET/UPDATE CURRENT USER
 * GET   /api/auth/me - Get current user
 * PATCH /api/auth/me - Update current user profile
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse, handleError, parseBody } from '@/lib/api';
import { z } from 'zod';
import type { UserRole } from '@/lib/types/db';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional(),
});

interface FullUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  tenant_id: string | null;
  is_active: boolean;
  email_verified: boolean;
  must_change_password: boolean;
  last_login_at: Date | null;
  created_at: Date;
  tenant_id_ref: string | null;
  tenant_name: string | null;
  tenant_slug: string | null;
  tenant_logo: string | null;
}

function mapFullUser(row: FullUserRow) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role,
    tenantId: row.tenant_id,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    tenant: row.tenant_id_ref
      ? {
          id: row.tenant_id_ref,
          name: row.tenant_name,
          slug: row.tenant_slug,
          logo: row.tenant_logo,
        }
      : null,
  };
}

const FULL_USER_SELECT = `
  SELECT
    u.id,
    u.email,
    u."firstName" AS first_name,
    u."lastName" AS last_name,
    u.phone,
    u.avatar,
    u.role,
    u."tenantId" AS tenant_id,
    u."isActive" AS is_active,
    u."emailVerified" AS email_verified,
    u."mustChangePassword" AS must_change_password,
    u."lastLoginAt" AS last_login_at,
    u."createdAt" AS created_at,
    t.id AS tenant_id_ref,
    t.name AS tenant_name,
    t.slug AS tenant_slug,
    t.logo AS tenant_logo
  FROM "User" u
  LEFT JOIN "Tenant" t ON t.id = u."tenantId"
  WHERE u.id = $1
`;

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Not authenticated', 401);
    }

    // Fetch additional user details
    const rows = await query<FullUserRow>(FULL_USER_SELECT, [user.id]);
    const fullUser = rows[0];

    if (!fullUser) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    return successResponse(mapFullUser(fullUser));
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/auth/me
 * Update current user's profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const data = updateProfileSchema.parse(body);

    // Check if email is being changed and if it's already in use
    if (data.email && data.email !== user.email) {
      const existingRows = await query<{ id: string }>(
        `SELECT id FROM "User" WHERE email = $1`,
        [data.email]
      );
      if (existingRows[0]) {
        return errorResponse('CONFLICT', 'Email already in use', 409);
      }
    }

    // Build dynamic SET clause for only the provided fields
    const setClauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (data.firstName) {
      setClauses.push(`"firstName" = $${idx++}`);
      values.push(data.firstName);
    }
    if (data.lastName) {
      setClauses.push(`"lastName" = $${idx++}`);
      values.push(data.lastName);
    }
    if (data.phone !== undefined) {
      setClauses.push(`phone = $${idx++}`);
      values.push(data.phone);
    }
    if (data.email) {
      setClauses.push(`email = $${idx++}`);
      values.push(data.email);
    }

    if (setClauses.length > 0) {
      values.push(user.id);
      await query(
        `UPDATE "User" SET ${setClauses.join(', ')} WHERE id = $${idx}`,
        values
      );
    }

    const rows = await query<FullUserRow>(FULL_USER_SELECT, [user.id]);
    const updatedUser = mapFullUser(rows[0]);

    return successResponse(updatedUser);
  } catch (error) {
    return handleError(error);
  }
}
