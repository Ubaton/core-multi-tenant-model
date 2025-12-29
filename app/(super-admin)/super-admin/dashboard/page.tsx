/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN DASHBOARD PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { Building2, Users, Globe, Activity, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useTenants } from '@/lib/client';

export default function SuperAdminDashboardPage() {
  const { data: tenantsData } = useTenants({});

  const tenants = tenantsData?.data ?? [];
  const activeTenants = tenants.filter(t => t.isActive).length;
  const hqTenants = tenants.filter(t => t.isHQ).length;
  const totalOfferings = tenants.reduce((sum, t) => sum + parseFloat(t.totalOfferings ?? '0'), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Platform Overview</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Monitor and manage all tenants across the platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tenants
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tenants.length}</div>
            <p className="text-xs text-muted-foreground">{activeTenants} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              HQ Organizations
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hqTenants}</div>
            <p className="text-xs text-muted-foreground">with branches</p>
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
            <div className="text-2xl font-bold">
              {tenants.reduce((sum, t) => sum + (t._count?.users ?? 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">across all tenants</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Members
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {tenants.reduce((sum, t) => sum + (t._count?.members ?? 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">across all tenants</p>
          </CardContent>
        </Card>

        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700 dark:text-green-300">
              Total Offerings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-700 dark:text-green-300">
              R {totalOfferings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-green-600 dark:text-green-400">across all tenants</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          {tenants.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No tenants registered yet
            </p>
          ) : (
            <div className="space-y-4">
              {tenants.slice(0, 5).map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border dark:border-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        {tenant.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tenant.slug}.yourdomain.com
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{tenant._count?.members ?? 0} members</p>
                      <p className="text-xs text-gray-500">{tenant._count?.users ?? 0} users</p>
                    </div>
                    <div className="text-right min-w-20">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">
                        R {parseFloat(tenant.totalOfferings ?? '0').toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500">offerings</p>
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        tenant.isActive ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
