/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER PERMISSIONS HOOK
 * Fetches and provides permissions for the current user's role
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { get } from '../api-client';

export interface ModulePermission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
}

export interface UserPermissionsResponse {
  role: string;
  permissions: Record<string, ModulePermission>;
}

// Query keys
export const userPermissionKeys = {
  all: ['userPermissions'] as const,
  me: () => [...userPermissionKeys.all, 'me'] as const,
};

/**
 * Fetch permissions for the current user's role
 */
export function useUserPermissions() {
  return useQuery({
    queryKey: userPermissionKeys.me(),
    queryFn: async () => {
      const response = await get<UserPermissionsResponse>('/api/permissions/me');
      return response.data!;
    },
    staleTime: 30 * 1000, // 30 seconds - shorter to catch permission changes faster
    retry: 1,
  });
}

/**
 * Check if user has view permission for a module
 */
export function useCanView(module: string): boolean {
  const { data } = useUserPermissions();
  return data?.permissions?.[module]?.view ?? false;
}

/**
 * Check if user has create permission for a module
 */
export function useCanCreate(module: string): boolean {
  const { data } = useUserPermissions();
  return data?.permissions?.[module]?.create ?? false;
}

/**
 * Check if user has edit permission for a module
 */
export function useCanEdit(module: string): boolean {
  const { data } = useUserPermissions();
  return data?.permissions?.[module]?.edit ?? false;
}

/**
 * Check if user has delete permission for a module
 */
export function useCanDelete(module: string): boolean {
  const { data } = useUserPermissions();
  return data?.permissions?.[module]?.delete ?? false;
}

/**
 * Check if user has any permission for a module (at least view)
 */
export function useHasAnyPermission(module: string): boolean {
  const { data } = useUserPermissions();
  const perms = data?.permissions?.[module];
  if (!perms) return false;
  return perms.view || perms.create || perms.edit || perms.delete;
}

/**
 * Check if a module is completely locked (all permissions false)
 */
export function useIsModuleLocked(module: string): boolean {
  const { data } = useUserPermissions();
  const perms = data?.permissions?.[module];
  if (!perms) return true; // If no permissions defined, consider it locked
  return !perms.view && !perms.create && !perms.edit && !perms.delete;
}

/**
 * Get all module permissions with metadata
 */
export function useModulePermissions() {
  const { data, isLoading, error } = useUserPermissions();
  
  return {
    permissions: data?.permissions ?? {},
    role: data?.role ?? null,
    isLoading,
    error,
    canView: (module: string) => data?.permissions?.[module]?.view ?? false,
    canCreate: (module: string) => data?.permissions?.[module]?.create ?? false,
    canEdit: (module: string) => data?.permissions?.[module]?.edit ?? false,
    canDelete: (module: string) => data?.permissions?.[module]?.delete ?? false,
    hasAnyPermission: (module: string) => {
      const perms = data?.permissions?.[module];
      if (!perms) return false;
      return perms.view || perms.create || perms.edit || perms.delete;
    },
    isModuleLocked: (module: string) => {
      const perms = data?.permissions?.[module];
      if (!perms) return true;
      return !perms.view && !perms.create && !perms.edit && !perms.delete;
    },
  };
}
