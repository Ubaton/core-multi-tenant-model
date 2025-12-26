/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRAYER REQUESTS API - LIST & CREATE
 * GET  /api/prayer-requests - List prayer requests (tenant-scoped)
 * POST /api/prayer-requests - Submit a prayer request
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withPermission,
  withPublic,
  successResponse, 
  createdResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
} from '@/lib/api';
import { createPrayerRequestSchema, prayerRequestFilterSchema } from '@/lib/validations';

/**
 * GET /api/prayer-requests
 * List prayer requests with filtering
 */
export const GET = withPermission('list', 'prayer_request', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, prayerRequestFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, status, isUrgent, memberId } = filters;

  const where = {
    tenantId: context.tenantId,
    ...(search && {
      OR: [
        { title: { contains: search, mode: 'insensitive' as const } },
        { description: { contains: search, mode: 'insensitive' as const } },
        { requestorName: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(status && { status }),
    ...(isUrgent !== undefined && { isUrgent }),
    ...(memberId && { memberId }),
  };

  const { skip, take } = calculatePagination(page, pageSize);

  const [prayerRequests, totalCount] = await Promise.all([
    prisma.prayerRequest.findMany({
      where,
      skip,
      take,
      orderBy: [
        { isUrgent: 'desc' },
        { [sortBy || 'createdAt']: sortOrder },
      ],
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.prayerRequest.count({ where }),
  ]);

  return successResponse(prayerRequests, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/prayer-requests
 * Submit a prayer request (can be public)
 */
export const POST = withPublic(async (request, context) => {
  const data = await parseBody(request, createPrayerRequestSchema);

  if (!context.tenant) {
    // For public submissions, tenant must be identifiable
    const { successResponse: _, ...rest } = await import('@/lib/api');
    return (await import('@/lib/api')).errorResponse(
      'TENANT_REQUIRED',
      'Unable to identify church for this request',
      400
    );
  }

  const prayerRequest = await prisma.prayerRequest.create({
    data: {
      ...data,
      tenantId: context.tenant.tenantId!,
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log audit if user is authenticated
  if (context.user) {
    await logAudit(
      context.user.id,
      context.tenant.tenantId,
      'CREATE_PRAYER_REQUEST',
      'PrayerRequest',
      prayerRequest.id,
      null,
      prayerRequest,
      request
    );
  }

  return createdResponse(prayerRequest);
});
