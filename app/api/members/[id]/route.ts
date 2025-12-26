/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBERS API - SINGLE MEMBER OPERATIONS
 * GET    /api/members/[id] - Get member details
 * PATCH  /api/members/[id] - Update member
 * DELETE /api/members/[id] - Delete member
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withPermission, 
  successResponse,
  errorResponse,
  noContentResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateMemberSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

/**
 * GET /api/members/[id]
 * Get member details
 */
export const GET = withPermission<RouteParams>('read', 'member', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const member = await prisma.member.findFirst({
    where: { 
      id,
      tenantId: context.tenantId, // Ensure tenant isolation
    },
    include: {
      departments: {
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      offerings: {
        take: 10,
        orderBy: { givenAt: 'desc' },
        select: {
          id: true,
          type: true,
          amount: true,
          currency: true,
          givenAt: true,
        },
      },
      prayerRequests: {
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          status: true,
          createdAt: true,
        },
      },
      callLogs: {
        take: 5,
        orderBy: { calledAt: 'desc' },
        select: {
          id: true,
          outcome: true,
          notes: true,
          calledAt: true,
        },
      },
      convertedFromLead: {
        select: {
          id: true,
          source: true,
          convertedAt: true,
        },
      },
    },
  });

  if (!member) {
    return errorResponse('NOT_FOUND', 'Member not found', 404);
  }

  return successResponse(member);
});

/**
 * PATCH /api/members/[id]
 * Update member
 */
export const PATCH = withPermission<RouteParams>('update', 'member', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updateMemberSchema);

  // Get current member for audit
  const existingMember = await prisma.member.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
  });

  if (!existingMember) {
    return errorResponse('NOT_FOUND', 'Member not found', 404);
  }

  const member = await prisma.member.update({
    where: { id },
    data,
    include: {
      departments: {
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'UPDATE_MEMBER',
    'Member',
    member.id,
    existingMember,
    member,
    request
  );

  return successResponse(member);
});

/**
 * DELETE /api/members/[id]
 * Delete member
 */
export const DELETE = withPermission<RouteParams>('delete', 'member', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const existingMember = await prisma.member.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
  });

  if (!existingMember) {
    return errorResponse('NOT_FOUND', 'Member not found', 404);
  }

  // Delete member (cascades to related records based on schema)
  await prisma.member.delete({
    where: { id },
  });

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_MEMBER',
    'Member',
    id,
    existingMember,
    null,
    request
  );

  return noContentResponse();
});
