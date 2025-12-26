/**
 * ════════════════════════════════════════════════════════════════════════════
 * CALL LOGS API - LIST & CREATE
 * GET  /api/calls - List call logs (tenant-scoped)
 * POST /api/calls - Record a call
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withPermission, 
  successResponse, 
  createdResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
} from '@/lib/api';
import { createCallLogSchema, searchSchema } from '@/lib/validations';
import { z } from 'zod';
import { CallOutcome } from '@/lib/generated/prisma';

const callLogFilterSchema = searchSchema.extend({
  outcome: z.nativeEnum(CallOutcome).optional(),
  operatorId: z.string().cuid().optional(),
  memberId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  requiresFollowUp: z.coerce.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

/**
 * GET /api/calls
 * List call logs with filtering
 */
export const GET = withPermission('list', 'call_log', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, callLogFilterSchema);
  const { 
    page, pageSize, search, sortBy, sortOrder,
    outcome, operatorId, memberId, leadId, requiresFollowUp, from, to 
  } = filters;

  const where = {
    tenantId: context.tenantId,
    ...(search && {
      OR: [
        { phoneNumber: { contains: search } },
        { notes: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(outcome && { outcome }),
    ...(operatorId && { operatorId }),
    ...(memberId && { memberId }),
    ...(leadId && { leadId }),
    ...(requiresFollowUp !== undefined && { requiresFollowUp }),
    ...(from && { calledAt: { gte: from } }),
    ...(to && { calledAt: { lte: to } }),
  };

  const { skip, take } = calculatePagination(page, pageSize);

  const [callLogs, totalCount] = await Promise.all([
    prisma.callLog.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'calledAt']: sortOrder },
      include: {
        operator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    }),
    prisma.callLog.count({ where }),
  ]);

  return successResponse(callLogs, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/calls
 * Record a new call
 */
export const POST = withPermission('create', 'call_log', async (request, context) => {
  const data = await parseBody(request, createCallLogSchema);

  const callLog = await prisma.callLog.create({
    data: {
      ...data,
      tenantId: context.tenantId,
      operatorId: context.user.id,
    },
    include: {
      operator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Update lead's lastContactAt if this is a lead call
  if (data.leadId) {
    await prisma.lead.update({
      where: { id: data.leadId },
      data: { lastContactAt: new Date() },
    });
  }

  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_CALL_LOG',
    'CallLog',
    callLog.id,
    null,
    callLog,
    request
  );

  return createdResponse(callLog);
});
