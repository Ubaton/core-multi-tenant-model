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
}

/**
 * Fetch all role permissions
 */
export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: async () => {
      const response = await get<PermissionsMatrix>('/api/permissions');
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
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['permissions'] });

      // Snapshot the previous value
      const previousPermissions = queryClient.getQueryData<PermissionsMatrix>(['permissions']);

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
        queryClient.setQueryData(['permissions'], updated);
      }

      return { previousPermissions };
    },
    onError: (_err, _params, context) => {
      // Rollback on error
      if (context?.previousPermissions) {
        queryClient.setQueryData(['permissions'], context.previousPermissions);
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
}
