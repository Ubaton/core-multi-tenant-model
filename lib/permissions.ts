/**
 * ════════════════════════════════════════════════════════════════════════════
 * PERMISSIONS & ACCESS CONTROL
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Role-based permission system with granular resource-level access control.
 * All permission checks are enforced on the backend - never trust frontend.
 */

import { UserRole } from './generated/prisma';
import type { AuthUser } from './types';

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION DEFINITIONS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Available actions in the system
 */
export type Action = 
  | 'create' 
  | 'read' 
  | 'update' 
  | 'delete' 
  | 'list' 
  | 'export' 
  | 'import'
  | 'manage';

/**
 * Resources that can be accessed/modified
 */
export type Resource =
  // Tenant Management
  | 'tenant'
  | 'tenant_settings'
  
  // User Management
  | 'user'
  | 'invitation'
  
  // Member Management
  | 'member'
  | 'member_family'
  
  // Lead Management
  | 'lead'
  | 'lead_assignment'
  
  // Communications
  | 'communication'
  | 'sms'
  | 'email'
  | 'whatsapp'
  
  // Call Center
  | 'call_log'
  | 'call_queue'
  
  // Prayer Requests
  | 'prayer_request'
  
  // Financial
  | 'offering'
  | 'financial_report'
  
  // Church Operations
  | 'service'
  | 'department'
  
  // Analytics & Reports
  | 'statistics'
  | 'report'
  | 'audit_log';

/**
 * Permission definition combining action and resource
 */
export type Permission = `${Action}:${Resource}`;

// ════════════════════════════════════════════════════════════════════════════
// ROLE PERMISSIONS MATRIX
// ════════════════════════════════════════════════════════════════════════════

