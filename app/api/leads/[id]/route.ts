/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEADS API - SINGLE LEAD OPERATIONS
 * GET    /api/leads/[id] - Get lead details
 * PATCH  /api/leads/[id] - Update lead
 * DELETE /api/leads/[id] - Delete lead
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
import { updateLeadSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

/**
 * GET /api/leads/[id]
 * Get lead details
 */
export const GET = withPermission<RouteParams>('read', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const lead = await prisma.lead.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      convertedToMember: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
        },
      },
      callLogs: {
        take: 10,
        orderBy: { calledAt: 'desc' },
        include: {
          operator: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      communications: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          type: true,
          message: true,
          status: true,
          createdAt: true,
        },
      },
    },
  });

  if (!lead) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  return successResponse(lead);
});

/**
 * PATCH /api/leads/[id]
 * Update lead
 */
export const PATCH = withPermission<RouteParams>('update', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updateLeadSchema);

  // Get current lead for audit
  const existingLead = await prisma.lead.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
  });

  if (!existingLead) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  // Track assignment changes
  const assignmentUpdate = data.assignedToId && data.assignedToId !== existingLead.assignedToId
    ? { assignedAt: new Date() }
    : {};

  const lead = await prisma.lead.update({
    where: { id },
    data: {
      ...data,
      ...assignmentUpdate,
      lastContactAt: new Date(),
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  });

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'UPDATE_LEAD',
    'Lead',
    lead.id,
    existingLead,
    lead,
    request
  );

  return successResponse(lead);
});

/**
 * DELETE /api/leads/[id]
 * Delete lead
 */
export const DELETE = withPermission<RouteParams>('delete', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const existingLead = await prisma.lead.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
  });

  if (!existingLead) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  await prisma.lead.delete({
    where: { id },
  });

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_LEAD',
    'Lead',
    id,
    existingLead,
    null,
    request
  );

  return noContentResponse();
});
