/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBER HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * TanStack Query hooks for member management.
 */

'use client';

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';
import { useAppMutation } from './use-app-mutation';
import type { PaginationMeta } from '@/lib/types';
import type { CreateMemberInput, UpdateMemberInput } from '@/lib/validations/schemas';

// Query keys
export const memberKeys = {
  all: ['members'] as const,
  lists: () => [...memberKeys.all, 'list'] as const,
  list: (filters: MemberFilters) => [...memberKeys.lists(), filters] as const,
  details: () => [...memberKeys.all, 'detail'] as const,
  detail: (id: string) => [...memberKeys.details(), id] as const,
};

// Simplified filter type for hooks
interface MemberFilters {
  search?: string;
  status?: string;
  gender?: string;
  departmentId?: string;
  page?: number;
  limit?: number;
}

// Types
interface Member {
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

interface MembersResponse {
  data: Member[];
  meta: PaginationMeta;
}

/**
 * List members with filtering and pagination
 */
export function useMembers(filters: MemberFilters = {}) {
  return useQuery({
    queryKey: memberKeys.list(filters),
    queryFn: async () => {
      const response = await get<Member[]>('/api/members', filters as Record<string, string | number | boolean>);
      return {
        data: response.data!,
        meta: response.meta!,
      } as MembersResponse;
    },
  });
}

/**
 * Infinite scroll members list
 */
export function useInfiniteMembers(filters: Omit<MemberFilters, 'page'> = {}) {
  return useInfiniteQuery({
    queryKey: [...memberKeys.lists(), 'infinite', filters],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await get<Member[]>('/api/members', {
        ...filters,
        page: pageParam,
      } as Record<string, string | number | boolean>);
      return {
        data: response.data!,
        meta: response.meta!,
      } as MembersResponse;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      return lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined;
    },
  });
}

/**
 * Get single member details
 */
export function useMember(id: string) {
  return useQuery({
    queryKey: memberKeys.detail(id),
    queryFn: async () => {
      const response = await get<Member>(`/api/members/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

/**
 * Create member
 * Invalidates all list queries so the new entry appears everywhere.
 */
export function useCreateMember() {
  return useAppMutation<Member, Error, CreateMemberInput>({
    mutationFn: async (data) => {
      const response = await post<Member>('/api/members', data);
      return response.data!;
    },
    invalidateKeys: [memberKeys.lists()],
  });
}

/**
 * Update member
 * Optimistically patches the detail cache for instant feedback; then
 * invalidates lists so any derived columns (name, status, etc.) refresh.
 */
export function useUpdateMember(id: string) {
  return useAppMutation<Member, Error, UpdateMemberInput>({
    mutationFn: async (data) => {
      const response = await patch<Member>(`/api/members/${id}`, data);
      return response.data!;
    },
    optimisticUpdate: {
      queryKey: memberKeys.detail(id),
      updater: (current: Member, vars) => {
        // vars carries Date objects for the coerced date fields (see
        // updateMemberSchema); Member stores them as ISO strings, so normalize
        // before merging to keep the cache shape consistent.
        const { dateOfBirth, joinDate, baptismDate, weddingDate, ...rest } = vars;
        return {
          ...current,
          ...rest,
          ...(dateOfBirth !== undefined && { dateOfBirth: dateOfBirth.toISOString() }),
          ...(joinDate !== undefined && { joinDate: joinDate.toISOString() }),
          ...(baptismDate !== undefined && { baptismDate: baptismDate.toISOString() }),
          ...(weddingDate !== undefined && { weddingDate: weddingDate.toISOString() }),
        };
      },
    },
    invalidateKeys: [memberKeys.lists()],
  });
}

/**
 * Delete member
 * Optimistically removes the item from the list cache; rolls back on error.
 */
export function useDeleteMember() {
  return useAppMutation<string, Error, string, MembersResponse>({
    mutationFn: async (id) => {
      await del(`/api/members/${id}`);
      return id;
    },
    optimisticUpdate: {
      queryKey: memberKeys.lists(),
      updater: (current: MembersResponse, id) => ({
        ...current,
        data: current.data.filter((m) => m.id !== id),
      }),
    },
    invalidateKeys: [memberKeys.lists()],
  });
}
