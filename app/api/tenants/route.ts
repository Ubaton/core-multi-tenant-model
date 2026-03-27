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

  // Extract user data from tenant data
  const { adminUser, additionalUsers, ...tenantData } = data;

  // Collect all users to be created for duplicate-email checks
  const allUsersToCreate = [
    ...(adminUser ? [{ ...adminUser, role: 'CHURCH_ADMIN' as const }] : []),
    ...(additionalUsers ?? []),
  ];

  // Check for duplicate emails within the submitted payload
  const submittedEmails = allUsersToCreate.map((u) => u.email.toLowerCase());
  const uniqueEmails = new Set(submittedEmails);
  if (submittedEmails.length !== uniqueEmails.size) {
    return errorResponse(
      'DUPLICATE_EMAIL',
      'Duplicate email addresses found in the user list',
      400
    );
  }

  // Check that none of these emails already exist in the DB
  for (const userEntry of allUsersToCreate) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userEntry.email },
    });
    if (existingUser) {
      return errorResponse(
        'EMAIL_EXISTS',
        `A user account with email "${userEntry.email}" already exists`,
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

  // Create tenant and all users in a single transaction
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

    // Create all users (admin + additional) with their respective roles
    const createdUsers: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    }> = [];

    for (const userEntry of allUsersToCreate) {
      const hashedPassword = await hashPassword(userEntry.password);
      const createdUser = await tx.user.create({
        data: {
          email: userEntry.email,
          passwordHash: hashedPassword,
          firstName: userEntry.firstName,
          lastName: userEntry.lastName,
          phone: userEntry.phone,
          role: userEntry.role,
          tenantId: tenant.id,
          isActive: true,
          mustChangePassword: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
        },
      });
      createdUsers.push(createdUser);
    }

    return { tenant, createdUsers };
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
      usersCreated: result.createdUsers.map((u) => ({ id: u.id, email: u.email, role: u.role })),
    },
    request
  );

  // Build a map of email -> plain-text password for the response (shown once)
  const passwordMap: Record<string, string> = {};
  for (const userEntry of allUsersToCreate) {
    passwordMap[userEntry.email] = userEntry.password;
  }

  return createdResponse({
    tenant: result.tenant,
    // Keep backward-compat: adminUser is the first CHURCH_ADMIN created
    adminUser: result.createdUsers.find((u) => u.role === 'CHURCH_ADMIN') ?? null,
    createdUsers: result.createdUsers,
    // Passwords shown once so Super Admin can share them with users
    generatedPasswords: passwordMap,
  });
});
