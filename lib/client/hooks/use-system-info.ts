/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM INFORMATION HOOKS (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post } from '../api-client';

// Query keys
export const systemInfoKeys = {
  all: ['system-info'] as const,
  detail: () => [...systemInfoKeys.all, 'detail'] as const,
  health: () => [...systemInfoKeys.all, 'health'] as const,
};

export type HealthStatus = 'online' | 'degraded' | 'offline';

export interface HealthCheck {
  status: HealthStatus;
  latencyMs: number;
  database: string | null;
  error: string | null;
  checkedAt: string;
}

export interface HealthReport extends HealthCheck {
  history: HealthCheck[];
  uptimePercent: number;
  lastFailure: HealthCheck | null;
}

export interface SystemInfo {
  appVersion: string;
  nodeVersion: string;
  nextVersion: string;
  database: string;
  health: HealthReport;
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

/**
 * Hook to read the last recorded database health probe
 */
export function useSystemHealth() {
  return useQuery({
    queryKey: systemInfoKeys.health(),
    queryFn: async () => {
      const response = await get<HealthReport>('/api/system/health');
      return response.data!;
    },
    // Keep the availability record current while the page is open.
    refetchInterval: 60 * 1000,
  });
}

/**
 * Hook to run a fresh health check on demand
 */
export function useRunHealthCheck() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await post<HealthReport>('/api/system/health');
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(systemInfoKeys.health(), data);
      queryClient.invalidateQueries({ queryKey: systemInfoKeys.detail() });
    },
  });
}

/**
 * Hook to purge server route caches and refetch every client query
 */
export function useClearCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const response = await post<{ clearedAt: string }>('/api/system/cache');
      return response.data!;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });
}
