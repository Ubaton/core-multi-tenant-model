/**
 * ════════════════════════════════════════════════════════════════════════════
 * PERMISSIONS API
 * GET  /api/permissions - Get all role permissions
 * PUT  /api/permissions - Update role permissions
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withSuperAdmin, 
  successResponse, 
  parseBody,
  logAudit,
} from '@/lib/api';
import { DEFAULT_MODULE_PERMISSIONS } from '@/lib/permissions-matrix';
import { z } from 'zod';

const updatePermissionSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'CHURCH_ADMIN', 'STAFF', 'CALL_CENTER', 'SUBSCRIBER', 'MEMBER']),
  module: z.string(),
  permission: z.enum(['view', 'create', 'edit', 'delete']),
  granted: z.boolean(),
  tenantId: z.string().optional(), // Optional - if not provided, updates global permission
});

const defaultPermissions = DEFAULT_MODULE_PERMISSIONS;

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

  // If requesting for a specific tenant, layer permissions:
  // 1. Start with defaults (done above)
  // 2. Apply global overrides
  // 3. Apply tenant-specific overrides
  
  if (tenantId) {
    // First, apply global overrides
    const globalPermissions = await prisma.rolePermission.findMany({
      where: { tenantId: null },
    });

    for (const perm of globalPermissions) {
      if (!permissions[perm.role]) {
        permissions[perm.role] = {};
      }
      permissions[perm.role][perm.module] = {
        view: perm.canView,
        create: perm.canCreate,
        edit: perm.canEdit,
        delete: perm.canDelete,
      };
    }

    // Then, apply tenant-specific overrides
    const tenantPermissions = await prisma.rolePermission.findMany({
      where: { tenantId },
    });

    for (const perm of tenantPermissions) {
      if (!permissions[perm.role]) {
        permissions[perm.role] = {};
      }
      permissions[perm.role][perm.module] = {
        view: perm.canView,
        create: perm.canCreate,
        edit: perm.canEdit,
        delete: perm.canDelete,
      };
    }
  } else {
    // For global permissions view, just apply global overrides
    const globalPermissions = await prisma.rolePermission.findMany({
      where: { tenantId: null },
    });

    for (const perm of globalPermissions) {
      if (!permissions[perm.role]) {
        permissions[perm.role] = {};
      }
      permissions[perm.role][perm.module] = {
        view: perm.canView,
        create: perm.canCreate,
        edit: perm.canEdit,
        delete: perm.canDelete,
      };
    }
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
  // Use findFirst since compound unique with nullable field doesn't work well with findUnique
  const existing = await prisma.rolePermission.findFirst({
    where: {
      role,
      module,
      tenantId: tenantId ?? null,
    },
  });

  const permissionField = {
    view: 'canView',
    create: 'canCreate',
    edit: 'canEdit',
    delete: 'canDelete',
  }[permission] as 'canView' | 'canCreate' | 'canEdit' | 'canDelete';

  let updatedPermission;

  if (existing) {
    // Update existing permission by ID
    updatedPermission = await prisma.rolePermission.update({
      where: {
        id: existing.id,
      },
      data: {
        [permissionField]: granted,
      },
    });
  } else {
    // Create new permission record with defaults from matrix
    const defaults = defaultPermissions[role]?.[module] || { view: false, create: false, edit: false, delete: false };
    updatedPermission = await prisma.rolePermission.create({
      data: {
        tenantId: tenantId ?? null,
        role,
        module,
        canView: permission === 'view' ? granted : defaults.view,
        canCreate: permission === 'create' ? granted : defaults.create,
        canEdit: permission === 'edit' ? granted : defaults.edit,
        canDelete: permission === 'delete' ? granted : defaults.delete,
      },
    });
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
    view: updatedPermission.canView,
    create: updatedPermission.canCreate,
    edit: updatedPermission.canEdit,
    delete: updatedPermission.canDelete,
  });
});
