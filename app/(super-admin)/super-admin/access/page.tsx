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
  CheckCircle2,
  Circle,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Check,
  Loader2,
  RefreshCw,
  Building2,
  Globe,
  LayoutDashboard,
  Users,
  Target,
  DollarSign,
  Heart,
  MessageSquare,
  Phone,
  BarChart3,
  Settings,
  UserCog,
  Building,
  MinusCircle,
  Lock,
  User,
  AlertCircle,
  Info,
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

// ─── Configuration ──────────────────────────────────────────────────────────

const roles = [
  {
    id: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full platform access',
    shortName: 'SA',
    protected: true,
  },
  {
    id: 'CHURCH_ADMIN',
    name: 'Church Admin',
    description: 'Per-user permissions',
    shortName: 'CA',
    perUser: true,
  },
  { id: 'STAFF', name: 'Staff', description: 'Limited tenant access', shortName: 'ST' },
  { id: 'CALL_CENTER', name: 'Call Center', description: 'Call center operations', shortName: 'CC' },
  { id: 'SUBSCRIBER', name: 'Subscriber', description: 'Read-only access', shortName: 'SB' },
  { id: 'MEMBER', name: 'Member', description: 'Basic member access', shortName: 'ME' },
];

const modules = [
  { id: 'dashboard', name: 'Dashboard', Icon: LayoutDashboard },
  { id: 'members', name: 'Members', Icon: Users },
  { id: 'leads', name: 'Leads', Icon: Target },
  { id: 'offerings', name: 'Offerings', Icon: DollarSign },
  { id: 'prayer_requests', name: 'Prayer Requests', Icon: Heart },
  { id: 'communications', name: 'Communications', Icon: MessageSquare },
  { id: 'calls', name: 'Call Center', Icon: Phone },
  { id: 'reports', name: 'Reports', Icon: BarChart3 },
  { id: 'settings', name: 'Settings', Icon: Settings },
  { id: 'users', name: 'User Mgmt', Icon: UserCog },
  { id: 'tenants', name: 'Tenants', Icon: Building },
];

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CHURCH_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  STAFF: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CALL_CENTER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SUBSCRIBER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  MEMBER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

// Fallback default permissions
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

// ─── Permission Toggle ───────────────────────────────────────────────────────

interface PermissionToggleProps {
  granted: boolean;
  onClick: () => void;
  isLoading?: boolean;
  disabled?: boolean;
}

