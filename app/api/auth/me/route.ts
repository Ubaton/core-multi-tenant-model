/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - GET CURRENT USER
 * GET /api/auth/me
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse, handleError } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Not authenticated', 401);
    }

    // Fetch additional user details
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        tenantId: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        createdAt: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },
      },
    });

    if (!fullUser) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    return successResponse(fullUser);
  } catch (error) {
    return handleError(error);
  }
}
