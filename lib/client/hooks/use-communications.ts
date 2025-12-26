/**
 * ════════════════════════════════════════════════════════════════════════════
 * COMMUNICATIONS HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, del } from '../api-client';
import type { PaginationMeta } from '@/lib/types';

// Query keys
export const communicationKeys = {
  all: ['communications'] as const,
  lists: () => [...communicationKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...communicationKeys.lists(), filters] as const,
  details: () => [...communicationKeys.all, 'detail'] as const,
  detail: (id: string) => [...communicationKeys.details(), id] as const,
};

interface Communication {
  id: string;
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  subject?: string;
  message: string;
  memberId?: string;
  member?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  leadId?: string;
  lead?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
    email?: string;
  };
  recipientPhone?: string;
  recipientEmail?: string;
  senderId: string;
  sender: {
    id: string;
    firstName: string;
    lastName: string;
  };
  status: 'PENDING' | 'SENT' | 'DELIVERED' | 'FAILED';
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

interface CommunicationsResponse {
  data: Communication[];
  meta: PaginationMeta;
}

interface CreateCommunicationInput {
  type: 'SMS' | 'EMAIL' | 'WHATSAPP';
  subject?: string;
  message: string;
  memberId?: string;
  leadId?: string;
  recipientPhone?: string;
  recipientEmail?: string;
}

export function useCommunications(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: communicationKeys.list(filters),
    queryFn: async () => {
      const response = await get<Communication[]>('/api/communications', filters as Record<string, string | number | boolean>);
      return {
        data: response.data!,
        meta: response.meta!,
      } as CommunicationsResponse;
    },
  });
}

export function useCommunication(id: string) {
  return useQuery({
    queryKey: communicationKeys.detail(id),
    queryFn: async () => {
      const response = await get<Communication>(`/api/communications/${id}`);
      return response.data!;
    },
    enabled: !!id,
  });
}

export function useCreateCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCommunicationInput) => {
      const response = await post<Communication>('/api/communications', data);
      return response.data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
    },
  });
}

export function useDeleteCommunication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await del(`/api/communications/${id}`);
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: communicationKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: communicationKeys.lists() });
    },
  });
}
