/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN PLATFORM STATS API
 * GET /api/super-admin/stats - Get platform-wide statistics
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
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
    totalTenantsRows,
    activeTenantsRows,
    hqTenantsRows,

    totalUsersRows,
    activeUsersRows,

    totalMembersRows,

    offeringsAggregateRows,
  ] = await Promise.all([
    // Tenants
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM "Tenant"`),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM "Tenant" WHERE "isActive" = true`),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM "Tenant" WHERE "isHQ" = true`),

    // Users
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM "User"`),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM "User" WHERE "isActive" = true`),

    // Members
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM "Member"`),

    // Offerings - aggregate total
    query<{ sum: string | null; count: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS sum, COUNT(*) AS count FROM "Offering"`
    ),
  ]);

  const totalTenants = Number(totalTenantsRows[0]?.count ?? 0);
  const activeTenants = Number(activeTenantsRows[0]?.count ?? 0);
  const hqTenants = Number(hqTenantsRows[0]?.count ?? 0);

  const totalUsers = Number(totalUsersRows[0]?.count ?? 0);
  const activeUsers = Number(activeUsersRows[0]?.count ?? 0);

  const totalMembers = Number(totalMembersRows[0]?.count ?? 0);

  const totalOfferings = offeringsAggregateRows[0]?.sum?.toString() ?? '0';
  const offeringsCount = Number(offeringsAggregateRows[0]?.count ?? 0);

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
