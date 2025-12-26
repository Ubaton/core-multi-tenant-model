/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANTS API - LIST & CREATE
 * GET  /api/tenants - List all tenants (Super Admin only)
 * POST /api/tenants - Create a new tenant (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withSuperAdmin, 
  successResponse, 
  createdResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
} from '@/lib/api';
import { createTenantSchema, searchSchema } from '@/lib/validations';

/**
 * GET /api/tenants
 * List all tenants with pagination and search
 */
export const GET = withSuperAdmin(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, search, sortBy, sortOrder } = parseSearchParams(
    searchParams,
    searchSchema
  );

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { slug: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
          { city: { contains: search, mode: 'insensitive' as const } },
        ],
      }
    : {};

  const { skip, take } = calculatePagination(page, pageSize);

  const [tenants, totalCount] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'createdAt']: sortOrder },
      include: {
        _count: {
          select: {
            users: true,
            members: true,
            branches: true,
          },
        },
        parent: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.tenant.count({ where }),
  ]);

  return successResponse(tenants, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/tenants
 * Create a new tenant
 */
export const POST = withSuperAdmin(async (request, { user }) => {
  const data = await parseBody(request, createTenantSchema);

  const tenant = await prisma.tenant.create({
    data: {
      ...data,
      slug: data.slug.toLowerCase(),
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  // Log audit
  await logAudit(
    user.id,
    null,
    'CREATE_TENANT',
    'Tenant',
    tenant.id,
    null,
    tenant,
    request
  );

  return createdResponse(tenant);
});
