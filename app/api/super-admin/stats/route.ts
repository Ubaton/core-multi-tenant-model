/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN PLATFORM STATS API
 * GET /api/super-admin/stats - Get platform-wide statistics
 * ════════════════════════════════════════════════════════════════════════════
 */

import { prisma } from '@/lib/db';
import { 
  withSuperAdmin, 
  successResponse,
} from '@/lib/api';

/**
 * GET /api/super-admin/stats
 * Get platform-wide statistics for Super Admin dashboard
 */
export const GET = withSuperAdmin(async () => {
  const [
    // Tenant counts
    totalTenants,
    activeTenants,
    hqTenants,

    // User counts
    totalUsers,
    activeUsers,

    // Member counts
    totalMembers,

    // Offering totals
    offeringsAggregate,
  ] = await Promise.all([
    // Tenants
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.tenant.count({ where: { isHQ: true } }),

    // Users
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),

    // Members
    prisma.member.count(),

    // Offerings - aggregate total
    prisma.offering.aggregate({
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  const totalOfferings = offeringsAggregate._sum.amount?.toString() ?? '0';
  const offeringsCount = offeringsAggregate._count ?? 0;

  return successResponse({
    tenants: {
      total: totalTenants,
      active: activeTenants,
      inactive: totalTenants - activeTenants,
      hq: hqTenants,
    },
    users: {
      total: totalUsers,
      active: activeUsers,
    },
    members: {
      total: totalMembers,
    },
    offerings: {
      total: totalOfferings,
      count: offeringsCount,
    },
  });
});
