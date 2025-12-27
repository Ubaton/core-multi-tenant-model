/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER PERMISSIONS ADMIN HOOKS (Super Admin)
 * TanStack Query hooks for per-user module permission overrides
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put } from '../api-client';

export type PermissionType = 'view' | 'create' | 'edit' | 'delete';

export interface ModulePermissions {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface UserPermissionsAdminResponse {
  userId: string;
  role: string;
  tenantId: string | null;
  permissions: Record<string, ModulePermissions>;
}

interface UpdateUserPermissionParams {
  userId: string;
  module: string;
  permission: PermissionType;
  granted: boolean;
}

export const userPermissionsAdminKeys = {
  all: ['userPermissionsAdmin'] as const,
  byUser: (userId: string) => [...userPermissionsAdminKeys.all, userId] as const,
};

export function useUserPermissionsAdmin(userId?: string | null) {
  return useQuery({
    queryKey: userPermissionsAdminKeys.byUser(userId || 'none'),
    queryFn: async () => {
      const response = await get<UserPermissionsAdminResponse>(
        `/api/permissions/users?userId=${encodeURIComponent(userId!)}`
      );
      return response.data!;
    },
    enabled: !!userId,
  });
}

export function useUpdateUserPermissionAdmin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: UpdateUserPermissionParams) => {
      const response = await put<ModulePermissions>('/api/permissions/users', params);
      return response.data!;
    },
    onSettled: (_data, _error, params) => {
      queryClient.invalidateQueries({ queryKey: userPermissionsAdminKeys.byUser(params.userId) });
    },
  });
}
