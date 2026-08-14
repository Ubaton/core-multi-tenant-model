/**
 * ════════════════════════════════════════════════════════════════════════════
 * PERMISSIONS API
 * GET  /api/permissions - Get all role permissions
 * PUT  /api/permissions - Update role permissions
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { DEFAULT_MODULE_PERMISSIONS } from '@/lib/permissions-matrix';
import { randomUUID } from 'crypto';
import { z } from 'zod';

const updatePermissionSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'CHURCH_ADMIN', 'STAFF', 'CALL_CENTER', 'SUBSCRIBER', 'MEMBER']),
  module: z.string(),
  permission: z.enum(['view', 'create', 'edit', 'delete']),
  granted: z.boolean(),
  tenantId: z.string().optional(), // Optional - if not provided, updates global permission
});

const defaultPermissions = DEFAULT_MODULE_PERMISSIONS;

interface RolePermissionRow {
  id: string;
  tenant_id: string | null;
  role: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * GET /api/permissions
 * Get all role permissions (optionally filtered by tenantId query param)
 * When tenantId is provided, returns tenant-specific overrides merged with defaults
 */
export const GET = withSuperAdmin(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const tenantId = searchParams.get('tenantId');

  // Start with default permissions
  const permissions: Record<string, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> =
    JSON.parse(JSON.stringify(defaultPermissions));

  function applyRows(rows: RolePermissionRow[]) {
    for (const perm of rows) {
      if (!permissions[perm.role]) {
        permissions[perm.role] = {};
      }
      permissions[perm.role][perm.module] = {
        view: perm.can_view,
        create: perm.can_create,
        edit: perm.can_edit,
        delete: perm.can_delete,
      };
    }
  }

  const ROLE_PERMISSION_SELECT = `
    SELECT
      id,
      "tenantId" AS tenant_id,
      role,
      module,
      "canView" AS can_view,
      "canCreate" AS can_create,
      "canEdit" AS can_edit,
      "canDelete" AS can_delete,
      "createdAt" AS created_at,
      "updatedAt" AS updated_at
    FROM "RolePermission"
  `;

  // 1. Apply global overrides
  const globalPermissions = await query<RolePermissionRow>(
    `${ROLE_PERMISSION_SELECT} WHERE "tenantId" IS NULL`
  );
  applyRows(globalPermissions);

  // 2. If requesting for a specific tenant, layer tenant-specific overrides
  if (tenantId) {
    const tenantPermissions = await query<RolePermissionRow>(
      `${ROLE_PERMISSION_SELECT} WHERE "tenantId" = $1`,
      [tenantId]
    );
    applyRows(tenantPermissions);
  }

  return successResponse(permissions);
});

/**
 * PUT /api/permissions
 * Update a single permission (optionally for a specific tenant)
 */
export const PUT = withSuperAdmin(async (request: NextRequest, { user }) => {
  const body = await parseBody(request, updatePermissionSchema);
  const { role, module, permission, granted, tenantId } = body;

  // Get or create the permission record
  const effectiveTenantId = tenantId ?? null;
  const ROLE_PERMISSION_SELECT_FULL = `
    SELECT
      id,
      "tenantId" AS tenant_id,
      role,
      module,
      "canView" AS can_view,
      "canCreate" AS can_create,
      "canEdit" AS can_edit,
      "canDelete" AS can_delete,
      "createdAt" AS created_at,
      "updatedAt" AS updated_at
  `;

  const existingRows = await query<RolePermissionRow>(
    effectiveTenantId === null
      ? `${ROLE_PERMISSION_SELECT_FULL} FROM "RolePermission" WHERE role = $1 AND module = $2 AND "tenantId" IS NULL LIMIT 1`
      : `${ROLE_PERMISSION_SELECT_FULL} FROM "RolePermission" WHERE role = $1 AND module = $2 AND "tenantId" = $3 LIMIT 1`,
    effectiveTenantId === null ? [role, module] : [role, module, effectiveTenantId]
  );
  const existing = existingRows[0];

  const permissionColumn = {
    view: '"canView"',
    create: '"canCreate"',
    edit: '"canEdit"',
    delete: '"canDelete"',
  }[permission];

  let updatedPermission: RolePermissionRow;

  if (existing) {
    // Update existing permission by ID
    const updatedRows = await query<RolePermissionRow>(
      `UPDATE "RolePermission" SET ${permissionColumn} = $1, "updatedAt" = NOW() WHERE id = $2
       RETURNING id, "tenantId" AS tenant_id, role, module, "canView" AS can_view, "canCreate" AS can_create, "canEdit" AS can_edit, "canDelete" AS can_delete, "createdAt" AS created_at, "updatedAt" AS updated_at`,
      [granted, existing.id]
    );
    updatedPermission = updatedRows[0];
  } else {
    // Create new permission record with defaults from matrix
    const defaults = defaultPermissions[role]?.[module] || { view: false, create: false, edit: false, delete: false };
    const canView = permission === 'view' ? granted : defaults.view;
    const canCreate = permission === 'create' ? granted : defaults.create;
    const canEdit = permission === 'edit' ? granted : defaults.edit;
    const canDelete = permission === 'delete' ? granted : defaults.delete;

    const insertedRows = await query<RolePermissionRow>(
      `INSERT INTO "RolePermission" (id, "tenantId", role, module, "canView", "canCreate", "canEdit", "canDelete")
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, "tenantId" AS tenant_id, role, module, "canView" AS can_view, "canCreate" AS can_create, "canEdit" AS can_edit, "canDelete" AS can_delete, "createdAt" AS created_at, "updatedAt" AS updated_at`,
      [randomUUID(), effectiveTenantId, role, module, canView, canCreate, canEdit, canDelete]
    );
    updatedPermission = insertedRows[0];
  }

  await logAudit(
    user.id,
    user.tenantId,
    'UPDATE',
    'RolePermission',
    `${tenantId || 'global'}:${role}:${module}`,
    { [permission]: !granted },
    { [permission]: granted }
  );

  return successResponse({
    tenantId: tenantId ?? null,
    role,
    module,
    view: updatedPermission.can_view,
    create: updatedPermission.can_create,
    edit: updatedPermission.can_edit,
    delete: updatedPermission.can_delete,
  });
});
