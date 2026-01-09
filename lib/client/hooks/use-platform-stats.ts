/**
 * ════════════════════════════════════════════════════════════════════════════
 * PLATFORM STATS HOOK (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '../api-client';

// Query keys
export const platformStatsKeys = {
  all: ['platform-stats'] as const,
  stats: () => [...platformStatsKeys.all, 'stats'] as const,
};

export interface PlatformStats {
  tenants: {
    total: number;
    active: number;
    inactive: number;
    hq: number;
  };
  users: {
    total: number;
    active: number;
  };
  members: {
    total: number;
  };
  offerings: {
    total: string;
    count: number;
  };
}

/**
 * Fetch platform-wide statistics for Super Admin dashboard
 */
export function usePlatformStats() {
  return useQuery({
    queryKey: platformStatsKeys.stats(),
    queryFn: async () => {
      const response = await get<PlatformStats>('/api/super-admin/stats');
      return response.data!;
    },
    staleTime: 30 * 1000, // Consider fresh for 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}
