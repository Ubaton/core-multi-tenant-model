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
    offerings?: number;
  };
  totalOfferings?: string;
  thisMonthOfferings?: {
    total: string;
    count: number;
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

interface CreatedUserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

interface CreateTenantResponse {
  tenant: Tenant;
  adminUser: CreatedUserSummary | null;
  createdUsers: CreatedUserSummary[];
  generatedPasswords: Record<string, string>;
}

export function useCreateTenant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTenantInput) => {
      const response = await post<CreateTenantResponse>('/api/tenants', data);
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

// ════════════════════════════════════════════════════════════════════════════
// TENANT MEMBERS (Super Admin)
// ════════════════════════════════════════════════════════════════════════════

interface TenantMember {
  id: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  gender?: string;
  dateOfBirth?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  occupation?: string;
  employer?: string;
  membershipId?: string;
  status: string;
  joinDate: string;
  baptismDate?: string;
  photo?: string;
  departments?: Array<{
    department: { id: string; name: string };
    role?: string;
  }>;
  _count?: {
    offerings: number;
    prayerRequests: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface TenantMembersFilters {
  search?: string;
  status?: string;
  gender?: string;
  page?: number;
  pageSize?: number;
}

interface TenantMembersResponse {
  data: TenantMember[];
  meta: PaginationMeta;
}

/**
 * Fetch members for a specific tenant (Super Admin only)
 */
export function useTenantMembers(tenantId: string, filters: TenantMembersFilters = {}) {
  return useQuery({
    queryKey: [...tenantKeys.detail(tenantId), 'members', filters],
    queryFn: async () => {
      const response = await get<TenantMember[]>(
        `/api/tenants/${tenantId}/members`,
        filters as Record<string, string | number | boolean>
      );
      return {
        data: response.data!,
        meta: response.meta!,
      } as TenantMembersResponse;
    },
    enabled: !!tenantId,
  });
}

// ════════════════════════════════════════════════════════════════════════════
// TENANT ADMIN USERS (Super Admin)
// ════════════════════════════════════════════════════════════════════════════

interface TenantAdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

interface TenantAdminResponse {
  tenant: { id: string; name: string };
  adminUsers: TenantAdminUser[];
  hasAdmin: boolean;
}

interface CreateTenantAdminInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
}

interface CreateTenantAdminResponse {
  adminUser: TenantAdminUser;
  tenant: { id: string; name: string };
  generatedPassword: string;
}

/**
 * Fetch admin users for a specific tenant (Super Admin only)
 */
export function useTenantAdmins(tenantId: string) {
  return useQuery({
    queryKey: [...tenantKeys.detail(tenantId), 'admins'],
    queryFn: async () => {
      const response = await get<TenantAdminResponse>(`/api/tenants/${tenantId}/admin`);
      return response.data!;
    },
    enabled: !!tenantId,
  });
}

/**
 * Create an admin user for a tenant (Super Admin only)
 */
export function useCreateTenantAdmin(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTenantAdminInput) => {
      const response = await post<CreateTenantAdminResponse>(`/api/tenants/${tenantId}/admin`, data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [...tenantKeys.detail(tenantId), 'admins'] });
      queryClient.invalidateQueries({ queryKey: tenantKeys.detail(tenantId) });
    },
  });
}

// ════════════════════════════════════════════════════════════════════════════
// TENANT PROFILE (For Tenant Users - access their own organization)
// ════════════════════════════════════════════════════════════════════════════

export const tenantProfileKeys = {
  profile: ['tenant', 'profile'] as const,
};

/**
 * Fetch the current user's tenant profile
 * This works for any authenticated tenant user
 */
export function useTenantProfile() {
  return useQuery({
    queryKey: tenantProfileKeys.profile,
    queryFn: async () => {
      const response = await get<Tenant>('/api/tenant/profile');
      return response.data!;
    },
  });
}

/**
 * Update the current user's tenant profile
 * Requires admin role permissions
 */
export function useUpdateTenantProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateTenantInput) => {
      const response = await patch<Tenant>('/api/tenant/profile', data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(tenantProfileKeys.profile, data);
      // Also invalidate tenant detail if it exists
      if (data.id) {
        queryClient.invalidateQueries({ queryKey: tenantKeys.detail(data.id) });
      }
    },
  });
}
