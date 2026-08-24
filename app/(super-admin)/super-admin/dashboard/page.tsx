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
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground">
          Monitor and manage all tenants across the platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Churches
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
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
              <div className="h-8 w-12 bg-muted rounded animate-pulse" />
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
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
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
              <div className="h-8 w-16 bg-muted rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.members.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">across all tenants</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-success/10 border-success/30">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-success">
              Total Offerings
            </CardTitle>
            <DollarSign className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="h-8 w-24 bg-success/10 rounded animate-pulse" />
            ) : (
              <>
                <div className="text-2xl font-bold text-success">
                  R {totalOfferings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-success">across all tenants</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Tenants with Pagination */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Church</CardTitle>
          {isFetching && !isLoadingList && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </CardHeader>
        <CardContent>
          {isLoadingList ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-8 w-20 bg-muted rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : tenants.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No tenants registered yet
            </p>
          ) : (
            <div className="space-y-4">
              {tenants.map((tenant) => (
                <Link
                  key={tenant.id}
                  href={`/super-admin/tenants/${tenant.id}`}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">
                        {tenant.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {tenant.slug}.yourdomain.com
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">{tenant._count?.members ?? 0} members</p>
                      <p className="text-xs text-muted-foreground">{tenant._count?.users ?? 0} users</p>
                    </div>
                    <div className="text-right min-w-20">
                      <p className="text-sm font-medium text-success">
                        R {parseFloat(tenant.totalOfferings ?? '0').toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-muted-foreground">offerings</p>
                    </div>
                    <div
                      className={`h-2 w-2 rounded-full ${
                        tenant.isActive ? 'bg-success' : 'bg-muted-foreground'
                      }`}
                    />
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Pagination Controls */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 mt-4 border-t">
              <p className="text-sm text-muted-foreground">
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
