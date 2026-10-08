/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATION HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 *
 * TanStack Query hooks for the public-registration link and its submissions.
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { get, post, patch, getTenantId } from '../api-client';
import { useAppMutation } from './use-app-mutation';
import type { PaginationMeta } from '@/lib/types';

export const registrationKeys = {
  all: ['registrations'] as const,
  link: (opening = false) => [...registrationKeys.all, 'link', opening, getTenantId()] as const,
  lists: (opening = false) => [...registrationKeys.all, 'list', opening] as const,
  list: (filters: RegistrationFilters, opening = false) => [...registrationKeys.lists(opening), getTenantId(), filters] as const,
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

export function useRegistrationLink(opening = false) {
  return useQuery({
    queryKey: registrationKeys.link(opening),
    queryFn: async () => (await get<RegistrationLink | null>(`${opening ? '/api/church-opening-registrations' : '/api/registrations'}/link`)).data ?? null,
  });
}

/** Creates the link on first use, and rotates it (revoking the old URL/QR) afterwards. */
export function useRotateRegistrationLink(opening = false) {
  return useAppMutation<RegistrationLink, Error, void>({
    mutationFn: async () => (await post<RegistrationLink>(`${opening ? '/api/church-opening-registrations' : '/api/registrations'}/link`, {})).data!,
    invalidateKeys: [registrationKeys.link(opening)],
  });
}

export function useRegistrations(filters: RegistrationFilters = {}, opening = false) {
  return useQuery({
    queryKey: registrationKeys.list(filters, opening),
    queryFn: async (): Promise<RegistrationsResponse> => {
      const response = await get<Registration[]>((opening ? '/api/church-opening-registrations' : '/api/registrations'), {
        search: filters.search,
        page: filters.page,
        limit: filters.limit,
      });
      return { data: response.data ?? [], meta: response.meta! };
    },
  });
}

export function useMarkRegistrationReviewed(opening = false) {
  return useAppMutation<{ id: string; status: string }, Error, string>({
    mutationFn: async (id) => (await patch<{ id: string; status: string }>(`${opening ? '/api/church-opening-registrations' : '/api/registrations'}/${id}`, {})).data!,
    invalidateKeys: [registrationKeys.lists(opening)],
  });
}
