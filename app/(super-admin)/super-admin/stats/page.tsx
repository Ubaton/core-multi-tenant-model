/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN STATISTICS PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { 
  Building2, 
  Users, 
  UserPlus, 
  HandHeart, 
  DollarSign,
  TrendingUp,
  Activity,
  Globe,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenants, useUsers } from '@/lib/client';

export default function SuperAdminStatsPage() {
  const { data: tenantsData, isLoading: tenantsLoading } = useTenants({ limit: 100 });
  const { data: usersData, isLoading: usersLoading } = useUsers({ limit: 100 });

  const tenants = tenantsData?.data ?? [];
  const users = usersData?.data ?? [];

  const activeTenants = tenants.filter(t => t.isActive).length;
  const inactiveTenants = tenants.filter(t => !t.isActive).length;
  const hqTenants = tenants.filter(t => t.isHQ).length;

  const activeUsers = users.filter(u => u.isActive).length;
  const inactiveUsers = users.filter(u => !u.isActive).length;

  const usersByRole = {
    SUPER_ADMIN: users.filter(u => u.role === 'SUPER_ADMIN').length,
    CHURCH_ADMIN: users.filter(u => u.role === 'CHURCH_ADMIN').length,
    STAFF: users.filter(u => u.role === 'STAFF').length,
    CALL_CENTER: users.filter(u => u.role === 'CALL_CENTER').length,
    SUBSCRIBER: users.filter(u => u.role === 'SUBSCRIBER').length,
    MEMBER: users.filter(u => u.role === 'MEMBER').length,
  };

  const totalMembers = tenants.reduce((sum, t) => sum + (t._count?.members ?? 0), 0);
  const totalBranches = tenants.reduce((sum, t) => sum + (t._count?.branches ?? 0), 0);

  const isLoading = tenantsLoading || usersLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Statistics</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Comprehensive analytics and metrics across the entire platform
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Overview Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Tenants
                </CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tenants.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeTenants} active, {inactiveTenants} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Users
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{users.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeUsers} active, {inactiveUsers} inactive
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Members
                </CardTitle>
                <UserPlus className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalMembers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">across all tenants</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  HQ & Branches
                </CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{hqTenants}</div>
                <p className="text-xs text-muted-foreground">
                  {totalBranches} total branches
                </p>
              </CardContent>
            </Card>
          </div>

          {/* User Distribution */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
                <CardDescription>Distribution of users across different roles</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium">Super Admins</span>
                    </div>
                    <span className="text-sm font-bold">{usersByRole.SUPER_ADMIN}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-purple-500"></div>
                      <span className="text-sm font-medium">Church Admins</span>
                    </div>
                    <span className="text-sm font-bold">{usersByRole.CHURCH_ADMIN}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">Staff</span>
                    </div>
                    <span className="text-sm font-bold">{usersByRole.STAFF}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-gray-500"></div>
                      <span className="text-sm font-medium">Members</span>
                    </div>
                    <span className="text-sm font-bold">{usersByRole.MEMBER}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenant Status</CardTitle>
                <CardDescription>Overview of tenant activation status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm font-medium">Active Tenants</span>
                    </div>
                    <span className="text-sm font-bold">{activeTenants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium">Inactive Tenants</span>
                    </div>
                    <span className="text-sm font-bold">{inactiveTenants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                      <span className="text-sm font-medium">HQ Organizations</span>
                    </div>
                    <span className="text-sm font-bold">{hqTenants}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium">Branch Locations</span>
                    </div>
                    <span className="text-sm font-bold">{totalBranches}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Tenants */}
          <Card>
            <CardHeader>
              <CardTitle>Top Tenants by Members</CardTitle>
              <CardDescription>Organizations with the most registered members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tenants
                  .sort((a, b) => (b._count?.members ?? 0) - (a._count?.members ?? 0))
                  .slice(0, 5)
                  .map((tenant, index) => (
                    <div key={tenant.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                          {index + 1}
                        </span>
                        <div>
                          <p className="text-sm font-medium">{tenant.name}</p>
                          <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{tenant._count?.members ?? 0}</p>
                        <p className="text-xs text-muted-foreground">members</p>
                      </div>
                    </div>
                  ))}
                {tenants.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-4">
                    No tenants found
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
