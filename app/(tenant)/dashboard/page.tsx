/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT DASHBOARD PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { 
  Users, 
  UserPlus, 
  HandHeart, 
  DollarSign, 
  Phone,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboardStats, useModulePermissions } from '@/lib/client';
import { cn } from '@/lib/utils';
import { AccessDenied } from '@/components/permission-gate';

function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

function StatCard({ 
  title, 
  value, 
  change, 
  icon: Icon,
  trend,
}: { 
  title: string; 
  value: string | number; 
  change?: number;
  icon: React.ElementType;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {change !== undefined && (
          <div className="flex items-center text-xs text-muted-foreground mt-1">
            {trend === 'up' ? (
              <TrendingUp className="h-3 w-3 mr-1 text-green-500" />
            ) : trend === 'down' ? (
              <TrendingDown className="h-3 w-3 mr-1 text-red-500" />
            ) : null}
            <span className={cn(
              trend === 'up' && 'text-green-500',
              trend === 'down' && 'text-red-500',
            )}>
              {change > 0 ? '+' : ''}{change}%
            </span>
            <span className="ml-1">from last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();
  const { canView, isLoading: permissionsLoading } = useModulePermissions();

  // Check for view permission
  if (!permissionsLoading && !canView('dashboard')) {
    return <AccessDenied message="You do not have permission to view the dashboard." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Welcome back! Here&apos;s an overview of your church.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500 dark:text-gray-400">Welcome back! Here&apos;s an overview of your church.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Members"
          value={stats?.members.total ?? 0}
          change={stats?.members.growth}
          icon={Users}
          trend={stats?.members.growth && stats.members.growth > 0 ? 'up' : 'down'}
        />
        <StatCard
          title="Active Leads"
          value={stats?.leads.pending ?? 0}
          icon={UserPlus}
        />
        <StatCard
          title="Prayer Requests"
          value={stats?.prayerRequests.pending ?? 0}
          icon={HandHeart}
        />
        <StatCard
          title="This Month's Offerings"
          value={formatCurrency(stats?.offerings.thisMonth.total ?? 0)}
          change={stats?.offerings.growth}
          icon={DollarSign}
          trend={stats?.offerings.growth && stats.offerings.growth > 0 ? 'up' : 'down'}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Members Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Active Members</span>
              <span className="font-medium">{stats?.members.active ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New This Month</span>
              <span className="font-medium">{stats?.members.newThisMonth ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads Pipeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">New Leads</span>
              <span className="font-medium">{stats?.leads.new ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Converted</span>
              <span className="font-medium">{stats?.leads.converted ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Conversion Rate</span>
              <span className="font-medium">{stats?.leads.conversionRate ?? 0}%</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Call Center Activity</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Calls This Month</span>
              <span className="font-medium">{stats?.callCenter.callsThisMonth ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Last Month</span>
              <span className="font-medium">{stats?.callCenter.callsLastMonth ?? 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lead Sources */}
      {stats?.leads.bySource && stats.leads.bySource.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.leads.bySource.map((source) => (
                <div key={source.source} className="flex items-center justify-between">
                  <span className="text-sm capitalize">
                    {source.source.toLowerCase().replace('_', ' ')}
                  </span>
                  <span className="font-medium">{source.count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
