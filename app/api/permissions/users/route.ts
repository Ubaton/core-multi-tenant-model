/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER PERMISSIONS (ADMIN)
 * GET /api/permissions/users?userId=...  - Get effective permissions for a specific user
 * PUT /api/permissions/users             - Update a single permission for a specific user (one-by-one)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { DEFAULT_MODULE_PERMISSIONS } from '@/lib/permissions-matrix';
import { UserRole } from '@/lib/generated/prisma';

const updateUserPermissionSchema = z.object({
  userId: z.string().min(1),
  module: z.string().min(1),
  permission: z.enum(['view', 'create', 'edit', 'delete']),
  granted: z.boolean(),
});

function cloneRoleDefaults(role: UserRole) {
  return JSON.parse(JSON.stringify(DEFAULT_MODULE_PERMISSIONS[role] || {})) as Record<
    string,
    { view: boolean; create: boolean; edit: boolean; delete: boolean }
  >;
}

async function computeEffectivePermissionsForUser(targetUserId: string) {
  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, role: true, tenantId: true },
  });

  if (!targetUser) {
    return { targetUser: null, permissions: null } as const;
  }

  const role = targetUser.role as UserRole;

  // SUPER_ADMIN gets full defaults; we don't apply overrides here.
  if (role === UserRole.SUPER_ADMIN) {
    return { targetUser, permissions: cloneRoleDefaults(role) } as const;
  }

  const permissions = cloneRoleDefaults(role);

  // Objective: Church Admin permissions should be user-specific (not shared across all Church Admins)
  // So for CHURCH_ADMIN we skip RolePermission overrides entirely.
  const applyRoleOverrides = role !== UserRole.CHURCH_ADMIN;

  if (applyRoleOverrides) {
    // 1) Global role overrides
    const globalRoleOverrides = await prisma.rolePermission.findMany({
      where: { role, tenantId: null },
    });

    for (const perm of globalRoleOverrides) {
      permissions[perm.module] = {
        view: perm.canView,
        create: perm.canCreate,
        edit: perm.canEdit,
        delete: perm.canDelete,
      };
    }

    // 2) Tenant role overrides
    if (targetUser.tenantId) {
      const tenantRoleOverrides = await prisma.rolePermission.findMany({
        where: { role, tenantId: targetUser.tenantId },
      });

      for (const perm of tenantRoleOverrides) {
        permissions[perm.module] = {
          view: perm.canView,
          create: perm.canCreate,
          edit: perm.canEdit,
          delete: perm.canDelete,
        };
      }
    }
  }

  // 3) User-specific overrides (final)
  const userOverrides = await prisma.userPermission.findMany({
    where: { userId: targetUser.id },
  });

  for (const perm of userOverrides) {
    permissions[perm.module] = {
      view: perm.canView,
      create: perm.canCreate,
      edit: perm.canEdit,
      delete: perm.canDelete,
    };
  }

  return { targetUser, permissions } as const;
}

export const GET = withSuperAdmin(async (request: NextRequest, { user }) => {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return errorResponse('BAD_REQUEST', 'userId is required', 400);
  }

  const result = await computeEffectivePermissionsForUser(userId);

  if (!result.targetUser || !result.permissions) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  // Objective: target Church Admins specifically (but keep generic).
  return successResponse({
    userId: result.targetUser.id,
    role: result.targetUser.role,
    tenantId: result.targetUser.tenantId,
    permissions: result.permissions,
  });
});

export const PUT = withSuperAdmin(async (request: NextRequest, { user }) => {
  const body = await parseBody(request, updateUserPermissionSchema);
  const { userId, module, permission, granted } = body;

  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, tenantId: true },
  });

  if (!targetUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  // Only allow user-specific overrides for non-super-admin users.
  if (targetUser.role === UserRole.SUPER_ADMIN) {
    return errorResponse('BAD_REQUEST', 'Cannot override permissions for SUPER_ADMIN', 400);
  }

  const permissionField =
    ({ view: 'canView', create: 'canCreate', edit: 'canEdit', delete: 'canDelete' } as const)[permission];

  const existing = await prisma.userPermission.findFirst({
    where: { userId, module },
  });

  let updated;

  if (existing) {
    updated = await prisma.userPermission.update({
      where: { id: existing.id },
      data: { [permissionField]: granted },
    });
  } else {
    // Create a new override record seeded from current effective permissions,
    // but with the single toggled value changed.
    const effective = await computeEffectivePermissionsForUser(userId);

    if (!effective.permissions) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    const seed = effective.permissions[module] || { view: false, create: false, edit: false, delete: false };

    updated = await prisma.userPermission.create({
      data: {
        userId,
        module,
        canView: permission === 'view' ? granted : seed.view,
        canCreate: permission === 'create' ? granted : seed.create,
        canEdit: permission === 'edit' ? granted : seed.edit,
        canDelete: permission === 'delete' ? granted : seed.delete,
      },
    });
  }

  await logAudit(
    user.id,
    user.tenantId,
    'UPDATE',
    'UserPermission',
    `${userId}:${module}`,
    { [permission]: !granted },
    { [permission]: granted }
  );

  return successResponse({
    userId,
    module,
    view: updated.canView,
    create: updated.canCreate,
    edit: updated.canEdit,
    delete: updated.canDelete,
  });
});
