/**
 * ════════════════════════════════════════════════════════════════════════════
 * OFFERINGS HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';
import type { CreateOfferingInput, UpdateOfferingInput } from '@/lib/validations';
import type { PaginationMeta } from '@/lib/types';

// Query keys
export const offeringKeys = {
  all: ['offerings'] as const,
  lists: () => [...offeringKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...offeringKeys.lists(), filters] as const,
  details: () => [...offeringKeys.all, 'detail'] as const,
  detail: (id: string) => [...offeringKeys.details(), id] as const,
};

interface Offering {
  id: string;
  type: string;
  amount: string;
  currency: string;
  description?: string;
  paymentMethod?: string;
  reference?: string;
  giverName?: string;
  giverPhone?: string;
  givenAt: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  service?: {
    id: string;
    name: string;
    serviceDate: string;
  };
  createdAt: string;
}

interface OfferingsResponse {
  offerings: Offering[];
  summary: {
    totalAmount: string;
    averageAmount: string;
    count: number;
  };
  meta: PaginationMeta;
}

export function useOfferings(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: offeringKeys.list(filters),
    queryFn: async () => {
      const response = await get<{ offerings: Offering[]; summary: OfferingsResponse['summary'] }>(
        '/api/offerings', 
        filters as Record<string, string | number | boolean>
      );
      return {
        offerings: response.data!.offerings,
        summary: response.data!.summary,
        meta: response.meta!,
      } as OfferingsResponse;
    },
  });
}

export function useOffering(id: string) {
  return useQuery({
    queryKey: offeringKeys.detail(id),
    queryFn: async () => {
      const response = await get<Offering>(`/api/offerings/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

export function useCreateOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOfferingInput) => {
      const response = await post<Offering>('/api/offerings', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: offeringKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateOffering(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateOfferingInput) => {
      const response = await patch<Offering>(`/api/offerings/${id}`, data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(offeringKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: offeringKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useDeleteOffering() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/api/offerings/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: offeringKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: offeringKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
