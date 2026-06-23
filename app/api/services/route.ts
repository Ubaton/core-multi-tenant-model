/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICES API - LIST & CREATE
 * GET  /api/services - List services (tenant-scoped)
 * POST /api/services - Create a new service
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
import { createServiceSchema, searchSchema } from '@/lib/validations';
import { z } from 'zod';

// Service filter schema
const serviceFilterSchema = searchSchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  upcoming: z.coerce.boolean().optional(),
});

/**
 * GET /api/services
 * List services with filtering
 */
export const GET = withPermission('list', 'service', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, serviceFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, from, to, upcoming } = filters;

  const now = new Date();
  
  const where = {
    tenantId: context.tenantId,
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(from && { serviceDate: { gte: from } }),
    ...(to && { serviceDate: { lte: to } }),
    ...(upcoming === true && { serviceDate: { gte: now } }),
    ...(upcoming === false && { serviceDate: { lt: now } }),
  };

  const { skip, take } = calculatePagination(page, pageSize);

  const [services, totalCount, stats] = await Promise.all([
    prisma.service.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'serviceDate']: sortOrder || 'desc' },
      cacheStrategy: { ttl: 30, swr: 10 },
      include: {
        _count: {
          select: {
            offerings: true,
          },
        },
      },
    }),
    prisma.service.count({ where }),
    // Get service statistics
    prisma.service.aggregate({
      where: { tenantId: context.tenantId },
      _count: true,
      _sum: { attendanceCount: true },
      _avg: { attendanceCount: true },
      cacheStrategy: { ttl: 30, swr: 10 },
    }),
  ]);

  // Calculate upcoming vs past
  const upcomingCount = await prisma.service.count({
    where: { tenantId: context.tenantId, serviceDate: { gte: now } },
    cacheStrategy: { ttl: 30, swr: 10 },
  });

  return successResponse(
    {
      services,
      summary: {
        total: stats._count,
        upcomingCount,
        pastCount: stats._count - upcomingCount,
        totalAttendance: stats._sum.attendanceCount ?? 0,
        averageAttendance: Math.round(stats._avg.attendanceCount ?? 0),
      },
    },
    createPaginationMeta(page, pageSize, totalCount)
  );
});

/**
 * POST /api/services
 * Create a new service
 */
export const POST = withPermission('create', 'service', async (request, context) => {
  const data = await parseBody(request, createServiceSchema);

  const service = await prisma.service.create({
    data: {
      ...data,
      tenantId: context.tenantId,
    },
    include: {
      _count: {
        select: {
          offerings: true,
        },
      },
    },
  });

  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_SERVICE',
    'Service',
    service.id,
    null,
    service,
    request
  );

  return createdResponse(service);
});
