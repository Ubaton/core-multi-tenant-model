/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - TOKEN REFRESH
 * POST /api/auth/refresh
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { 
  verifyRefreshToken, 
  generateAccessToken, 
  generateRefreshToken,
  setAuthCookies 
} from '@/lib/auth';
import { successResponse, errorResponse, handleError } from '@/lib/api';

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
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return errorResponse('USER_NOT_FOUND', 'User not found or inactive', 401);
    }

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
