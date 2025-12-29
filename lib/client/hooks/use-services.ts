/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICES HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';
import type { CreateServiceInput } from '@/lib/validations';

type UpdateServiceInput = Partial<CreateServiceInput>;
import type { PaginationMeta } from '@/lib/types';

// Query keys
export const serviceKeys = {
  all: ['services'] as const,
  lists: () => [...serviceKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...serviceKeys.lists(), filters] as const,
  details: () => [...serviceKeys.all, 'detail'] as const,
  detail: (id: string) => [...serviceKeys.details(), id] as const,
};

interface Service {
  id: string;
  name: string;
  description?: string;
  serviceDate: string;
  startTime?: string;
  endTime?: string;
  attendanceCount?: number;
  _count?: {
    offerings: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ServiceWithOfferings extends Service {
  offerings?: Array<{
    id: string;
    amount: string;
    type: string;
    giverName?: string;
    member?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  }>;
}

interface ServiceSummary {
  total: number;
  upcomingCount: number;
  pastCount: number;
  totalAttendance: number;
  averageAttendance: number;
}

interface ServicesResponse {
  services: Service[];
  summary: ServiceSummary;
  meta: PaginationMeta;
}

interface ServiceFilters {
  search?: string;
  from?: string;
  to?: string;
  upcoming?: boolean;
  page?: number;
  limit?: number;
}

export function useServices(filters: ServiceFilters = {}) {
  return useQuery({
    queryKey: serviceKeys.list(filters as Record<string, unknown>),
    queryFn: async () => {
      const response = await get<{ services: Service[]; summary: ServiceSummary }>(
        '/api/services',
        filters as Record<string, string | number | boolean>
      );
      return {
        services: response.data!.services,
        summary: response.data!.summary,
        meta: response.meta!,
      } as ServicesResponse;
    },
  });
}

export function useService(id: string) {
  return useQuery({
    queryKey: serviceKeys.detail(id),
    queryFn: async () => {
      const response = await get<ServiceWithOfferings>(`/api/services/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

export function useCreateService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateServiceInput) => {
      const response = await post<Service>('/api/services', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateService(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateServiceInput) => {
      const response = await patch<Service>(`/api/services/${id}`, data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(serviceKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
    },
  });
}

export function useDeleteService() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/api/services/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: serviceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}
