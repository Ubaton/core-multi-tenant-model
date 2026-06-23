/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT PROFILE API - GET & UPDATE OWN TENANT
 * GET   /api/tenant/profile - Get current user's tenant details
 * PATCH /api/tenant/profile - Update current user's tenant details
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * This endpoint allows authenticated tenant users to access and update their
 * own organization's profile information.
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withAuth, 
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateTenantSchema } from '@/lib/validations';

/**
 * GET /api/tenant/profile
 * Get the current user's tenant (organization) details
 */
export const GET = withAuth(async (request, { user, tenantId }) => {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    cacheStrategy: { ttl: 60, swr: 10 },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      branches: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          users: true,
          members: true,
          leads: true,
          offerings: true,
          prayerRequests: true,
        },
      },
    },
  });

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Get total offerings amount for this tenant
  const offeringTotal = await prisma.offering.aggregate({
    where: { tenantId },
    _sum: { amount: true },
    cacheStrategy: { ttl: 60, swr: 10 },
  });

  // Get this month's offerings
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthOfferings = await prisma.offering.aggregate({
    where: { 
      tenantId,
      givenAt: { gte: startOfMonth },
    },
    _sum: { amount: true },
    _count: true,
    cacheStrategy: { ttl: 60, swr: 10 },
  });

  return successResponse({
    ...tenant,
    totalOfferings: offeringTotal._sum.amount?.toString() ?? '0',
    thisMonthOfferings: {
      total: thisMonthOfferings._sum.amount?.toString() ?? '0',
      count: thisMonthOfferings._count,
    },
  });
});

/**
 * PATCH /api/tenant/profile
 * Update the current user's tenant (organization) details
 * Requires CHURCH_ADMIN role or specific permissions
 */
export const PATCH = withAuth(async (request, { user, tenantId }) => {
  // Only allow admin users to update tenant info
  const allowedRoles = ['SUPER_ADMIN', 'CHURCH_ADMIN', 'PASTOR', 'ADMIN'];
  if (!allowedRoles.includes(user.role)) {
    return errorResponse('FORBIDDEN', 'You do not have permission to update organization settings', 403);
  }

  const data = await parseBody(request, updateTenantSchema);

  // Get current tenant for audit
  const currentTenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!currentTenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  // Update the tenant
  const updatedTenant = await prisma.tenant.update({
    where: { id: tenantId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.logo !== undefined && { logo: data.logo }),
      ...(data.website !== undefined && { website: data.website }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.address !== undefined && { address: data.address }),
      ...(data.city !== undefined && { city: data.city }),
      ...(data.state !== undefined && { state: data.state }),
      ...(data.postalCode !== undefined && { postalCode: data.postalCode }),
      ...(data.country && { country: data.country }),
      ...(data.timezone && { timezone: data.timezone }),
      // Note: isActive is not allowed to be changed by tenant users
    },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      branches: {
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
      },
      _count: {
        select: {
          users: true,
          members: true,
          leads: true,
          offerings: true,
          prayerRequests: true,
        },
      },
    },
  });

  // Log audit
  await logAudit(
    user.id,
    tenantId,
    'UPDATE_TENANT',
    'Tenant',
    tenantId,
    currentTenant,
    updatedTenant,
    request
  );

  return successResponse(updatedTenant);
});