function PermissionToggle({ granted, onClick, isLoading, disabled }: PermissionToggleProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center w-9 h-9">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (disabled) {
    return (
      <div className="flex items-center justify-center w-9 h-9">
        <CheckCircle2 className="h-5 w-5 text-emerald-500/50 dark:text-emerald-400/50" />
      </div>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex items-center justify-center w-9 h-9 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-1',
        granted
          ? 'text-emerald-600 dark:text-emerald-400 hover:bg-red-50 dark:hover:bg-red-900/20 focus:ring-red-300'
          : 'text-gray-300 dark:text-gray-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:ring-emerald-300'
      )}
      title={granted ? 'Click to revoke' : 'Click to grant'}
    >
      {granted ? (
        <>
          <CheckCircle2 className="h-5 w-5 group-hover:hidden" />
          <MinusCircle className="h-5 w-5 hidden group-hover:block text-red-500 dark:text-red-400" />
        </>
      ) : (
        <>
          <Circle className="h-5 w-5 group-hover:hidden" />
          <CheckCircle2 className="h-5 w-5 hidden group-hover:block text-emerald-500 dark:text-emerald-400" />
        </>
      )}
    </button>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AccessControlPage() {
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [updatingRow, setUpdatingRow] = useState<string | null>(null);

  // Data fetching
  const { data: tenantsData, isLoading: isLoadingTenants } = useTenants({ limit: 100 });
  const tenants = tenantsData?.data ?? [];

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

  // Derived state
  const selectedRoleDetails = roles.find((r) => r.id === selectedRole);
  const selectedTenant = tenants.find((t) => t.id === selectedTenantId);
  const selectedUser = churchAdmins.find((u) => u.id === selectedUserId);

  const isChurchAdminRole = selectedRole === 'CHURCH_ADMIN';
  const isEditingChurchAdminUser = isChurchAdminRole && !!selectedUserId;
  const isSuperAdminRole = selectedRole === 'SUPER_ADMIN';

  const isRefetching = isEditingChurchAdminUser
    ? userPermissionsQuery.isRefetching
    : rolePermissionsQuery.isRefetching;

  const isLoading = isEditingChurchAdminUser ? isLoadingUserPermissions : isLoadingRolePermissions;

  const permissionsMatrix = permissions || defaultPermissions;
  const currentPermissions = isEditingChurchAdminUser
    ? userPermissionsQuery.data?.permissions || defaultPermissions.CHURCH_ADMIN
    : selectedRole
    ? permissionsMatrix[selectedRole] || {}
    : {};

  // Permission summary
  const totalPermissions = modules.length * 4;
  const grantedCount = isSuperAdminRole
    ? totalPermissions
    : modules.reduce((acc, mod) => {
        const perms = currentPermissions[mod.id] || {};
        return (
          acc +
          (['view', 'create', 'edit', 'delete'] as const).filter((p) => perms[p]).length
        );
      }, 0);

  const canShowMatrix =
    selectedRole && selectedRoleDetails && (!isChurchAdminRole || isEditingChurchAdminUser);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleTogglePermission = async (
    moduleId: string,
    permission: PermissionType,
    currentValue: boolean
  ) => {
    if (!selectedRole || isSuperAdminRole) return;
    if (isChurchAdminRole && !selectedUserId) return;

    const key = `${selectedRole}:${moduleId}:${permission}`;
    setUpdatingKey(key);

    try {
      if (isChurchAdminRole && selectedUserId) {
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

  const handleSetRowPermissions = async (moduleId: string, grant: boolean) => {
    if (!selectedRole || isSuperAdminRole) return;
    if (isChurchAdminRole && !selectedUserId) return;

    const perms = currentPermissions[moduleId] || {
      view: false,
      create: false,
      edit: false,
      delete: false,
    };
    const permTypes: PermissionType[] = ['view', 'create', 'edit', 'delete'];
    const toChange = permTypes.filter(
      (p) => perms[p as keyof typeof perms] !== grant
    );
    if (toChange.length === 0) return;

    setUpdatingRow(moduleId);
    try {
      for (const perm of toChange) {
        if (isChurchAdminRole && selectedUserId) {
          await updateUserPermission.mutateAsync({
            userId: selectedUserId,
            module: moduleId,
            permission: perm,
            granted: grant,
          });
        } else {
          await updatePermission.mutateAsync({
            role: selectedRole,
            module: moduleId,
            permission: perm,
            granted: grant,
            tenantId: selectedTenantId || undefined,
          });
        }
      }
    } finally {
      setUpdatingRow(null);
    }
  };

  const isUpdating = (moduleId: string, permission: PermissionType) => {
    if (updatingRow === moduleId) return true;
    return updatingKey === `${selectedRole}:${moduleId}:${permission}`;
  };

  const handleSelectRole = (roleId: string) => {
    setSelectedRole(roleId);
    setSelectedUserId(null);
  };

  const handleSelectTenant = (tenantId: string | null) => {
    setSelectedTenantId(tenantId);
    setSelectedRole(null);
    setSelectedUserId(null);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Control</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Configure role-based permissions across the platform
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            isEditingChurchAdminUser
              ? userPermissionsQuery.refetch()
              : rolePermissionsQuery.refetch()
          }
          disabled={isRefetching}
        >
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ── LEFT: Configuration Panel ─────────────────────────────────── */}
        <Card className="lg:col-span-1 sticky top-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Configuration
            </CardTitle>
            <CardDescription className="text-xs">
              Select scope and role to configure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 p-4 pt-0">
            {/* ── Scope ──────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Scope
              </p>

              {/* Global option */}
              <button
                onClick={() => handleSelectTenant(null)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all text-sm',
                  selectedTenantId === null
                    ? 'bg-primary/8 border border-primary/30 text-foreground'
                    : 'border border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                )}
              >
                <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/30 shrink-0">
                  <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm leading-none">Global Defaults</p>
                  <p className="text-xs text-muted-foreground mt-0.5">All tenants</p>
                </div>
                {selectedTenantId === null && (
                  <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                )}
              </button>

              {/* Tenant list */}
              {isLoadingTenants ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : tenants.length > 0 ? (
                <div className="max-h-44 overflow-y-auto space-y-0.5 pr-0.5 scrollbar-thin">
                  {tenants.map((tenant) => (
                    <button
                      key={tenant.id}
                      onClick={() => handleSelectTenant(tenant.id)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                        selectedTenantId === tenant.id
                          ? 'bg-primary/8 border border-primary/30 text-foreground'
                          : 'border border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                      )}
                    >
                      <div className="p-1 rounded-md bg-purple-100 dark:bg-purple-900/30 shrink-0">
                        <Building2 className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-none truncate">
                          {tenant.name}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {tenant.isActive ? 'Active' : 'Inactive'}
                        </p>
                      </div>
                      {selectedTenantId === tenant.id && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="border-t border-dashed" />

            {/* ── Role ────────────────────────────────────────────────── */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                Role
              </p>
              <div className="space-y-0.5">
                {roles.map((role) => (
                  <button
                    key={role.id}
                    onClick={() => handleSelectRole(role.id)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                      selectedRole === role.id
                        ? 'bg-primary/8 border border-primary/30 text-foreground'
                        : 'border border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <Badge
                      className={cn('shrink-0 text-[10px] font-bold px-1.5 py-0 h-5', roleColors[role.id])}
                    >
                      {role.shortName}
                    </Badge>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm leading-none">{role.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{role.description}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {role.protected && (
                        <Lock className="h-3 w-3 text-muted-foreground/60" />
                      )}
                      {selectedRole === role.id && (
                        <Check className="h-3.5 w-3.5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Church Admin User Selection ─────────────────────────── */}
            {isChurchAdminRole && (
              <>
                <div className="border-t border-dashed" />
                <div className="space-y-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground px-1">
                    Church Admin User
                  </p>

                  {selectedTenantId === null ? (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <AlertCircle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        Select a specific tenant above to list Church Admin users.
                      </p>
                    </div>
                  ) : churchAdminsQuery.isLoading ? (
                    <div className="flex justify-center py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  ) : churchAdmins.length === 0 ? (
                    <p className="text-xs text-muted-foreground px-3 py-2 bg-muted/50 rounded-lg">
                      No Church Admin users found for this tenant.
                    </p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-0.5 pr-0.5">
                      {churchAdmins.map((u) => (
                        <button
                          key={u.id}
                          onClick={() => setSelectedUserId(u.id)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                            selectedUserId === u.id
                              ? 'bg-primary/8 border border-primary/30 text-foreground'
                              : 'border border-transparent hover:bg-muted/60 text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <div className="h-7 w-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center shrink-0">
                            <User className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-none truncate">
                              {u.firstName} {u.lastName}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {u.email}
                            </p>
                          </div>
                          {selectedUserId === u.id && (
                            <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* ── RIGHT: Permission Matrix ───────────────────────────────────── */}
        <div className="lg:col-span-2">
          {canShowMatrix ? (
            <Card>
              {/* Matrix Header */}
              <CardHeader className="pb-4 border-b">
                <div className="space-y-3">
                  {/* Context Badges */}
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-sm flex items-center gap-1.5">
                      <Key className="h-4 w-4 text-primary" />
                      Permissions
                    </CardTitle>
                    <Badge className={cn('text-xs', roleColors[selectedRole!])}>
                      {selectedRoleDetails!.name}
                    </Badge>
                    {selectedTenantId === null ? (
                      <Badge variant="outline" className="text-xs gap-1">
                        <Globe className="h-3 w-3" />
                        Global
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs gap-1 max-w-[140px]">
                        <Building2 className="h-3 w-3 shrink-0" />
                        <span className="truncate">{selectedTenant?.name}</span>
                      </Badge>
                    )}
                    {isEditingChurchAdminUser && selectedUser && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <User className="h-3 w-3" />
                        {selectedUser.firstName} {selectedUser.lastName}
                      </Badge>
                    )}
                  </div>

                  {/* Summary / Warning */}
                  {isSuperAdminRole ? (
                    <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                      <Lock className="h-3.5 w-3.5 shrink-0" />
                      Super Admin always has full platform access — permissions are fixed and cannot be modified.
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        <span className="text-foreground font-semibold text-sm">{grantedCount}</span>
                        {' '}/ {totalPermissions} permissions granted
                      </span>
                      <div className="flex-1 max-w-32 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                          style={{ width: `${(grantedCount / totalPermissions) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground ml-auto hidden sm:block">
                        Changes save automatically
                      </span>
                    </div>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-0">
                {isLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="px-4 py-3 text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-widest">
                            Module
                          </th>
                          <th className="px-2 py-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            <Eye className="h-3.5 w-3.5 inline-block" />
                            <span className="ml-1 hidden sm:inline">View</span>
                          </th>
                          <th className="px-2 py-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            <Plus className="h-3.5 w-3.5 inline-block" />
                            <span className="ml-1 hidden sm:inline">Create</span>
                          </th>
                          <th className="px-2 py-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            <Pencil className="h-3.5 w-3.5 inline-block" />
                            <span className="ml-1 hidden sm:inline">Edit</span>
                          </th>
                          <th className="px-2 py-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            <Trash2 className="h-3.5 w-3.5 inline-block" />
                            <span className="ml-1 hidden sm:inline">Delete</span>
                          </th>
                          {!isSuperAdminRole && (
                            <th className="px-3 py-3 text-center text-[10px] font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                              Quick
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {modules.map((module) => {
                          const { Icon } = module;
                          const perms = isSuperAdminRole
                            ? { view: true, create: true, edit: true, delete: true }
                            : currentPermissions[module.id] || {
                                view: false,
                                create: false,
                                edit: false,
                                delete: false,
                              };
                          const isRowUpdating = updatingRow === module.id;
                          const allGranted =
                            perms.view && perms.create && perms.edit && perms.delete;
                          const noneGranted =
                            !perms.view && !perms.create && !perms.edit && !perms.delete;

                          return (
                            <tr key={module.id} className="hover:bg-muted/20 transition-colors group">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2.5">
                                  <div
                                    className={cn(
                                      'p-1.5 rounded-md transition-colors',
                                      perms.view
                                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                                        : 'bg-muted'
                                    )}
                                  >
                                    <Icon
                                      className={cn(
                                        'h-3.5 w-3.5',
                                        perms.view
                                          ? 'text-emerald-600 dark:text-emerald-400'
                                          : 'text-muted-foreground/50'
                                      )}
                                    />
                                  </div>
                                  <span className="text-sm font-medium">{module.name}</span>
                                </div>
                              </td>

                              {(['view', 'create', 'edit', 'delete'] as const).map((perm) => (
                                <td key={perm} className="px-2 py-3 text-center">
                                  <PermissionToggle
                                    granted={perms[perm]}
                                    onClick={() =>
                                      handleTogglePermission(module.id, perm, perms[perm])
                                    }
                                    isLoading={isUpdating(module.id, perm)}
                                    disabled={isSuperAdminRole}
                                  />
                                </td>
                              ))}

                              {!isSuperAdminRole && (
                                <td className="px-3 py-3 text-center">
                                  {isRowUpdating ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mx-auto" />
                                  ) : (
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={() => handleSetRowPermissions(module.id, true)}
                                        disabled={allGranted}
                                        title="Grant all permissions for this module"
                                        className={cn(
                                          'flex items-center justify-center w-6 h-6 rounded transition-colors text-xs font-bold',
                                          allGranted
                                            ? 'text-muted-foreground/25 cursor-not-allowed'
                                            : 'text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30'
                                        )}
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() => handleSetRowPermissions(module.id, false)}
                                        disabled={noneGranted}
                                        title="Revoke all permissions for this module"
                                        className={cn(
                                          'flex items-center justify-center w-6 h-6 rounded transition-colors text-xs font-bold',
                                          noneGranted
                                            ? 'text-muted-foreground/25 cursor-not-allowed'
                                            : 'text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30'
                                        )}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  )}
                                </td>
                              )}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Legend */}
                {!isSuperAdminRole && (
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 border-t bg-muted/20">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Granted — hover to revoke
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
                      Denied — hover to grant
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground ml-auto">
                      <Info className="h-3.5 w-3.5" />
                      Tenant overrides take precedence over global defaults
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* ── Empty State ──────────────────────────────────────────── */
            <Card className="border-dashed">
              <CardContent className="py-20">
                <div className="text-center space-y-5 max-w-xs mx-auto">
                  <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                    <Shield className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      {!selectedRole ? 'Select a Role' : 'Select a Church Admin'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1.5">
                      {!selectedRole
                        ? 'Choose a scope and role from the left panel to configure permissions.'
                        : 'Church Admin permissions are user-specific. Select a user from the left panel to continue.'}
                    </p>
                  </div>

                  <div className="text-left space-y-2 p-4 bg-muted/40 rounded-xl border border-dashed">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Permission Hierarchy
                    </p>
                    <div className="space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-bold text-blue-600 dark:text-blue-400">1</span>
                        <span>Hardcoded role defaults (baseline)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-[8px] font-bold text-blue-600 dark:text-blue-400">2</span>
                        <span>Global role overrides (apply to all tenants)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-[8px] font-bold text-purple-600 dark:text-purple-400">3</span>
                        <span>Tenant-specific overrides (higher priority)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-[8px] font-bold text-emerald-600 dark:text-emerald-400">4</span>
                        <span>User-specific overrides (highest priority)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
