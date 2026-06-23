/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER PERMISSIONS API
 * GET /api/permissions/me - Get permissions for current user's role
 * ════════════════════════════════════════════════════════════════════════════
 */

import { prisma } from '@/lib/db';
import { 
  withAuth, 
  successResponse, 
} from '@/lib/api';
import { UserRole } from '@/lib/generated/prisma';
import { DEFAULT_MODULE_PERMISSIONS } from '@/lib/permissions-matrix';

const defaultPermissions = DEFAULT_MODULE_PERMISSIONS;

/**
 * GET /api/permissions/me
 * Get permissions for the current user's role
 */
export const GET = withAuth(async (request, { user }) => {
  const userRole = user.role as UserRole;
  const userTenantId = user.tenantId;

  // Start with default permissions for this role
  const rolePermissions = JSON.parse(JSON.stringify(defaultPermissions[userRole] || {}));

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
    const globalPermissions = await prisma.rolePermission.findMany({
      where: {
        role: userRole,
        tenantId: null,
      },
      cacheStrategy: { ttl: 300, swr: 60 },
    });

    for (const perm of globalPermissions) {
      rolePermissions[perm.module] = {
        view: perm.canView,
        create: perm.canCreate,
        edit: perm.canEdit,
        delete: perm.canDelete,
      };
    }

    // Step 3: Apply tenant-specific overrides (these take precedence)
    if (userTenantId) {
      const tenantPermissions = await prisma.rolePermission.findMany({
        where: {
          role: userRole,
          tenantId: userTenantId,
        },
        cacheStrategy: { ttl: 60, swr: 10 },
      });

      // Tenant-specific permissions override global ones for specific modules
      for (const perm of tenantPermissions) {
        rolePermissions[perm.module] = {
          view: perm.canView,
          create: perm.canCreate,
          edit: perm.canEdit,
          delete: perm.canDelete,
        };
      }
    }
  }

  // Step 4: Apply user-specific overrides (these take final precedence)
  const userOverrides = await prisma.userPermission.findMany({
    where: {
      userId: user.id,
    },
  });

  for (const perm of userOverrides) {
    rolePermissions[perm.module] = {
      view: perm.canView,
      create: perm.canCreate,
      edit: perm.canEdit,
      delete: perm.canDelete,
    };
  }

  return successResponse({
    role: userRole,
    permissions: rolePermissions,
  });
});
