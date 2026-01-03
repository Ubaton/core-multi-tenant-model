/**
 * ════════════════════════════════════════════════════════════════════════════
 * SUPER ADMIN STATISTICS PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import {
  Building2,
  Globe,
  Users,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { useTenants, useUsers } from '@/lib/client';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';

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

  const usersByRoleChartConfig = {
    users: {
      label: 'Users',
    },
    super_admin: {
      label: 'Super Admin',
      color: 'hsl(var(--chart-1))',
    },
    church_admin: {
      label: 'Church Admin',
      color: 'hsl(var(--chart-2))',
    },
    staff: {
      label: 'Staff',
      color: 'hsl(var(--chart-3))',
    },
    call_center: {
      label: 'Call Center',
      color: 'hsl(var(--chart-4))',
    },
    subscriber: {
      label: 'Subscriber',
      color: 'hsl(var(--chart-5))',
    },
    member: {
      label: 'Member',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const usersByRoleChartData = [
    { role: 'super_admin', users: usersByRole.SUPER_ADMIN, fill: 'var(--color-super_admin)' },
    { role: 'church_admin', users: usersByRole.CHURCH_ADMIN, fill: 'var(--color-church_admin)' },
    { role: 'staff', users: usersByRole.STAFF, fill: 'var(--color-staff)' },
    { role: 'call_center', users: usersByRole.CALL_CENTER, fill: 'var(--color-call_center)' },
    { role: 'subscriber', users: usersByRole.SUBSCRIBER, fill: 'var(--color-subscriber)' },
    { role: 'member', users: usersByRole.MEMBER, fill: 'var(--color-member)' },
  ].filter((d) => d.users > 0);

  const tenantStatusChartConfig = {
    tenants: {
      label: 'Tenants',
    },
    active: {
      label: 'Active',
      color: 'hsl(var(--chart-2))',
    },
    inactive: {
      label: 'Inactive',
      color: 'hsl(var(--chart-5))',
    },
  } satisfies ChartConfig;

  const tenantStatusChartData = [
    { status: 'active', tenants: activeTenants, fill: 'var(--color-active)' },
    { status: 'inactive', tenants: inactiveTenants, fill: 'var(--color-inactive)' },
  ].filter((d) => d.tenants > 0);

  const topTenants = tenants
    .slice()
    .sort((a, b) => (b._count?.members ?? 0) - (a._count?.members ?? 0))
    .slice(0, 5);

  const topTenantsChartConfig = {
    members: {
      label: 'Members',
      color: 'hsl(var(--chart-1))',
    },
  } satisfies ChartConfig;

  const topTenantsChartData = topTenants.map((tenant) => ({
    tenant: tenant.name,
    members: tenant._count?.members ?? 0,
  }));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Platform Statistics</h1>
        <p className="text-muted-foreground">
          Comprehensive analytics and metrics across the entire platform
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/40 border-t-primary"></div>
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

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Users by Role</CardTitle>
                <CardDescription>Interactive distribution of users across roles</CardDescription>
              </CardHeader>
              <CardContent>
                {usersByRoleChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No user role data available.</p>
                ) : (
                  <ChartContainer
                    config={usersByRoleChartConfig}
                    className="aspect-auto h-[260px] w-full"
                  >
                    <PieChart>
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            nameKey="role"
                            labelKey="role"
                          />
                        }
                      />
                      <Pie
                        data={usersByRoleChartData}
                        dataKey="users"
                        nameKey="role"
                        innerRadius={70}
                        outerRadius={95}
                        strokeWidth={2}
                        isAnimationActive={false}
                      >
                        {usersByRoleChartData.map((entry) => (
                          <Cell key={entry.role} fill={entry.fill} />
                        ))}
                      </Pie>
                      <ChartLegend content={<ChartLegendContent nameKey="role" />} />
                    </PieChart>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tenant Activity</CardTitle>
                <CardDescription>Active vs inactive tenants (hover for details)</CardDescription>
              </CardHeader>
              <CardContent>
                {tenantStatusChartData.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tenant status data available.</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
                    <ChartContainer
                      config={tenantStatusChartConfig}
                      className="aspect-auto h-[260px] w-full"
                    >
                      <PieChart>
                        <ChartTooltip
                          cursor={false}
                          content={<ChartTooltipContent nameKey="status" labelKey="status" />}
                        />
                        <Pie
                          data={tenantStatusChartData}
                          dataKey="tenants"
                          nameKey="status"
                          innerRadius={70}
                          outerRadius={95}
                          strokeWidth={2}
                          isAnimationActive={false}
                        >
                          {tenantStatusChartData.map((entry) => (
                            <Cell key={entry.status} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartLegend content={<ChartLegendContent nameKey="status" />} />
                      </PieChart>
                    </ChartContainer>

                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4 text-sm">
                      <div className="flex items-center justify-between gap-6">
                        <span className="text-muted-foreground">HQ organizations</span>
                        <span className="font-semibold tabular-nums">{hqTenants}</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-6">
                        <span className="text-muted-foreground">Branch locations</span>
                        <span className="font-semibold tabular-nums">{totalBranches}</span>
                      </div>
                    </div>
                  </div>
                )}
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
              {topTenants.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No tenants found</p>
              ) : (
                <div className="grid gap-6 lg:grid-cols-2">
                  <ChartContainer
                    config={topTenantsChartConfig}
                    className="aspect-auto h-[280px] w-full"
                  >
                    <BarChart data={topTenantsChartData} margin={{ left: 8, right: 8 }}>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="tenant"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        interval={0}
                        height={48}
                        tickFormatter={(value) =>
                          typeof value === 'string' && value.length > 14
                            ? `${value.slice(0, 14)}…`
                            : value
                        }
                      />
                      <YAxis tickLine={false} axisLine={false} width={40} />
                      <ChartTooltip
                        content={<ChartTooltipContent nameKey="tenant" />}
                      />
                      <Bar dataKey="members" fill="var(--color-members)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ChartContainer>

                  <div className="space-y-4">
                    {topTenants.map((tenant, index) => (
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
                          <p className="text-sm font-bold tabular-nums">{tenant._count?.members ?? 0}</p>
                          <p className="text-xs text-muted-foreground">members</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
