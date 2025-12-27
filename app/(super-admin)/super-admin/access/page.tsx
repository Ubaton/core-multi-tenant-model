/**
 * ════════════════════════════════════════════════════════════════════════════
 * ACCESS CONTROL PAGE (Super Admin)
 * Interactive role-based permissions management with tenant selection
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { 
  Shield, 
  Key,
  Lock,
  Unlock,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Check,
  Loader2,
  RefreshCw,
  Building2,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  usePermissions,
  useUpdatePermission,
  useUserPermissionsAdmin,
  useUpdateUserPermissionAdmin,
  useUsers,
  type PermissionType,
} from '@/lib/client';
import { useTenants } from '@/lib/client/hooks/use-tenants';

// Role permissions matrix
const roles = [
  { id: 'SUPER_ADMIN', name: 'Super Admin', description: 'Full platform access' },
  { id: 'CHURCH_ADMIN', name: 'Church Admin', description: 'Full access within tenant' },
  { id: 'STAFF', name: 'Staff', description: 'Limited tenant access' },
  { id: 'CALL_CENTER', name: 'Call Center', description: 'Call center operations' },
  { id: 'SUBSCRIBER', name: 'Subscriber', description: 'Read-only access' },
  { id: 'MEMBER', name: 'Member', description: 'Basic member access' },
];

const modules = [
  { id: 'dashboard', name: 'Dashboard', description: 'View dashboard and analytics' },
  { id: 'members', name: 'Members', description: 'Manage church members' },
  { id: 'leads', name: 'Leads', description: 'Manage leads and prospects' },
  { id: 'offerings', name: 'Offerings', description: 'Manage offerings and donations' },
  { id: 'prayer_requests', name: 'Prayer Requests', description: 'Manage prayer requests' },
  { id: 'communications', name: 'Communications', description: 'Send messages and notifications' },
  { id: 'calls', name: 'Call Center', description: 'Call center operations' },
  { id: 'reports', name: 'Reports', description: 'View and export reports' },
  { id: 'settings', name: 'Settings', description: 'Manage tenant settings' },
  { id: 'users', name: 'User Management', description: 'Manage users and roles' },
  { id: 'tenants', name: 'Tenant Management', description: 'Manage tenants (Super Admin)' },
];

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CHURCH_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  STAFF: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CALL_CENTER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SUBSCRIBER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  MEMBER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// Default permissions fallback
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

interface PermissionToggleProps {
  granted: boolean;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

function PermissionToggle({ granted, onClick, isLoading, disabled }: PermissionToggleProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "p-1 rounded-md transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2",
        granted 
          ? "text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30 focus:ring-green-500" 
          : "text-red-500 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 focus:ring-red-500",
        disabled && "opacity-50 cursor-not-allowed hover:scale-100"
      )}
      title={granted ? "Click to revoke permission" : "Click to grant permission"}
    >
      {granted ? (
        <Unlock className="h-4 w-4" />
      ) : (
        <Lock className="h-4 w-4" />
      )}
    </button>
  );
}

export default function AccessControlPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  
  // Fetch tenants for selection
  const { data: tenantsData, isLoading: isLoadingTenants } = useTenants({ limit: 100 });
  const tenants = tenantsData?.data ?? [];

  // Fetch Church Admin users for the selected tenant (used only when editing CHURCH_ADMIN)
  // When no tenant is selected, force an empty result by using a non-existent tenantId.
  const churchAdminsQuery = useUsers({
    role: 'CHURCH_ADMIN',
    tenantId: selectedTenantId ?? 'no-tenant-selected',
    pageSize: 100,
  });
  const churchAdmins = churchAdminsQuery.data?.data ?? [];
  
  const rolePermissionsQuery = usePermissions(selectedTenantId);
  const userPermissionsQuery = useUserPermissionsAdmin(selectedUserId);

  const { data: permissions } = rolePermissionsQuery;
  const isLoadingRolePermissions = rolePermissionsQuery.isLoading;
  const isLoadingUserPermissions = userPermissionsQuery.isLoading;

  const updatePermission = useUpdatePermission();
  const updateUserPermission = useUpdateUserPermissionAdmin();

  // Get the selected role details
  const selectedRoleDetails = roles.find(r => r.id === selectedRole);
  const selectedTenant = tenants.find(t => t.id === selectedTenantId);
  const selectedUser = churchAdmins.find(u => u.id === selectedUserId);

  const isChurchAdminRole = selectedRole === 'CHURCH_ADMIN';
  const isEditingChurchAdminUser = isChurchAdminRole && !!selectedUserId;

  const isRefetching = isEditingChurchAdminUser
    ? userPermissionsQuery.isRefetching
    : rolePermissionsQuery.isRefetching;

  const handleRefresh = () => {
    if (isEditingChurchAdminUser) {
      return userPermissionsQuery.refetch();
    }
    return rolePermissionsQuery.refetch();
  };

  // Use fetched permissions or fallback to defaults
  const permissionsMatrix = permissions || defaultPermissions;
  const currentPermissions = isEditingChurchAdminUser
    ? (userPermissionsQuery.data?.permissions || defaultPermissions.CHURCH_ADMIN)
    : (selectedRole ? (permissionsMatrix[selectedRole] || {}) : {});

  const handleTogglePermission = async (
    moduleId: string, 
    permission: PermissionType, 
    currentValue: boolean
  ) => {
    if (!selectedRole) return;

    // For Church Admin, permissions must be applied to a specific Church Admin user
    if (selectedRole === 'CHURCH_ADMIN') {
      if (!selectedUserId) return;
    }
    
    const key = `${selectedRole}:${moduleId}:${permission}`;
    setUpdatingKey(key);
    
    try {
      if (selectedRole === 'CHURCH_ADMIN' && selectedUserId) {
        await updateUserPermission.mutateAsync({
          userId: selectedUserId,
          module: moduleId,
          permission,
          granted: !currentValue,
        });
      } else {
        await updatePermission.mutateAsync({
          role: selectedRole,
          module: moduleId,
          permission,
          granted: !currentValue,
          tenantId: selectedTenantId || undefined,
        });
      }
    } finally {
      setUpdatingKey(null);
    }
  };

  const isUpdating = (moduleId: string, permission: PermissionType) => {
    return updatingKey === `${selectedRole}:${moduleId}:${permission}`;
  };

  const handleSelectRole = (roleId: string) => {
    setSelectedRole(roleId);
    setSelectedUserId(null);
  };

  const handleSelectTenant = (tenantId: string | null) => {
    setSelectedTenantId(tenantId);
    setSelectedRole(null); // Reset role selection when tenant changes
    setSelectedUserId(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Control</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage role-based permissions across the platform
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefresh}
          disabled={isRefetching}
        >
          <RefreshCw className={cn("h-4 w-4 mr-2", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Step 1: Tenant Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Step 1: Select Scope
          </CardTitle>
          <CardDescription>
            Choose whether to configure global defaults or tenant-specific permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTenants ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Global Defaults Option */}
              <button
                onClick={() => handleSelectTenant(null)}
                className={cn(
                  "w-full p-4 rounded-lg border text-left transition-all",
                  selectedTenantId === null
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">Global Defaults</p>
                      <p className="text-sm text-muted-foreground">
                        Default permissions for all tenants that don't have specific overrides
                      </p>
                    </div>
                  </div>
                  {selectedTenantId === null && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              </button>

              {/* Tenant Selection */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {tenants.map((tenant) => (
                  <button
                    key={tenant.id}
                    onClick={() => handleSelectTenant(tenant.id)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      selectedTenantId === tenant.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={tenant.isActive ? "default" : "secondary"}>
                        {tenant.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {selectedTenantId === tenant.id && (
                        <Check className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    <p className="font-medium truncate">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 font-mono truncate">
                      ID: {tenant.id}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Current Scope Indicator */}
      {(selectedTenantId !== null || selectedTenantId === null) && (
        <div className={cn(
          "rounded-lg p-4 border",
          selectedTenantId === null 
            ? "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
            : "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800"
        )}>
          <p className={cn(
            "text-sm font-medium",
            selectedTenantId === null ? "text-blue-800 dark:text-blue-200" : "text-purple-800 dark:text-purple-200"
          )}>
            {selectedTenantId === null ? (
              <>
                <Globe className="h-4 w-4 inline mr-2" />
                Editing Global Default Permissions
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 inline mr-2" />
                Editing permissions for: <strong>{selectedTenant?.name}</strong>
              </>
            )}
          </p>
        </div>
      )}

      {/* Step 2: Role Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Step 2: Select a Role
          </CardTitle>
          <CardDescription>
            Choose which role you want to configure permissions for
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => handleSelectRole(role.id)}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all",
                  selectedRole === role.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                    : "border-border hover:border-primary/50 hover:bg-muted/50"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <Badge className={roleColors[role.id]}>
                    {role.name}
                  </Badge>
                  {selectedRole === role.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{role.description}</p>
                <p className="text-xs text-muted-foreground mt-2 font-mono">
                  Role ID: {role.id}
                </p>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Step 2b: Church Admin User Selection (only for CHURCH_ADMIN) */}
      {selectedRole === 'CHURCH_ADMIN' ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Step 2b: Select a Church Admin
            </CardTitle>
            <CardDescription>
              Permissions for Church Admin are applied per user (not all Church Admins)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedTenantId === null ? (
              <div className="text-sm text-muted-foreground">
                Select a tenant scope first to list Church Admin users.
              </div>
            ) : churchAdminsQuery.isLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : churchAdmins.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No Church Admin users found for this tenant.
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {churchAdmins.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className={cn(
                      "p-4 rounded-lg border text-left transition-all",
                      selectedUserId === u.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary shadow-md"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={u.isActive ? 'default' : 'secondary'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                      {selectedUserId === u.id && <Check className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="font-medium truncate">{u.firstName} {u.lastName}</p>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-2 font-mono truncate">ID: {u.id}</p>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Step 3: Permissions Matrix - Only show when target is selected */}
      {selectedRole && selectedRoleDetails && (!isChurchAdminRole || isEditingChurchAdminUser) ? (
        <Card className="border-primary/50">
          <CardHeader className="bg-primary/5">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Step 3: Configure Permissions
                </CardTitle>
                <CardDescription className="mt-1">
                  Managing permissions for role: <strong className="text-foreground">{selectedRoleDetails.name}</strong>
                  <span className="ml-2 font-mono text-xs">({selectedRole})</span>
                  {isChurchAdminRole && selectedUser && (
                    <span className="ml-2">
                      for user: <strong className="text-foreground">{selectedUser.firstName} {selectedUser.lastName}</strong>
                    </span>
                  )}
                  {selectedTenantId && selectedTenant && (
                    <span className="ml-2">
                      in tenant: <strong className="text-foreground">{selectedTenant.name}</strong>
                    </span>
                  )}
                </CardDescription>
              </div>
              <Badge className={cn(roleColors[selectedRole], "text-sm px-3 py-1")}>
                {selectedRoleDetails.name}
              </Badge>
            </div>
          </CardHeader>
        <CardContent>
          {(isEditingChurchAdminUser ? isLoadingUserPermissions : isLoadingRolePermissions) ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Module
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Eye className="h-4 w-4 inline mr-1" />
                      View
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Plus className="h-4 w-4 inline mr-1" />
                      Create
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Pencil className="h-4 w-4 inline mr-1" />
                      Edit
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      <Trash2 className="h-4 w-4 inline mr-1" />
                      Delete
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {modules.map((module) => {
                    const perms = currentPermissions[module.id] || { view: false, create: false, edit: false, delete: false };
                    return (
                      <tr key={module.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium">{module.name}</p>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PermissionToggle
                            granted={perms.view}
                            onClick={() => handleTogglePermission(module.id, 'view', perms.view)}
                            isLoading={isUpdating(module.id, 'view')}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PermissionToggle
                            granted={perms.create}
                            onClick={() => handleTogglePermission(module.id, 'create', perms.create)}
                            isLoading={isUpdating(module.id, 'create')}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PermissionToggle
                            granted={perms.edit}
                            onClick={() => handleTogglePermission(module.id, 'edit', perms.edit)}
                            isLoading={isUpdating(module.id, 'edit')}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <PermissionToggle
                            granted={perms.delete}
                            onClick={() => handleTogglePermission(module.id, 'delete', perms.delete)}
                            isLoading={isUpdating(module.id, 'delete')}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
      ) : (
        /* Prompt to select a role */
        <Card className="border-dashed">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <Shield className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Select a Role</h3>
                <p className="text-muted-foreground mt-1">
                  Choose a role from the list above to view and manage its permissions
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Legend - Only show when role is selected */}
      {selectedRole && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-green-100 dark:bg-green-900/30">
                  <Unlock className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm text-muted-foreground">Permission Granted (click to revoke)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-md bg-red-100 dark:bg-red-900/30">
                  <Lock className="h-4 w-4 text-red-500 dark:text-red-400" />
                </div>
                <span className="text-sm text-muted-foreground">Permission Denied (click to grant)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info */}
      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>Tip:</strong> First select a scope (Global or specific Tenant), then select a role, and finally click on permission icons to toggle access. 
          Changes are saved automatically. Tenant-specific permissions override global defaults.
        </p>
      </div>
    </div>
  );
}
