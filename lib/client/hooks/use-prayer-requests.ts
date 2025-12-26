/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRAYER REQUEST HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';
import type { CreatePrayerRequestInput, UpdatePrayerRequestInput } from '@/lib/validations';
import type { PaginationMeta } from '@/lib/types';

// Query keys
export const prayerRequestKeys = {
  all: ['prayerRequests'] as const,
  lists: () => [...prayerRequestKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...prayerRequestKeys.lists(), filters] as const,
  details: () => [...prayerRequestKeys.all, 'detail'] as const,
  detail: (id: string) => [...prayerRequestKeys.details(), id] as const,
};

interface PrayerRequest {
  id: string;
  title: string;
  description: string;
  requestorName?: string;
  requestorEmail?: string;
  requestorPhone?: string;
  isAnonymous: boolean;
  isUrgent: boolean;
  status: string;
  prayerResponse?: string;
  answeredAt?: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface PrayerRequestsResponse {
  data: PrayerRequest[];
  meta: PaginationMeta;
}

export function usePrayerRequests(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: prayerRequestKeys.list(filters),
    queryFn: async () => {
      const response = await get<PrayerRequest[]>('/api/prayer-requests', filters as Record<string, string | number | boolean>);
      return {
        data: response.data!,
        meta: response.meta!,
      } as PrayerRequestsResponse;
    },
  });
}

export function usePrayerRequest(id: string) {
  return useQuery({
    queryKey: prayerRequestKeys.detail(id),
    queryFn: async () => {
      const response = await get<PrayerRequest>(`/api/prayer-requests/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

export function useCreatePrayerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePrayerRequestInput) => {
      const response = await post<PrayerRequest>('/api/prayer-requests', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: prayerRequestKeys.lists() });
    },
  });
}

export function useUpdatePrayerRequest(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdatePrayerRequestInput) => {
      const response = await patch<PrayerRequest>(`/api/prayer-requests/${id}`, data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(prayerRequestKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: prayerRequestKeys.lists() });
    },
  });
}

export function useDeletePrayerRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/api/prayer-requests/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: prayerRequestKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: prayerRequestKeys.lists() });
    },
  });
}
