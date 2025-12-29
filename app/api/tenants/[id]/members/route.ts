/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT MEMBERS API - Super Admin Access
 * GET /api/tenants/[id]/members - List members for a specific tenant
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withSuperAdmin, 
  successResponse,
  errorResponse,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
} from '@/lib/api';
import { memberFilterSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

/**
 * GET /api/tenants/[id]/members
 * List all members for a specific tenant (Super Admin only)
 */
export const GET = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id: tenantId } = idParamSchema.parse(params);
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, memberFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, status, gender, departmentId, joinDateFrom, joinDateTo } = filters;

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { id: true, name: true },
  });

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  const where = {
    tenantId,
    ...(search && {
      OR: [
        { firstName: { contains: search, mode: 'insensitive' as const } },
        { lastName: { contains: search, mode: 'insensitive' as const } },
        { email: { contains: search, mode: 'insensitive' as const } },
        { phone: { contains: search, mode: 'insensitive' as const } },
        { membershipId: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(status && { status }),
    ...(gender && { gender }),
    ...(joinDateFrom && { joinDate: { gte: joinDateFrom } }),
    ...(joinDateTo && { joinDate: { lte: joinDateTo } }),
    ...(departmentId && {
      departments: {
        some: { departmentId },
      },
    }),
  };

  const { skip, take } = calculatePagination(page, pageSize);

  const [members, totalCount] = await Promise.all([
    prisma.member.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'createdAt']: sortOrder },
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
        _count: {
          select: {
            offerings: true,
            prayerRequests: true,
          },
        },
      },
    }),
    prisma.member.count({ where }),
  ]);

  return successResponse(members, createPaginationMeta(page, pageSize, totalCount));
});
