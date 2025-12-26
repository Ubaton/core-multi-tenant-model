/**
 * ════════════════════════════════════════════════════════════════════════════
 * USERS API - GET, UPDATE, DELETE SINGLE USER
 * GET    /api/users/[id] - Get user details
 * PATCH  /api/users/[id] - Update user
 * DELETE /api/users/[id] - Delete user
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { 
  withSuperAdmin, 
  successResponse, 
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { z } from 'zod';

const updateUserSchema = z.object({
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  role: z.enum(['SUPER_ADMIN', 'CHURCH_ADMIN', 'STAFF', 'CALL_CENTER', 'SUBSCRIBER', 'MEMBER']).optional(),
  tenantId: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
});

interface RouteParams {
  id: string;
}

/**
 * GET /api/users/[id]
 * Get a single user's details
 */
export const GET = withSuperAdmin<RouteParams>(async (request: NextRequest, { user }, params) => {
  const { id } = params;

  const targetUser = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      isActive: true,
      emailVerified: true,
      lastLoginAt: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          callLogs: true,
          assignedLeads: true,
          sentCommunications: true,
        },
      },
    },
  });

  if (!targetUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  return successResponse(targetUser);
});

/**
 * PATCH /api/users/[id]
 * Update a user
 */
export const PATCH = withSuperAdmin<RouteParams>(async (request: NextRequest, { user }, params) => {
  const { id } = params;
  const body = await parseBody(request, updateUserSchema);

  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  // Check for email uniqueness if changing email
  if (body.email && body.email !== existingUser.email) {
    const emailTaken = await prisma.user.findUnique({
      where: { email: body.email },
    });
    if (emailTaken) {
      return errorResponse('CONFLICT', 'Email already exists', 409);
    }
  }

  // Prepare update data
  const updateData: Record<string, unknown> = { ...body };
  
  // Hash password if provided
  if (body.password) {
    updateData.passwordHash = await bcrypt.hash(body.password, 12);
    delete updateData.password;
  }

  const updatedUser = await prisma.user.update({
    where: { id },
    data: updateData,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      isActive: true,
      emailVerified: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      updatedAt: true,
    },
  });

  await logAudit(
    user.id,
    user.tenantId,
    'UPDATE',
    'User',
    id,
    { email: existingUser.email, role: existingUser.role },
    { email: updatedUser.email, role: updatedUser.role }
  );

  return successResponse(updatedUser);
});

/**
 * DELETE /api/users/[id]
 * Delete a user
 */
export const DELETE = withSuperAdmin<RouteParams>(async (request: NextRequest, { user }, params) => {
  const { id } = params;

  // Prevent self-deletion
  if (id === user.id) {
    return errorResponse('BAD_REQUEST', 'Cannot delete your own account', 400);
  }

  const existingUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  await prisma.user.delete({
    where: { id },
  });

  await logAudit(
    user.id,
    user.tenantId,
    'DELETE',
    'User',
    id,
    { email: existingUser.email, role: existingUser.role }
  );

  return successResponse({ message: 'User deleted successfully' });
});
