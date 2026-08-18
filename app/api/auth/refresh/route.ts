/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - TOKEN REFRESH
 * POST /api/auth/refresh
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { query } from '@/lib/db';
import {
  verifyRefreshToken,
  generateAccessToken,
  generateRefreshToken,
  setAuthCookies
} from '@/lib/auth';
import { successResponse, errorResponse, handleError } from '@/lib/api';
import type { UserRole } from '@/lib/types/db';

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie or body
    const cookieStore = await cookies();
    let refreshToken = cookieStore.get('refresh_token')?.value;

    if (!refreshToken) {
      const body = await request.json().catch(() => ({}));
      refreshToken = body.refreshToken;
    }

    if (!refreshToken) {
      return errorResponse('MISSING_TOKEN', 'Refresh token is required', 400);
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      return errorResponse('INVALID_TOKEN', 'Invalid or expired refresh token', 401);
    }

    // Get user
    const rows = await query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: UserRole;
      tenant_id: string | null;
      is_active: boolean;
    }>(
      `SELECT id, email, first_name, last_name, role, tenant_id, is_active
       FROM "user" WHERE id = $1`,
      [payload.userId]
    );
    const row = rows[0];

    if (!row || !row.is_active) {
      return errorResponse('USER_NOT_FOUND', 'User not found or inactive', 401);
    }

    const user = {
      id: row.id,
      email: row.email,
      firstName: row.first_name,
      lastName: row.last_name,
      role: row.role,
      tenantId: row.tenant_id,
      isActive: row.is_active,
    };

    // Generate new tokens
    const newAccessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
    });
    const newRefreshToken = generateRefreshToken(user.id);

    // Set cookies
    await setAuthCookies(newAccessToken, newRefreshToken);

    const expiresAt = Date.now() + 15 * 60 * 1000;

    return successResponse({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresAt,
    });
  } catch (error) {
    return handleError(error);
  }
}
