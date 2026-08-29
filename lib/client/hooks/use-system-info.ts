/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM INFORMATION HOOKS (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '../api-client';

// Query keys
export const systemInfoKeys = {
  all: ['system-info'] as const,
  detail: () => [...systemInfoKeys.all, 'detail'] as const,
};

export interface SystemInfo {
  appVersion: string;
  nodeVersion: string;
  nextVersion: string;
  database: string;
  environment: string;
  uptimeSeconds: number;
}

/**
 * Hook to fetch runtime system information
 */
export function useSystemInfo() {
  return useQuery({
    queryKey: systemInfoKeys.detail(),
    queryFn: async () => {
      const response = await get<SystemInfo>('/api/system');
      return response.data!;
    },
    staleTime: 5 * 60 * 1000,
  });
}
