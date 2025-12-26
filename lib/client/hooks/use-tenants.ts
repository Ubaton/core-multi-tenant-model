/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT HOOKS (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';
import type { CreateTenantInput, UpdateTenantInput } from '@/lib/validations';
import type { PaginationMeta } from '@/lib/types';

// Query keys
export const tenantKeys = {
  all: ['tenants'] as const,
  lists: () => [...tenantKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...tenantKeys.lists(), filters] as const,
  details: () => [...tenantKeys.all, 'detail'] as const,
  detail: (id: string) => [...tenantKeys.details(), id] as const,
};

interface Tenant {
  id: string;
  name: string;
  slug: string;
  description?: string;
  logo?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  timezone: string;
  isActive: boolean;
  isHQ: boolean;
  parent?: {
    id: string;
    name: string;
    slug: string;
  };
  branches?: Array<{
    id: string;
    name: string;
    slug: string;
    isActive: boolean;
  }>;
  _count?: {
    users: number;
    members: number;
    branches: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface TenantsResponse {
  data: Tenant[];
  meta: PaginationMeta;
}

export function useTenants(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: tenantKeys.list(filters),
    queryFn: async () => {
      const response = await get<Tenant[]>('/api/tenants', filters as Record<string, string | number | boolean>);
      return {
        data: response.data!,
        meta: response.meta!,
      } as TenantsResponse;
    },
  });
}

export function useTenant(id: string) {
  return useQuery({
    queryKey: tenantKeys.detail(id),
    queryFn: async () => {
      const response = await get<Tenant>(`/api/tenants/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTenantInput) => {
      const response = await post<Tenant>('/api/tenants', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useUpdateTenant(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTenantInput) => {
      const response = await patch<Tenant>(`/api/tenants/${id}`, data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(tenantKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}

export function useDeleteTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/api/tenants/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: tenantKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: tenantKeys.lists() });
    },
  });
}
