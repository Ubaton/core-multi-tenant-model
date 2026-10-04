/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATION HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 *
 * TanStack Query hooks for the public-registration link and its submissions.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { get, post, patch } from '../api-client';
import { useAppMutation } from './use-app-mutation';
import type { PaginationMeta } from '@/lib/types';

export const registrationKeys = {
  all: ['registrations'] as const,
  link: () => [...registrationKeys.all, 'link'] as const,
  lists: () => [...registrationKeys.all, 'list'] as const,
  list: (filters: RegistrationFilters) => [...registrationKeys.lists(), filters] as const,
};

export interface RegistrationFilters {
  search?: string;
  page?: number;
  limit?: number;
}

export interface RegistrationLink {
  token: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  id: string;
  surname: string;
  names: string;
  cellNumber: string;
  email: string | null;
  idNumber: string | null;
  data: Record<string, string>;
  status: 'PENDING' | 'REVIEWED';
  createdAt: string;
}

interface RegistrationsResponse {
  data: Registration[];
  meta: PaginationMeta;
}

export function useRegistrationLink() {
  return useQuery({
    queryKey: registrationKeys.link(),
    queryFn: async () => (await get<RegistrationLink | null>('/api/registrations/link')).data ?? null,
  });
}

/** Creates the link on first use, and rotates it (revoking the old URL/QR) afterwards. */
export function useRotateRegistrationLink() {
  return useAppMutation<RegistrationLink, Error, void>({
    mutationFn: async () => (await post<RegistrationLink>('/api/registrations/link', {})).data!,
    invalidateKeys: [registrationKeys.link()],
  });
}

export function useRegistrations(filters: RegistrationFilters = {}) {
  return useQuery({
    queryKey: registrationKeys.list(filters),
    queryFn: async (): Promise<RegistrationsResponse> => {
      const response = await get<Registration[]>('/api/registrations', {
        search: filters.search,
        page: filters.page,
        limit: filters.limit,
      });
      return { data: response.data ?? [], meta: response.meta! };
    },
  });
}

export function useMarkRegistrationReviewed() {
  return useAppMutation<{ id: string; status: string }, Error, string>({
    mutationFn: async (id) => (await patch<{ id: string; status: string }>(`/api/registrations/${id}`, {})).data!,
    invalidateKeys: [registrationKeys.lists()],
  });
}
