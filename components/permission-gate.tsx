/**
 * ════════════════════════════════════════════════════════════════════════════
 * PERMISSION GATE COMPONENT
 * Wrapper component for conditionally rendering content based on permissions
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { ReactNode } from 'react';
import { Lock, AlertTriangle } from 'lucide-react';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { cn } from '@/lib/utils';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'any';

interface PermissionGateProps {
  /**
   * The module to check permissions for
   */
  module: string;
  /**
   * The action to check permission for. 'any' checks if user has at least one permission
   */
  action?: PermissionAction;
  /**
   * Content to render if user has permission
   */
  children: ReactNode;
  /**
   * Content to render if user doesn't have permission. If not provided, nothing is rendered.
   */
  fallback?: ReactNode;
  /**
   * Show a locked/disabled version instead of hiding completely
   */
  showLocked?: boolean;
  /**
   * Custom message to show when locked
   */
  lockedMessage?: string;
}

/**
 * Permission gate component - conditionally renders content based on user permissions
 * 
 * @example
 * // Only show if user can view members
 * <PermissionGate module="members" action="view">
 *   <MembersList />
 * </PermissionGate>
 * 
 * @example
 * // Show create button only if user can create
 * <PermissionGate module="members" action="create">
 *   <Button>Add Member</Button>
 * </PermissionGate>
 * 
 * @example
 * // Show locked state instead of hiding
 * <PermissionGate module="settings" action="edit" showLocked>
 *   <SettingsForm />
 * </PermissionGate>
 */
export function PermissionGate({
  module,
  action = 'view',
  children,
  fallback = null,
  showLocked = false,
  lockedMessage,
}: PermissionGateProps) {
  const { canView, canCreate, canEdit, canDelete, hasAnyPermission, isLoading } = useModulePermissions();

  // During loading, optionally show nothing or a skeleton
  if (isLoading) {
    return null;
  }

  // Check the appropriate permission based on action
  let hasPermission = false;
  switch (action) {
    case 'view':
      hasPermission = canView(module);
      break;
    case 'create':
      hasPermission = canCreate(module);
      break;
    case 'edit':
      hasPermission = canEdit(module);
      break;
    case 'delete':
      hasPermission = canDelete(module);
      break;
    case 'any':
      hasPermission = hasAnyPermission(module);
      break;
  }

  if (hasPermission) {
    return <>{children}</>;
  }

  if (showLocked) {
    return (
      <LockedContent message={lockedMessage || `You don't have permission to ${action} this content`} />
    );
  }

  return <>{fallback}</>;
}

/**
 * Component to show a locked/disabled state
 */
function LockedContent({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
      <Lock className="h-12 w-12 text-gray-400 dark:text-gray-600 mb-4" />
      <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm">
        {message}
      </p>
    </div>
  );
}

/**
 * Require view permission for a module - hides content if no view access
 */
export function RequireView({ module, children, fallback }: { module: string; children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} action="view" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Require create permission - useful for "Add" buttons
 */
export function RequireCreate({ module, children, fallback }: { module: string; children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} action="create" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Require edit permission - useful for "Edit" buttons and forms
 */
export function RequireEdit({ module, children, fallback }: { module: string; children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} action="edit" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Require delete permission - useful for "Delete" buttons
 */
export function RequireDelete({ module, children, fallback }: { module: string; children: ReactNode; fallback?: ReactNode }) {
  return (
    <PermissionGate module={module} action="delete" fallback={fallback}>
      {children}
    </PermissionGate>
  );
}

/**
 * Access denied page component - shown when user navigates to a page they don't have access to
 */
export function AccessDenied({ 
  title = 'Access Denied',
  message = "You don't have permission to access this page.",
}: { 
  title?: string;
  message?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-100 p-8">
      <div className="flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-6">
        <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h1>
      <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">{message}</p>
    </div>
  );
}
