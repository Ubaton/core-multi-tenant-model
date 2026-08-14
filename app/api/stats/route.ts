/**
 * ════════════════════════════════════════════════════════════════════════════
 * STATISTICS API - DASHBOARD STATS
 * GET /api/stats - Get dashboard statistics (tenant-scoped)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import { MemberStatus, LeadStatus, PrayerRequestStatus } from '@/lib/types/db';
import {
  withPermission,
  successResponse,
  parseSearchParams,
} from '@/lib/api';
import { dateRangeSchema } from '@/lib/validations';

/**
 * GET /api/stats
 * Get tenant dashboard statistics
 */
export const GET = withPermission('read', 'statistics', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const { from, to } = parseSearchParams(searchParams, dateRangeSchema);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  // Build date filter (mirrors Prisma's `dateFilter` used for... note: original
  // code computed `dateFilter` but never actually applied it to any query below,
  // so it is preserved here for parity but similarly unused.
  const dateFilter = from && to
    ? { gte: from, lte: to }
    : { gte: startOfMonth };
  void dateFilter;

  const tenantId = context.tenantId;

  const [
    totalMembersRows,
    activeMembersRows,
    newMembersThisMonthRows,
    newMembersLastMonthRows,

    totalLeadsRows,
    newLeadsRows,
    convertedLeadsRows,
    pendingLeadsRows,

    totalPrayerRequestsRows,
    pendingPrayerRequestsRows,
    answeredPrayerRequestsRows,

    offeringsThisMonthRows,
    offeringsLastMonthRows,

    callsThisMonthRows,
    callsLastMonthRows,

    leadsBySourceRows,

    offeringsByTypeRows,
  ] = await Promise.all([
    // Members
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM member WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM member WHERE tenant_id = $1 AND status = $2`,
      [tenantId, MemberStatus.ACTIVE]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM member WHERE tenant_id = $1 AND created_at >= $2`,
      [tenantId, startOfMonth]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM member WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
      [tenantId, startOfLastMonth, endOfLastMonth]
    ),

    // Leads
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM lead WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM lead WHERE tenant_id = $1 AND status = $2`,
      [tenantId, LeadStatus.NEW]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM lead WHERE tenant_id = $1 AND status = $2`,
      [tenantId, LeadStatus.CONVERTED]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM lead WHERE tenant_id = $1 AND status = ANY($2::lead_status[])`,
      [tenantId, [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP]]
    ),

    // Prayer requests
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM prayer_request WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM prayer_request WHERE tenant_id = $1 AND status = $2`,
      [tenantId, PrayerRequestStatus.PENDING]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM prayer_request WHERE tenant_id = $1 AND status = $2`,
      [tenantId, PrayerRequestStatus.ANSWERED]
    ),

    // Offerings
    query<{ sum: string | null; count: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS sum, COUNT(*) AS count FROM offering WHERE tenant_id = $1 AND given_at >= $2`,
      [tenantId, startOfMonth]
    ),
    query<{ sum: string | null; count: string }>(
      `SELECT COALESCE(SUM(amount), 0) AS sum, COUNT(*) AS count FROM offering WHERE tenant_id = $1 AND given_at >= $2 AND given_at <= $3`,
      [tenantId, startOfLastMonth, endOfLastMonth]
    ),

    // Calls
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM call_log WHERE tenant_id = $1 AND called_at >= $2`,
      [tenantId, startOfMonth]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM call_log WHERE tenant_id = $1 AND called_at >= $2 AND called_at <= $3`,
      [tenantId, startOfLastMonth, endOfLastMonth]
    ),

    // Lead sources breakdown
    query<{ source: string; count: string }>(
      `SELECT source, COUNT(*) AS count FROM lead WHERE tenant_id = $1 GROUP BY source`,
      [tenantId]
    ),

    // Offerings by type
    query<{ type: string; sum: string | null; count: string }>(
      `SELECT type, COALESCE(SUM(amount), 0) AS sum, COUNT(*) AS count
       FROM offering WHERE tenant_id = $1 AND given_at >= $2 GROUP BY type`,
      [tenantId, startOfMonth]
    ),
  ]);

  const totalMembers = Number(totalMembersRows[0]?.count ?? 0);
  const activeMembers = Number(activeMembersRows[0]?.count ?? 0);
  const newMembersThisMonth = Number(newMembersThisMonthRows[0]?.count ?? 0);
  const newMembersLastMonth = Number(newMembersLastMonthRows[0]?.count ?? 0);

  const totalLeads = Number(totalLeadsRows[0]?.count ?? 0);
  const newLeads = Number(newLeadsRows[0]?.count ?? 0);
  const convertedLeads = Number(convertedLeadsRows[0]?.count ?? 0);
  const pendingLeads = Number(pendingLeadsRows[0]?.count ?? 0);

  const totalPrayerRequests = Number(totalPrayerRequestsRows[0]?.count ?? 0);
  const pendingPrayerRequests = Number(pendingPrayerRequestsRows[0]?.count ?? 0);
  const answeredPrayerRequests = Number(answeredPrayerRequestsRows[0]?.count ?? 0);

  const offeringsThisMonthSum = offeringsThisMonthRows[0]?.sum ?? '0';
  const offeringsThisMonthCount = Number(offeringsThisMonthRows[0]?.count ?? 0);
  const offeringsLastMonthSum = offeringsLastMonthRows[0]?.sum ?? '0';
  const offeringsLastMonthCount = Number(offeringsLastMonthRows[0]?.count ?? 0);

  const callsThisMonth = Number(callsThisMonthRows[0]?.count ?? 0);
  const callsLastMonth = Number(callsLastMonthRows[0]?.count ?? 0);

  // Calculate trends
  const memberGrowth = newMembersLastMonth > 0
    ? ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100
    : newMembersThisMonth > 0 ? 100 : 0;

  const offeringGrowth = Number(offeringsLastMonthSum) > 0
    ? ((Number(offeringsThisMonthSum) - Number(offeringsLastMonthSum)) / Number(offeringsLastMonthSum)) * 100
    : Number(offeringsThisMonthSum) > 0 ? 100 : 0;

  return successResponse({
    members: {
      total: totalMembers,
      active: activeMembers,
      newThisMonth: newMembersThisMonth,
      growth: Math.round(memberGrowth * 100) / 100,
    },
    leads: {
      total: totalLeads,
      new: newLeads,
      converted: convertedLeads,
      pending: pendingLeads,
      conversionRate: totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0,
      bySource: leadsBySourceRows.map((item) => ({
        source: item.source,
        count: Number(item.count),
      })),
    },
    prayerRequests: {
      total: totalPrayerRequests,
      pending: pendingPrayerRequests,
      answered: answeredPrayerRequests,
    },
    offerings: {
      thisMonth: {
        total: offeringsThisMonthSum?.toString() ?? '0',
        count: offeringsThisMonthCount,
      },
      lastMonth: {
        total: offeringsLastMonthSum?.toString() ?? '0',
        count: offeringsLastMonthCount,
      },
      growth: Math.round(offeringGrowth * 100) / 100,
      byType: offeringsByTypeRows.map((item) => ({
        type: item.type,
        total: item.sum?.toString() ?? '0',
        count: Number(item.count),
      })),
    },
    callCenter: {
      callsThisMonth,
      callsLastMonth,
      growth: callsLastMonth > 0
        ? Math.round(((callsThisMonth - callsLastMonth) / callsLastMonth) * 100)
        : callsThisMonth > 0 ? 100 : 0,
    },
    generatedAt: new Date().toISOString(),
  });
});
