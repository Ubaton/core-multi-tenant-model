/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBERS API - LIST & CREATE
 * GET  /api/members - List members (tenant-scoped)
 * POST /api/members - Create a new member
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
import { createMemberSchema, memberFilterSchema } from '@/lib/validations';

/**
 * GET /api/members
 * List members with filtering and pagination
 */
export const GET = withPermission('list', 'member', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, memberFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, status, gender, departmentId, joinDateFrom, joinDateTo } = filters;

  const where = {
    tenantId: context.tenantId,
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

/**
 * POST /api/members
 * Create a new member
 */
export const POST = withPermission('create', 'member', async (request, context) => {
  const data = await parseBody(request, createMemberSchema);

  const member = await prisma.member.create({
    data: {
      ...data,
      tenantId: context.tenantId,
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
    },
  });

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_MEMBER',
    'Member',
    member.id,
    null,
    member,
    request
  );

  return createdResponse(member);
});
