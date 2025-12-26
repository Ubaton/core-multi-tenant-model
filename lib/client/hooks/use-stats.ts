/**
 * ════════════════════════════════════════════════════════════════════════════
 * STATISTICS HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '../api-client';

// Query keys
export const statsKeys = {
  all: ['stats'] as const,
  dashboard: () => [...statsKeys.all, 'dashboard'] as const,
};

interface DashboardStats {
  members: {
    total: number;
    active: number;
    newThisMonth: number;
    growth: number;
  };
  leads: {
    total: number;
    new: number;
    converted: number;
    pending: number;
    conversionRate: number;
    bySource: Array<{
      source: string;
      count: number;
    }>;
  };
  prayerRequests: {
    total: number;
    pending: number;
    answered: number;
  };
  offerings: {
    thisMonth: {
      total: string;
      count: number;
    };
    lastMonth: {
      total: string;
      count: number;
    };
    growth: number;
    byType: Array<{
      type: string;
      total: string;
      count: number;
    }>;
  };
  callCenter: {
    callsThisMonth: number;
    callsLastMonth: number;
    growth: number;
  };
  generatedAt: string;
}

/**
 * Get dashboard statistics
 */
export function useDashboardStats(dateRange?: { from?: Date; to?: Date }) {
  return useQuery({
    queryKey: [...statsKeys.dashboard(), dateRange],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (dateRange?.from) {
        params.from = dateRange.from.toISOString();
      }
      if (dateRange?.to) {
        params.to = dateRange.to.toISOString();
      }
      const response = await get<DashboardStats>('/api/stats', params);
      return response.data!;
    },
    staleTime: 60 * 1000, // 1 minute
  });
}
