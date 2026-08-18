/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER PERMISSIONS (ADMIN)
 * GET /api/permissions/users?userId=...  - Get effective permissions for a specific user
 * PUT /api/permissions/users             - Update a single permission for a specific user (one-by-one)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { DEFAULT_MODULE_PERMISSIONS } from '@/lib/permissions-matrix';
import { UserRole } from '@/lib/types/db';
import { randomUUID } from 'crypto';

const updateUserPermissionSchema = z.object({
  userId: z.string().min(1),
  module: z.string().min(1),
  permission: z.enum(['view', 'create', 'edit', 'delete']),
  granted: z.boolean(),
});

interface RolePermissionRow {
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface UserPermissionRow {
  id: string;
  user_id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

function cloneRoleDefaults(role: UserRole) {
  return JSON.parse(JSON.stringify(DEFAULT_MODULE_PERMISSIONS[role] || {})) as Record<
    string,
    { view: boolean; create: boolean; edit: boolean; delete: boolean }
  >;
}

async function computeEffectivePermissionsForUser(targetUserId: string) {
  const targetUserRows = await query<{ id: string; role: UserRole; tenant_id: string | null }>(
    `SELECT id, role, tenant_id FROM "user" WHERE id = $1`,
    [targetUserId]
  );
  const targetUser = targetUserRows[0];

  if (!targetUser) {
    return { targetUser: null, permissions: null } as const;
  }

  const role = targetUser.role;

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
    const globalRoleOverrides = await query<RolePermissionRow>(
      `SELECT module, can_view, can_create, can_edit, can_delete
       FROM role_permission WHERE role = $1 AND tenant_id IS NULL`,
      [role]
    );

    for (const perm of globalRoleOverrides) {
      permissions[perm.module] = {
        view: perm.can_view,
        create: perm.can_create,
        edit: perm.can_edit,
        delete: perm.can_delete,
      };
    }

    // 2) Tenant role overrides
    if (targetUser.tenant_id) {
      const tenantRoleOverrides = await query<RolePermissionRow>(
        `SELECT module, can_view, can_create, can_edit, can_delete
         FROM role_permission WHERE role = $1 AND tenant_id = $2`,
        [role, targetUser.tenant_id]
      );

      for (const perm of tenantRoleOverrides) {
        permissions[perm.module] = {
          view: perm.can_view,
          create: perm.can_create,
          edit: perm.can_edit,
          delete: perm.can_delete,
        };
      }
    }
  }

  // 3) User-specific overrides (final)
  const userOverrides = await query<RolePermissionRow>(
    `SELECT module, can_view, can_create, can_edit, can_delete
     FROM user_permission WHERE user_id = $1`,
    [targetUser.id]
  );

  for (const perm of userOverrides) {
    permissions[perm.module] = {
      view: perm.can_view,
      create: perm.can_create,
      edit: perm.can_edit,
      delete: perm.can_delete,
    };
  }

  return { targetUser, permissions } as const;
}

export const GET = withSuperAdmin(async (request: NextRequest) => {
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
    tenantId: result.targetUser.tenant_id,
    permissions: result.permissions,
  });
});

export const PUT = withSuperAdmin(async (request: NextRequest, { user }) => {
  const body = await parseBody(request, updateUserPermissionSchema);
  const { userId, module, permission, granted } = body;

  const targetUserRows = await query<{ id: string; role: UserRole; tenant_id: string | null }>(
    `SELECT id, role, tenant_id FROM "user" WHERE id = $1`,
    [userId]
  );
  const targetUser = targetUserRows[0];

  if (!targetUser) {
    return errorResponse('NOT_FOUND', 'User not found', 404);
  }

  // Only allow user-specific overrides for non-super-admin users.
  if (targetUser.role === UserRole.SUPER_ADMIN) {
    return errorResponse('BAD_REQUEST', 'Cannot override permissions for SUPER_ADMIN', 400);
  }

  const permissionColumn =
    ({ view: 'can_view', create: 'can_create', edit: 'can_edit', delete: 'can_delete' } as const)[permission];

  const USER_PERMISSION_SELECT = `
    SELECT
      id,
      user_id,
      module,
      can_view,
      can_create,
      can_edit,
      can_delete
    FROM user_permission
  `;

  const existingRows = await query<UserPermissionRow>(
    `${USER_PERMISSION_SELECT} WHERE user_id = $1 AND module = $2 LIMIT 1`,
    [userId, module]
  );
  const existing = existingRows[0];

  let updated: UserPermissionRow;

  if (existing) {
    const updatedRows = await query<UserPermissionRow>(
      `UPDATE user_permission SET ${permissionColumn} = $1, updated_at = NOW() WHERE id = $2
       RETURNING id, user_id, module, can_view, can_create, can_edit, can_delete`,
      [granted, existing.id]
    );
    updated = updatedRows[0];
  } else {
    // Create a new override record seeded from current effective permissions,
    // but with the single toggled value changed.
    const effective = await computeEffectivePermissionsForUser(userId);

    if (!effective.permissions) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    const seed = effective.permissions[module] || { view: false, create: false, edit: false, delete: false };

    const canView = permission === 'view' ? granted : seed.view;
    const canCreate = permission === 'create' ? granted : seed.create;
    const canEdit = permission === 'edit' ? granted : seed.edit;
    const canDelete = permission === 'delete' ? granted : seed.delete;

    const insertedRows = await query<UserPermissionRow>(
      `INSERT INTO user_permission (id, user_id, module, can_view, can_create, can_edit, can_delete)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, user_id, module, can_view, can_create, can_edit, can_delete`,
      [randomUUID(), userId, module, canView, canCreate, canEdit, canDelete]
    );
    updated = insertedRows[0];
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
    view: updated.can_view,
    create: updated.can_create,
    edit: updated.can_edit,
    delete: updated.can_delete,
  });
});
