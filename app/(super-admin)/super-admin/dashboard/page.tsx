/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN DASHBOARD PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Building2, Users, Globe, Activity, DollarSign, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useTenants, usePlatformStats } from '@/lib/client';

export default function SuperAdminDashboardPage() {
  const [page, setPage] = useState(1);

  // Fetch platform-wide stats from dedicated endpoint (server-side aggregation)
  const { data: stats, isLoading: isLoadingStats } = usePlatformStats();
  
  // Fetch paginated tenants for the list (5 per page)
  const { data: paginatedData, isLoading: isLoadingList, isFetching } = useTenants({ 
    page, 
    pageSize: 5,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  const tenants = paginatedData?.data ?? [];
  const meta = paginatedData?.meta;

  // Parse offerings total
  const totalOfferings = parseFloat(stats?.offerings.total ?? '0');

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
            {isLoadingStats ? (
              <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.tenants.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">{stats?.tenants.active ?? 0} active</p>
              </>
            )}
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
            {isLoadingStats ? (
              <div className="h-8 w-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.tenants.hq ?? 0}</div>
                <p className="text-xs text-muted-foreground">with branches</p>
              </>
            )}
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
            {isLoadingStats ? (
              <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.users.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">across all tenants</p>
              </>
            )}
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
            {isLoadingStats ? (
              <div className="h-8 w-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.members.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">across all tenants</p>
              </>
            )}
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
            {isLoadingStats ? (
              <div className="h-8 w-24 bg-green-100 dark:bg-green-900/40 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  R {totalOfferings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-green-600 dark:text-green-400">across all tenants</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants with Pagination */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Tenants</CardTitle>
          {isFetching && !isLoadingList && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border dark:border-gray-800 rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                      <div className="h-3 w-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              No tenants registered yet
            </p>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/super-admin/tenants/${tenant.id}`}
                  className="flex items-center justify-between p-4 border dark:border-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
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
                </Link>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t dark:border-gray-800">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Page {meta.page} of {meta.totalPages} ({meta.total} tenants)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPrevPage || isFetching}
                  onClick={() => setPage(page - 1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNextPage || isFetching}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
