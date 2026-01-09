/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANTS API - LIST & CREATE
 * GET  /api/tenants - List all tenants (Super Admin only)
 * POST /api/tenants - Create a new tenant (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { 
  withSuperAdmin, 
  successResponse, 
  createdResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
  errorResponse,
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
            offerings: true,
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

  // Get offering totals for each tenant
  const tenantIds = tenants.map(t => t.id);
  const offeringTotals = await prisma.offering.groupBy({
    by: ['tenantId'],
    where: { tenantId: { in: tenantIds } },
    _sum: { amount: true },
  });

  // Map offering totals to tenants
  const offeringTotalMap = new Map(
    offeringTotals.map(o => [o.tenantId, o._sum.amount?.toString() ?? '0'])
  );

  const tenantsWithOfferings = tenants.map(tenant => ({
    ...tenant,
    totalOfferings: offeringTotalMap.get(tenant.id) ?? '0',
  }));

  return successResponse(tenantsWithOfferings, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/tenants
 * Create a new tenant with optional admin user account
 */
export const POST = withSuperAdmin(async (request, { user }) => {
  const data = await parseBody(request, createTenantSchema);

  // Extract admin user data if provided
  const { adminUser, ...tenantData } = data;

  // If admin user is provided, check if email already exists
  if (adminUser) {
    const existingUser = await prisma.user.findUnique({
      where: { email: adminUser.email },
    });

    if (existingUser) {
      return errorResponse(
        'EMAIL_EXISTS',
        'A user account with this email already exists',
        400
      );
    }
  }

  // Check if slug already exists
  const existingTenant = await prisma.tenant.findUnique({
    where: { slug: tenantData.slug.toLowerCase() },
  });

  if (existingTenant) {
    return errorResponse(
      'SLUG_EXISTS',
      'A tenant with this slug already exists',
      400
    );
  }

  // Create tenant and optionally admin user in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        ...tenantData,
        slug: tenantData.slug.toLowerCase(),
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

    let createdUser = null;

    // If admin user data is provided, create the admin account
    if (adminUser) {
      const hashedPassword = await hashPassword(adminUser.password);

      createdUser = await tx.user.create({
        data: {
          email: adminUser.email,
          passwordHash: hashedPassword,
          firstName: adminUser.firstName,
          lastName: adminUser.lastName,
          phone: adminUser.phone,
          role: 'CHURCH_ADMIN',
          tenantId: tenant.id,
          isActive: true,
          mustChangePassword: true, // Enforce password change on first login
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
    }

    return { tenant, adminUser: createdUser };
  });

  // Log audit
  await logAudit(
    user.id,
    null,
    'CREATE_TENANT',
    'Tenant',
    result.tenant.id,
    null,
    {
      tenant: result.tenant,
      adminUser: result.adminUser ? { 
        id: result.adminUser.id, 
        email: result.adminUser.email 
      } : null,
    },
    request
  );

  return createdResponse({
    tenant: result.tenant,
    adminUser: result.adminUser,
    // Include the password in response so Super Admin can share it with tenant
    // This is only shown once and should be communicated to the tenant
    generatedPassword: adminUser?.password,
  });
});
