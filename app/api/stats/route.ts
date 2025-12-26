/**
 * ════════════════════════════════════════════════════════════════════════════
 * STATISTICS API - DASHBOARD STATS
 * GET /api/stats - Get dashboard statistics (tenant-scoped)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { MemberStatus, LeadStatus, PrayerRequestStatus } from '@/lib/generated/prisma';
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

  // Build date filter
  const dateFilter = from && to 
    ? { gte: from, lte: to }
    : { gte: startOfMonth };

  const [
    // Member stats
    totalMembers,
    activeMembers,
    newMembersThisMonth,
    newMembersLastMonth,

    // Lead stats
    totalLeads,
    newLeads,
    convertedLeads,
    pendingLeads,

    // Prayer request stats
    totalPrayerRequests,
    pendingPrayerRequests,
    answeredPrayerRequests,

    // Offering stats
    offeringsThisMonth,
    offeringsLastMonth,

    // Call center stats
    callsThisMonth,
    callsLastMonth,

    // Lead sources breakdown
    leadsBySource,

    // Offerings by type
    offeringsByType,
  ] = await Promise.all([
    // Members
    prisma.member.count({ where: { tenantId: context.tenantId } }),
    prisma.member.count({ where: { tenantId: context.tenantId, status: MemberStatus.ACTIVE } }),
    prisma.member.count({ 
      where: { tenantId: context.tenantId, createdAt: { gte: startOfMonth } } 
    }),
    prisma.member.count({ 
      where: { 
        tenantId: context.tenantId, 
        createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } 
      } 
    }),

    // Leads
    prisma.lead.count({ where: { tenantId: context.tenantId } }),
    prisma.lead.count({ 
      where: { tenantId: context.tenantId, status: LeadStatus.NEW } 
    }),
    prisma.lead.count({ 
      where: { tenantId: context.tenantId, status: LeadStatus.CONVERTED } 
    }),
    prisma.lead.count({ 
      where: { 
        tenantId: context.tenantId, 
        status: { in: [LeadStatus.NEW, LeadStatus.CONTACTED, LeadStatus.FOLLOW_UP] } 
      } 
    }),

    // Prayer requests
    prisma.prayerRequest.count({ where: { tenantId: context.tenantId } }),
    prisma.prayerRequest.count({ 
      where: { tenantId: context.tenantId, status: PrayerRequestStatus.PENDING } 
    }),
    prisma.prayerRequest.count({ 
      where: { tenantId: context.tenantId, status: PrayerRequestStatus.ANSWERED } 
    }),

    // Offerings
    prisma.offering.aggregate({
      where: { tenantId: context.tenantId, givenAt: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.offering.aggregate({
      where: { 
        tenantId: context.tenantId, 
        givenAt: { gte: startOfLastMonth, lte: endOfLastMonth } 
      },
      _sum: { amount: true },
      _count: true,
    }),

    // Calls
    prisma.callLog.count({
      where: { tenantId: context.tenantId, calledAt: { gte: startOfMonth } },
    }),
    prisma.callLog.count({
      where: { 
        tenantId: context.tenantId, 
        calledAt: { gte: startOfLastMonth, lte: endOfLastMonth } 
      },
    }),

    // Lead sources breakdown
    prisma.lead.groupBy({
      by: ['source'],
      where: { tenantId: context.tenantId },
      _count: true,
    }),

    // Offerings by type
    prisma.offering.groupBy({
      by: ['type'],
      where: { tenantId: context.tenantId, givenAt: { gte: startOfMonth } },
      _sum: { amount: true },
      _count: true,
    }),
  ]);

  // Calculate trends
  const memberGrowth = newMembersLastMonth > 0 
    ? ((newMembersThisMonth - newMembersLastMonth) / newMembersLastMonth) * 100 
    : newMembersThisMonth > 0 ? 100 : 0;

  const offeringGrowth = offeringsLastMonth._sum.amount && Number(offeringsLastMonth._sum.amount) > 0
    ? ((Number(offeringsThisMonth._sum.amount ?? 0) - Number(offeringsLastMonth._sum.amount)) / Number(offeringsLastMonth._sum.amount)) * 100
    : Number(offeringsThisMonth._sum.amount ?? 0) > 0 ? 100 : 0;

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
      bySource: leadsBySource.map(item => ({
        source: item.source,
        count: item._count,
      })),
    },
    prayerRequests: {
      total: totalPrayerRequests,
      pending: pendingPrayerRequests,
      answered: answeredPrayerRequests,
    },
    offerings: {
      thisMonth: {
        total: offeringsThisMonth._sum.amount?.toString() ?? '0',
        count: offeringsThisMonth._count,
      },
      lastMonth: {
        total: offeringsLastMonth._sum.amount?.toString() ?? '0',
        count: offeringsLastMonth._count,
      },
      growth: Math.round(offeringGrowth * 100) / 100,
      byType: offeringsByType.map(item => ({
        type: item.type,
        total: item._sum.amount?.toString() ?? '0',
        count: item._count,
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
