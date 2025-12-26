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
import { z } from 'zod';

const updatePermissionSchema = z.object({
  role: z.enum(['SUPER_ADMIN', 'CHURCH_ADMIN', 'STAFF', 'CALL_CENTER', 'SUBSCRIBER', 'MEMBER']),
  module: z.string(),
  permission: z.enum(['view', 'create', 'edit', 'delete']),
  granted: z.boolean(),
});

// Default permissions matrix (used as fallback)
const defaultPermissions: Record<string, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
  SUPER_ADMIN: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    members: { view: true, create: true, edit: true, delete: true },
    leads: { view: true, create: true, edit: true, delete: true },
    offerings: { view: true, create: true, edit: true, delete: true },
    prayer_requests: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    calls: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    tenants: { view: true, create: true, edit: true, delete: true },
  },
  CHURCH_ADMIN: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    members: { view: true, create: true, edit: true, delete: true },
    leads: { view: true, create: true, edit: true, delete: true },
    offerings: { view: true, create: true, edit: true, delete: true },
    prayer_requests: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    calls: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: false },
    users: { view: true, create: true, edit: true, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  STAFF: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: true, create: true, edit: true, delete: false },
    leads: { view: true, create: true, edit: true, delete: false },
    offerings: { view: true, create: true, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: true, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    calls: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  CALL_CENTER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: true, create: false, edit: false, delete: false },
    leads: { view: true, create: true, edit: true, delete: false },
    offerings: { view: false, create: false, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: true, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    calls: { view: true, create: true, edit: true, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  SUBSCRIBER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: true, create: false, edit: false, delete: false },
    leads: { view: false, create: false, edit: false, delete: false },
    offerings: { view: true, create: false, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: false, delete: false },
    communications: { view: true, create: false, edit: false, delete: false },
    calls: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  MEMBER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: false, create: false, edit: false, delete: false },
    leads: { view: false, create: false, edit: false, delete: false },
    offerings: { view: true, create: true, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: false, delete: false },
    communications: { view: true, create: false, edit: false, delete: false },
    calls: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
};

/**
 * GET /api/permissions
 * Get all role permissions
 */
export const GET = withSuperAdmin(async () => {
  // Try to get permissions from database
  const dbPermissions = await prisma.rolePermission.findMany();

  if (dbPermissions.length === 0) {
    // Return default permissions if none in database
    return successResponse(defaultPermissions);
  }

  // Build permissions matrix from database
  const permissions: Record<string, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = 
    JSON.parse(JSON.stringify(defaultPermissions));

  for (const perm of dbPermissions) {
    if (!permissions[perm.role]) {
      permissions[perm.role] = {};
    }
    if (!permissions[perm.role][perm.module]) {
      permissions[perm.role][perm.module] = { view: false, create: false, edit: false, delete: false };
    }
    permissions[perm.role][perm.module] = {
      view: perm.canView,
      create: perm.canCreate,
      edit: perm.canEdit,
      delete: perm.canDelete,
    };
  }

  return successResponse(permissions);
});

/**
 * PUT /api/permissions
 * Update a single permission
 */
export const PUT = withSuperAdmin(async (request: NextRequest, { user }) => {
  const body = await parseBody(request, updatePermissionSchema);
  const { role, module, permission, granted } = body;

  // Get or create the permission record
  const existing = await prisma.rolePermission.findUnique({
    where: {
      role_module: {
        role,
        module,
      },
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
    // Update existing permission
    updatedPermission = await prisma.rolePermission.update({
      where: {
        role_module: {
          role,
          module,
        },
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
    `${role}:${module}`,
    { [permission]: !granted },
    { [permission]: granted }
  );

  return successResponse({
    role,
    module,
    view: updatedPermission.canView,
    create: updatedPermission.canCreate,
    edit: updatedPermission.canEdit,
    delete: updatedPermission.canDelete,
  });
});
