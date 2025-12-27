/**
 * ════════════════════════════════════════════════════════════════════════════
 * REPORTS PAGE
 * View and export reports and analytics
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { AccessDenied } from '@/components/permission-gate';

const reportTypes = [
  {
    id: 'membership',
    name: 'Membership Report',
    description: 'Overview of member statistics, growth, and demographics',
    icon: Users,
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    id: 'financial',
    name: 'Financial Report',
    description: 'Offerings, donations, and financial summaries',
    icon: DollarSign,
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    id: 'attendance',
    name: 'Attendance Report',
    description: 'Service attendance and participation trends',
    icon: Calendar,
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    id: 'engagement',
    name: 'Engagement Report',
    description: 'Member engagement, communications, and activity',
    icon: TrendingUp,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
];

export default function ReportsPage() {
  const { canView, isLoading } = useModulePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canView('reports')) {
    return <AccessDenied message="You don't have permission to view reports." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h1>
          <p className="text-gray-500 dark:text-gray-400">
            View and export reports and analytics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export All
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Run membership report for details
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Offerings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Run financial report for details
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Run attendance report for details
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
            <p className="text-xs text-muted-foreground">
              Run engagement report for details
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Available Reports
          </CardTitle>
          <CardDescription>
            Select a report type to generate and view detailed analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {reportTypes.map((report) => (
              <div
                key={report.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer"
              >
                <div className={`p-3 rounded-lg ${report.color}`}>
                  <report.icon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{report.name}</h3>
                    <Badge variant="secondary">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {report.description}
                  </p>
                  <div className="flex items-center gap-2 mt-3">
                    <Button size="sm" variant="outline" disabled>
                      <FileText className="h-4 w-4 mr-2" />
                      Generate
                    </Button>
                    <Button size="sm" variant="ghost" disabled>
                      <Download className="h-4 w-4 mr-2" />
                      Export
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
          <CardDescription>
            Previously generated reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No reports generated yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Generate a report above to see it here
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
