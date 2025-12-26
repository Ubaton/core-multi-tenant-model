/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - LOGIN
 * POST /api/auth/login
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
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

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await parseBody(request, loginSchema);

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        firstName: true,
        lastName: true,
        role: true,
        tenantId: true,
        isActive: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        },
      },
    });

    if (!user) {
      return errorResponse('INVALID_CREDENTIALS', 'Invalid email or password', 401);
    }

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
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

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
