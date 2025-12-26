/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEAD HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * TanStack Query hooks for lead management.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, patch, del } from '../api-client';
import type { PaginationMeta } from '@/lib/types';
import type { CreateLeadInput, UpdateLeadInput } from '@/lib/validations/schemas';

// Query keys
export const leadKeys = {
  all: ['leads'] as const,
  lists: () => [...leadKeys.all, 'list'] as const,
  list: (filters: LeadFilters) => [...leadKeys.lists(), filters] as const,
  details: () => [...leadKeys.all, 'detail'] as const,
  detail: (id: string) => [...leadKeys.details(), id] as const,
};

// Simplified filter type for hooks
interface LeadFilters {
  search?: string;
  status?: string;
  source?: string;
  assignedToId?: string;
  page?: number;
  limit?: number;
}

// Types
interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  alternatePhone?: string;
  address?: string;
  city?: string;
  state?: string;
  source: string;
  sourceDetails?: string;
  status: string;
  notes?: string;
  priority: number;
  lastContactAt?: string;
  nextFollowUp?: string;
  assignedTo?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  convertedToMember?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count?: {
    callLogs: number;
    communications: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface LeadsResponse {
  data: Lead[];
  meta: PaginationMeta;
}

/**
 * List leads with filtering and pagination
 */
export function useLeads(filters: LeadFilters = {}) {
  return useQuery({
    queryKey: leadKeys.list(filters),
    queryFn: async () => {
      const response = await get<Lead[]>('/api/leads', filters as Record<string, string | number | boolean>);
      return {
        data: response.data!,
        meta: response.meta!,
      } as LeadsResponse;
    },
  });
}

/**
 * Get single lead details
 */
export function useLead(id: string) {
  return useQuery({
    queryKey: leadKeys.detail(id),
    queryFn: async () => {
      const response = await get<Lead>(`/api/leads/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

/**
 * Create lead
 */
export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateLeadInput) => {
      const response = await post<Lead>('/api/leads', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Update lead
 */
export function useUpdateLead(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateLeadInput) => {
      const response = await patch<Lead>(`/api/leads/${id}`, data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(leadKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Delete lead
 */
export function useDeleteLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/api/leads/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}

/**
 * Convert lead to member
 */
export function useConvertLead(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (memberData?: Record<string, unknown>) => {
      const response = await post<{ lead: { id: string; status: string }; member: { id: string } }>(
        `/api/leads/${id}/convert`,
        { memberData }
      );
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: leadKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
      queryClient.invalidateQueries({ queryKey: ['members'] });
    },
  });
}

/**
 * Assign lead to user
 */
export function useAssignLead(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (assignedToId: string) => {
      const response = await patch<Lead>(`/api/leads/${id}`, { assignedToId });
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(leadKeys.detail(id), data);
      queryClient.invalidateQueries({ queryKey: leadKeys.lists() });
    },
  });
}
