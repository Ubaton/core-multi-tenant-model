/**
 * ════════════════════════════════════════════════════════════════════════════
 * PERMISSIONS HOOKS
 * TanStack Query hooks for role permissions
 * ════════════════════════════════════════════════════════════════════════════
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { get, put } from '../api-client';

export type PermissionType = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export type PermissionsMatrix = Record<string, Record<string, ModulePermissions>>;

interface UpdatePermissionParams {
  role: string;
  module: string;
  permission: PermissionType;
  granted: boolean;
  tenantId?: string; // Optional - if not provided, updates global permission
}

/**
 * Fetch all role permissions (optionally for a specific tenant)
 */
export function usePermissions(tenantId?: string | null) {
  return useQuery({
    queryKey: ['permissions', tenantId ?? 'global'],
    queryFn: async () => {
      const url = tenantId 
        ? `/api/permissions?tenantId=${tenantId}`
        : '/api/permissions';
      const response = await get<PermissionsMatrix>(url);
      return response.data;
    },
  });
}

/**
 * Update a single permission
 */
export function useUpdatePermission() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdatePermissionParams) => {
      const response = await put<ModulePermissions>('/api/permissions', params);
      return response.data;
    },
    onMutate: async (params) => {
      const queryKey = ['permissions', params.tenantId ?? 'global'];
      
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey });

      // Snapshot the previous value
      const previousPermissions = queryClient.getQueryData<PermissionsMatrix>(queryKey);

      // Optimistically update
      if (previousPermissions) {
        const updated = { ...previousPermissions };
        if (updated[params.role] && updated[params.role][params.module]) {
          updated[params.role] = {
            ...updated[params.role],
            [params.module]: {
              ...updated[params.role][params.module],
              [params.permission]: params.granted,
            },
          };
        }
        queryClient.setQueryData(queryKey, updated);
      }

      return { previousPermissions, queryKey };
    },
    onError: (_err, params, context) => {
      // Rollback on error
      if (context?.previousPermissions) {
        queryClient.setQueryData(context.queryKey, context.previousPermissions);
      }
    },
    onSettled: (_data, _error, params) => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['permissions', params.tenantId ?? 'global'] });
      // Also invalidate user permissions to reflect changes
      queryClient.invalidateQueries({ queryKey: ['userPermissions'] });
    },
  });
}
