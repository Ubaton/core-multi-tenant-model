/**
 * ════════════════════════════════════════════════════════════════════════════
 * OFFERINGS API - LIST & CREATE
 * GET  /api/offerings - List offerings (tenant-scoped)
 * POST /api/offerings - Record an offering
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma, Prisma } from '@/lib/db';
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
import { createOfferingSchema, offeringFilterSchema } from '@/lib/validations';

/**
 * GET /api/offerings
 * List offerings with filtering
 */
export const GET = withPermission('list', 'offering', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, offeringFilterSchema);
  const { 
    page, pageSize, search, sortBy, sortOrder, 
    type, memberId, serviceId, minAmount, maxAmount, from, to 
  } = filters;

  const where = {
    tenantId: context.tenantId,
    ...(search && {
      OR: [
        { giverName: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { reference: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(type && { type }),
    ...(memberId && { memberId }),
    ...(serviceId && { serviceId }),
    ...(minAmount && { amount: { gte: new Prisma.Decimal(minAmount) } }),
    ...(maxAmount && { amount: { lte: new Prisma.Decimal(maxAmount) } }),
    ...(from && { givenAt: { gte: from } }),
    ...(to && { givenAt: { lte: to } }),
  };

  const { skip, take } = calculatePagination(page, pageSize);

  const [offerings, totalCount, aggregates] = await Promise.all([
    prisma.offering.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'givenAt']: sortOrder },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            serviceDate: true,
          },
        },
      },
    }),
    prisma.offering.count({ where }),
    prisma.offering.aggregate({
      where,
      _sum: { amount: true },
      _avg: { amount: true },
      _count: true,
    }),
  ]);

  return successResponse(
    {
      offerings,
      summary: {
        totalAmount: aggregates._sum.amount?.toString() ?? '0',
        averageAmount: aggregates._avg.amount?.toString() ?? '0',
        count: aggregates._count,
      },
    },
    createPaginationMeta(page, pageSize, totalCount)
  );
});

/**
 * POST /api/offerings
 * Record a new offering
 */
export const POST = withPermission('create', 'offering', async (request, context) => {
  const data = await parseBody(request, createOfferingSchema);

  const offering = await prisma.offering.create({
    data: {
      ...data,
      tenantId: context.tenantId,
      amount: new Prisma.Decimal(data.amount),
      recordedBy: context.user.id,
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      service: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_OFFERING',
    'Offering',
    offering.id,
    null,
    offering,
    request
  );

  return createdResponse(offering);
});
