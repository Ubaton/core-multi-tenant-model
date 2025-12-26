/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - GET/UPDATE CURRENT USER
 * GET   /api/auth/me - Get current user
 * PATCH /api/auth/me - Update current user profile
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse, handleError, parseBody } from '@/lib/api';
import { z } from 'zod';

const updateProfileSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional().nullable(),
  email: z.string().email().optional(),
});

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
      const existingUser = await prisma.user.findUnique({
        where: { email: data.email },
      });
      if (existingUser) {
        return errorResponse('CONFLICT', 'Email already in use', 409);
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email && { email: data.email }),
      },
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

    return successResponse(updatedUser);
  } catch (error) {
    return handleError(error);
  }
}
