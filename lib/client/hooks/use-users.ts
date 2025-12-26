/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER HOOKS (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';
import type { PaginationMeta } from '@/lib/types';

// Query keys
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
};

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'SUPER_ADMIN' | 'CHURCH_ADMIN' | 'STAFF' | 'CALL_CENTER' | 'SUBSCRIBER' | 'MEMBER';
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: string;
  tenantId?: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
  _count?: {
    callLogs: number;
    assignedLeads: number;
    sentCommunications: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: User[];
  meta: PaginationMeta;
}

interface CreateUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'SUPER_ADMIN' | 'CHURCH_ADMIN' | 'STAFF' | 'CALL_CENTER' | 'SUBSCRIBER' | 'MEMBER';
  tenantId?: string;
  isActive?: boolean;
}

interface UpdateUserInput {
  email?: string;
  password?: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  role?: 'SUPER_ADMIN' | 'CHURCH_ADMIN' | 'STAFF' | 'CALL_CENTER' | 'SUBSCRIBER' | 'MEMBER';
  tenantId?: string | null;
  isActive?: boolean;
}

export function useUsers(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: userKeys.list(filters),
    queryFn: async () => {
      const response = await get<User[]>('/api/users', filters as Record<string, string | number | boolean>);
      return {
        data: response.data!,
        meta: response.meta!,
      } as UsersResponse;
    },
  });
}

export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: async () => {
      const response = await get<User>(`/api/users/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserInput) => {
      const response = await post<User>('/api/users', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateUserInput }) => {
      const response = await patch<User>(`/api/users/${id}`, data);
      return response.data!;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
      queryClient.invalidateQueries({ queryKey: userKeys.detail(id) });
    },
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/api/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.lists() });
    },
  });
}
