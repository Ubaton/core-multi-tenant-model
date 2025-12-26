/**
 * ════════════════════════════════════════════════════════════════════════════
 * ACCESS CONTROL PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { 
  Shield, 
  Users, 
  Building2, 
  Key,
  Lock,
  Unlock,
  Eye,
  Pencil,
  Trash2,
  Plus,
  Check,
  X,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

const permissionMatrix: Record<string, Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }>> = {
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

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CHURCH_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  STAFF: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CALL_CENTER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SUBSCRIBER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  MEMBER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

export default function AccessControlPage() {
  const [selectedRole, setSelectedRole] = useState<string>('SUPER_ADMIN');

  const currentPermissions = permissionMatrix[selectedRole] || {};

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Access Control</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage role-based permissions across the platform
        </p>
      </div>

      {/* Role Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Definitions
          </CardTitle>
          <CardDescription>
            Overview of all roles and their access levels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={cn(
                  "p-4 rounded-lg border text-left transition-all",
                  selectedRole === role.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary"
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
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Permissions Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Permissions for {roles.find(r => r.id === selectedRole)?.name}
          </CardTitle>
          <CardDescription>
            View and manage module-level permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                        {perms.view ? (
                          <Unlock className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                        ) : (
                          <Lock className="h-4 w-4 text-red-500 dark:text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {perms.create ? (
                          <Unlock className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                        ) : (
                          <Lock className="h-4 w-4 text-red-500 dark:text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {perms.edit ? (
                          <Unlock className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                        ) : (
                          <Lock className="h-4 w-4 text-red-500 dark:text-red-400 mx-auto" />
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {perms.delete ? (
                          <Unlock className="h-4 w-4 text-green-600 dark:text-green-400 mx-auto" />
                        ) : (
                          <Lock className="h-4 w-4 text-red-500 dark:text-red-400 mx-auto" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-2">
              <Unlock className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span className="text-sm text-muted-foreground">Permission Granted</span>
            </div>
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-red-500 dark:text-red-400" />
              <span className="text-sm text-muted-foreground">Permission Denied</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Note */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
        <p className="text-sm text-amber-800 dark:text-amber-200">
          <strong>Note:</strong> Role permissions are currently read-only. To modify role permissions, 
          please update the permission matrix in the codebase. Dynamic permission management will be 
          available in a future update.
        </p>
      </div>
    </div>
  );
}
