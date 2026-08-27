/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUDIT TRAIL HOOKS (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '../api-client';
import type { PaginationMeta } from '@/lib/types';

// Query keys
export const auditLogKeys = {
  all: ['audit-logs'] as const,
  lists: () => [...auditLogKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) => [...auditLogKeys.lists(), filters] as const,
  filters: () => [...auditLogKeys.all, 'filters'] as const,
};

export interface AuditLogActor {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string | null;
  /** The actor's own account has since been deleted. */
  isDeleted: boolean;
}

export interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  actor: AuditLogActor;
  tenant: { id: string; name: string | null; isDeleted: boolean } | null;
}

export interface AuditLogFilterOptions {
  actions: string[];
  entityTypes: string[];
  actors: Array<{ id: string; email: string; name: string }>;
}

interface AuditLogsResponse {
  data: AuditLogEntry[];
  meta: PaginationMeta;
}

/**
 * List audit log entries, newest first.
 */
export function useAuditLogs(filters: Record<string, unknown> = {}) {
  return useQuery({
    queryKey: auditLogKeys.list(filters),
    queryFn: async () => {
      const response = await get<AuditLogEntry[]>(
        '/api/super-admin/audit-logs',
        filters as Record<string, string | number | boolean>
      );
      return {
        data: response.data!,
        meta: response.meta!,
      } as AuditLogsResponse;
    },
    placeholderData: (previous) => previous,
  });
}

/**
 * Distinct actions, entity types and actors, for populating the filter UI.
 */
export function useAuditLogFilterOptions() {
  return useQuery({
    queryKey: auditLogKeys.filters(),
    queryFn: async () => {
      const response = await get<AuditLogFilterOptions>('/api/super-admin/audit-logs/filters');
      return response.data!;
    },
    staleTime: 5 * 60 * 1000,
  });
}