/**
 * Permissions granted to each role
 */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    // Full access to everything
    'create:tenant', 'read:tenant', 'update:tenant', 'delete:tenant', 'list:tenant', 'manage:tenant',
    'read:tenant_settings', 'update:tenant_settings', 'manage:tenant_settings',
    'create:user', 'read:user', 'update:user', 'delete:user', 'list:user', 'manage:user',
    'create:invitation', 'read:invitation', 'delete:invitation', 'list:invitation',
    'create:member', 'read:member', 'update:member', 'delete:member', 'list:member', 'export:member', 'import:member',
    'read:member_family', 'update:member_family', 'manage:member_family',
    'create:lead', 'read:lead', 'update:lead', 'delete:lead', 'list:lead', 'export:lead', 'import:lead',
    'read:lead_assignment', 'update:lead_assignment', 'manage:lead_assignment',
    'create:communication', 'read:communication', 'list:communication',
    'create:sms', 'create:email', 'create:whatsapp',
    'create:call_log', 'read:call_log', 'update:call_log', 'list:call_log',
    'read:call_queue', 'update:call_queue', 'manage:call_queue',
    'create:prayer_request', 'read:prayer_request', 'update:prayer_request', 'delete:prayer_request', 'list:prayer_request',
    'create:offering', 'read:offering', 'update:offering', 'delete:offering', 'list:offering', 'export:offering',
    'read:financial_report', 'export:financial_report',
    'create:service', 'read:service', 'update:service', 'delete:service', 'list:service',
    'create:department', 'read:department', 'update:department', 'delete:department', 'list:department', 'manage:department',
    'read:statistics', 'export:statistics',
    'read:report', 'export:report',
    'read:audit_log', 'list:audit_log', 'export:audit_log',
  ],

  CHURCH_ADMIN: [
    // Full access within their tenant
    'read:tenant', 'update:tenant',
    'read:tenant_settings', 'update:tenant_settings',
    'create:user', 'read:user', 'update:user', 'list:user',
    'create:invitation', 'read:invitation', 'delete:invitation', 'list:invitation',
    'create:member', 'read:member', 'update:member', 'delete:member', 'list:member', 'export:member', 'import:member',
    'read:member_family', 'update:member_family', 'manage:member_family',
    'create:lead', 'read:lead', 'update:lead', 'delete:lead', 'list:lead', 'export:lead', 'import:lead',
    'read:lead_assignment', 'update:lead_assignment', 'manage:lead_assignment',
    'create:communication', 'read:communication', 'list:communication',
    'create:sms', 'create:email', 'create:whatsapp',
    'create:call_log', 'read:call_log', 'update:call_log', 'list:call_log',
    'read:call_queue', 'update:call_queue', 'manage:call_queue',
    'create:prayer_request', 'read:prayer_request', 'update:prayer_request', 'delete:prayer_request', 'list:prayer_request',
    'create:offering', 'read:offering', 'update:offering', 'delete:offering', 'list:offering', 'export:offering',
    'read:financial_report', 'export:financial_report',
    'create:service', 'read:service', 'update:service', 'delete:service', 'list:service',
    'create:department', 'read:department', 'update:department', 'delete:department', 'list:department', 'manage:department',
    'read:statistics', 'export:statistics',
    'read:report', 'export:report',
    'read:audit_log', 'list:audit_log',
  ],

  STAFF: [
    // General staff access
    'read:tenant',
    'read:user', 'list:user',
    'create:member', 'read:member', 'update:member', 'list:member',
    'read:member_family',
    'create:lead', 'read:lead', 'update:lead', 'list:lead',
    'read:lead_assignment',
    'create:communication', 'read:communication', 'list:communication',
    'create:sms', 'create:email', 'create:whatsapp',
    'create:prayer_request', 'read:prayer_request', 'update:prayer_request', 'list:prayer_request',
    'create:offering', 'read:offering', 'list:offering',
    'read:service', 'list:service',
    'read:department', 'list:department',
    'read:statistics',
  ],

  CALL_CENTER: [
    // Call center specific access
    'read:tenant',
    'read:user', 'list:user',
    'read:member', 'list:member',
    'create:lead', 'read:lead', 'update:lead', 'list:lead',
    'read:lead_assignment', 'update:lead_assignment',
    'create:communication', 'read:communication', 'list:communication',
    'create:sms',
    'create:call_log', 'read:call_log', 'update:call_log', 'list:call_log',
    'read:call_queue', 'update:call_queue',
    'create:prayer_request', 'read:prayer_request', 'list:prayer_request',
    'read:statistics',
  ],

  SUBSCRIBER: [
    // Limited read access and submission
    'read:tenant',
    'create:prayer_request', 'read:prayer_request',
    'read:service', 'list:service',
  ],

  MEMBER: [
    // Member access
    'read:tenant',
    'create:prayer_request', 'read:prayer_request',
    'read:offering', // Own offerings only
    'read:service', 'list:service',
    'read:department', 'list:department',
  ],
};

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION CHECKING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: AuthUser | null,
  action: Action,
  resource: Resource
): boolean {
  if (!user) {
    return false;
  }

  const permission: Permission = `${action}:${resource}`;
  const rolePermissions = ROLE_PERMISSIONS[user.role];
  
  return rolePermissions.includes(permission);
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(
  user: AuthUser | null,
  permissions: Array<{ action: Action; resource: Resource }>
): boolean {
  if (!user) {
    return false;
  }

  return permissions.some(({ action, resource }) => 
    hasPermission(user, action, resource)
  );
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(
  user: AuthUser | null,
  permissions: Array<{ action: Action; resource: Resource }>
): boolean {
  if (!user) {
    return false;
  }

  return permissions.every(({ action, resource }) => 
    hasPermission(user, action, resource)
  );
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a user can access data belonging to another user
 */
export function canAccessUserData(
  requester: AuthUser | null,
  targetUserId: string
): boolean {
  if (!requester) {
    return false;
  }

  // Super Admin and Church Admin can access all user data in their scope
  if (requester.role === UserRole.SUPER_ADMIN || requester.role === UserRole.CHURCH_ADMIN) {
    return true;
  }

  // Others can only access their own data
  return requester.id === targetUserId;
}

/**
 * Check if a user can modify another user's role
 */
export function canModifyUserRole(
  requester: AuthUser | null,
  targetRole: UserRole
): boolean {
  if (!requester) {
    return false;
  }

  // Only Super Admin can create/modify Super Admins
  if (targetRole === UserRole.SUPER_ADMIN) {
    return requester.role === UserRole.SUPER_ADMIN;
  }

  // Church Admin can create/modify roles within their tenant (except Super Admin)
  if (requester.role === UserRole.CHURCH_ADMIN) {
    // Already checked SUPER_ADMIN above, so this is always true at this point
    return true;
  }

  // Super Admin can modify any role
  return requester.role === UserRole.SUPER_ADMIN;
}

// ════════════════════════════════════════════════════════════════════════════
// PERMISSION GUARDS (for route handlers)
// ════════════════════════════════════════════════════════════════════════════

/**
 * Guard that throws if permission check fails
 */
export function requirePermission(
  user: AuthUser | null,
  action: Action,
  resource: Resource
): void {
  if (!hasPermission(user, action, resource)) {
    throw new PermissionDeniedError(
      `Permission denied: ${action}:${resource}`
    );
  }
}

/**
 * Guard that throws if none of the permissions are met
 */
export function requireAnyPermission(
  user: AuthUser | null,
  permissions: Array<{ action: Action; resource: Resource }>
): void {
  if (!hasAnyPermission(user, permissions)) {
    const permStr = permissions.map(p => `${p.action}:${p.resource}`).join(', ');
    throw new PermissionDeniedError(
      `Permission denied: requires one of [${permStr}]`
    );
  }
}

// ════════════════════════════════════════════════════════════════════════════
// ERRORS
// ════════════════════════════════════════════════════════════════════════════

export class PermissionDeniedError extends Error {
  constructor(message: string = 'Permission denied') {
    super(message);
    this.name = 'PermissionDeniedError';
  }
}
