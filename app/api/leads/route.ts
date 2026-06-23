/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEADS API - LIST & CREATE
 * GET  /api/leads - List leads (tenant-scoped)
 * POST /api/leads - Create a new lead
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
import { createLeadSchema, leadFilterSchema } from '@/lib/validations';

/**
 * GET /api/leads
 * List leads with filtering and pagination
 */
export const GET = withPermission('list', 'lead', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, leadFilterSchema);
  const { 
    page, pageSize, search, sortBy, sortOrder, 
    status, source, assignedToId, unassigned, 
    createdFrom, createdTo 
  } = filters;

  const where = {
    tenantId: context.tenantId,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(status && { status }),
    ...(source && { source }),
    ...(assignedToId && { assignedToId }),
    ...(unassigned && { assignedToId: null }),
    ...(createdFrom && { createdAt: { gte: createdFrom } }),
    ...(createdTo && { createdAt: { lte: createdTo } }),
  };

  const { skip, take } = calculatePagination(page, pageSize);

  const [leads, totalCount] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'createdAt']: sortOrder },
      cacheStrategy: { ttl: 30, swr: 10 },
      include: {
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
        convertedToMember: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            callLogs: true,
            communications: true,
          },
        },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return successResponse(leads, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/leads
 * Create a new lead
 */
export const POST = withPermission('create', 'lead', async (request, context) => {
  const data = await parseBody(request, createLeadSchema);

  const lead = await prisma.lead.create({
    data: {
      ...data,
      tenantId: context.tenantId,
      ...(data.assignedToId && { assignedAt: new Date() }),
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
    'CREATE_LEAD',
    'Lead',
    lead.id,
    null,
    lead,
    request
  );

  return createdResponse(lead);
});
