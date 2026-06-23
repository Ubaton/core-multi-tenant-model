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
    prisma.tenant.count({ cacheStrategy: { ttl: 300, swr: 60 } }),
    prisma.tenant.count({ where: { isActive: true }, cacheStrategy: { ttl: 300, swr: 60 } }),
    prisma.tenant.count({ where: { isHQ: true }, cacheStrategy: { ttl: 300, swr: 60 } }),

    // Users
    prisma.user.count({ cacheStrategy: { ttl: 300, swr: 60 } }),
    prisma.user.count({ where: { isActive: true }, cacheStrategy: { ttl: 300, swr: 60 } }),

    // Members
    prisma.member.count({ cacheStrategy: { ttl: 300, swr: 60 } }),

    // Offerings - aggregate total
    prisma.offering.aggregate({
      _sum: { amount: true },
      _count: true,
      cacheStrategy: { ttl: 300, swr: 60 },
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
