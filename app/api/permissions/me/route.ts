/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER PERMISSIONS API
 * GET /api/permissions/me - Get permissions for current user's role
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import {
  withAuth,
  successResponse,
} from '@/lib/api';
import { UserRole } from '@/lib/types/db';
import { DEFAULT_MODULE_PERMISSIONS } from '@/lib/permissions-matrix';

const defaultPermissions = DEFAULT_MODULE_PERMISSIONS;

interface RolePermissionRow {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface UserPermissionRow {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

/**
 * GET /api/permissions/me
 * Get permissions for the current user's role
 */
export const GET = withAuth(async (request, { user }) => {
  const userRole = user.role as UserRole;
  const userTenantId = user.tenantId;

  // Start with default permissions for this role
  const rolePermissions: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> =
    JSON.parse(JSON.stringify(defaultPermissions[userRole] || {}));

  // SUPER_ADMIN always gets full default permissions (no tenant-specific overrides)
  if (userRole === 'SUPER_ADMIN') {
    return successResponse({
      role: userRole,
      permissions: rolePermissions,
    });
  }

  // For tenant users, we apply permissions in layers:
  // 1. Start with hardcoded defaults (done above)
  // 2. Apply global overrides (tenantId = null)
  // 3. Apply tenant-specific overrides (if user has a tenant)
  // 4. Apply user-specific overrides (always last)

  // Objective: Church Admin permissions should be user-specific (not shared across all Church Admins)
  // So for CHURCH_ADMIN we skip RolePermission overrides entirely.
  const applyRoleOverrides = userRole !== 'CHURCH_ADMIN';

  if (applyRoleOverrides) {
    // Step 2: Apply global permission overrides
    const globalPermissions = await query<RolePermissionRow>(
      `SELECT module, can_view, can_create, can_edit, can_delete
       FROM role_permission WHERE role = $1 AND tenant_id IS NULL`,
      [userRole]
    );

    for (const perm of globalPermissions) {
      rolePermissions[perm.module] = {
        view: perm.can_view,
        create: perm.can_create,
        edit: perm.can_edit,
        delete: perm.can_delete,
      };
    }

    // Step 3: Apply tenant-specific overrides (these take precedence)
    if (userTenantId) {
      const tenantPermissions = await query<RolePermissionRow>(
        `SELECT module, can_view, can_create, can_edit, can_delete
         FROM role_permission WHERE role = $1 AND tenant_id = $2`,
        [userRole, userTenantId]
      );

      // Tenant-specific permissions override global ones for specific modules
      for (const perm of tenantPermissions) {
        rolePermissions[perm.module] = {
          view: perm.can_view,
          create: perm.can_create,
          edit: perm.can_edit,
          delete: perm.can_delete,
        };
      }
    }
  }

  // Step 4: Apply user-specific overrides (these take final precedence)
  const userOverrides = await query<UserPermissionRow>(
    `SELECT module, can_view, can_create, can_edit, can_delete
     FROM user_permission WHERE user_id = $1`,
    [user.id]
  );

  for (const perm of userOverrides) {
    rolePermissions[perm.module] = {
      view: perm.can_view,
      create: perm.can_create,
      edit: perm.can_edit,
      delete: perm.can_delete,
    };
  }

  return successResponse({
    role: userRole,
    permissions: rolePermissions,
  });
});
