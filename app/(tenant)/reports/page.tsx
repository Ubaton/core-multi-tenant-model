/**
 * ════════════════════════════════════════════════════════════════════════════
 * REPORTS PAGE
 * View and export reports and analytics
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState, useRef } from 'react';
import { 
  BarChart3, 
  Download, 
  FileText, 
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  Calendar,
  Filter,
  RefreshCw,
  Loader2,
  X,
  Printer,
  ChevronRight,
  PieChart,
  Activity,
  UserPlus,
  UserCheck,
  Phone,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { useDashboardStats } from '@/lib/client/hooks/use-stats';
import { AccessDenied } from '@/components/permission-gate';
import { cn } from '@/lib/utils';

type ReportType = 'membership' | 'financial' | 'attendance' | 'engagement' | null;

const reportTypes = [
  {
    id: 'membership' as const,
    name: 'Membership Report',
    description: 'Overview of member statistics, growth, and demographics',
    icon: Users,
    color: 'bg-info/10 text-info',
  },
  {
    id: 'financial' as const,
    name: 'Financial Report',
    description: 'Offerings, donations, and financial summaries',
    icon: DollarSign,
    color: 'bg-success/10 text-success',
  },
  {
    id: 'attendance' as const,
    name: 'Attendance Report',
    description: 'Service attendance and participation trends',
    icon: Calendar,
    color: 'bg-primary/10 text-primary',
  },
  {
    id: 'engagement' as const,
    name: 'Engagement Report',
    description: 'Member engagement, communications, and activity',
    icon: TrendingUp,
    color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  },
];

// Helper to format currency
function formatCurrency(value: string | number): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    minimumFractionDigits: 2,
  }).format(num);
}

// Helper to format percentage with trend
function formatGrowth(value: number): { text: string; isPositive: boolean } {
  const isPositive = value >= 0;
  return {
    text: `${isPositive ? '+' : ''}${value.toFixed(1)}%`,
    isPositive,
  };
}

// Helper to format date
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-ZA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

// Helper to get current month name
function getCurrentMonthName(): string {
  return new Intl.DateTimeFormat('en-ZA', { month: 'long', year: 'numeric' }).format(new Date());
}

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState<ReportType>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  const { canView, isLoading } = useModulePermissions();
  const { data: stats, isLoading: statsLoading, refetch, isFetching } = useDashboardStats();

  const handleGenerateReport = (reportId: ReportType) => {
    setIsGenerating(true);
    // Simulate report generation delay
    setTimeout(() => {
      setSelectedReport(reportId);
      setIsGenerating(false);
      // Scroll to report
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }, 500);
  };

  const handleExportCSV = () => {
    if (!stats || !selectedReport) return;
    
    let csvContent = '';
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Helper to escape CSV values
    const escapeCsv = (val: string | number) => {
      const stringVal = String(val);
      if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
        return `"${stringVal.replace(/"/g, '""')}"`;
      }
      return stringVal;
    };
    
    switch (selectedReport) {
      case 'membership':
        csvContent += `MEMBERSHIP REPORT\n`;
        csvContent += `Generated On,${escapeCsv(formattedDate)}\n\n`;
        
        csvContent += `SUMMARY METRICS\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `Total Members,${escapeCsv(stats.members.total)}\n`;
        csvContent += `Active Members,${escapeCsv(stats.members.active)}\n`;
        csvContent += `New Members (This Month),${escapeCsv(stats.members.newThisMonth)}\n`;
        csvContent += `Growth Rate,${escapeCsv(stats.members.growth)}%\n`;
        break;

      case 'financial':
        csvContent += `FINANCIAL REPORT\n`;
        csvContent += `Generated On,${escapeCsv(formattedDate)}\n\n`;

        csvContent += `SUMMARY STATISTICS\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `This Month Total,${escapeCsv(stats.offerings.thisMonth.total)}\n`;
        csvContent += `This Month Count,${escapeCsv(stats.offerings.thisMonth.count)}\n`;
        csvContent += `Last Month Total,${escapeCsv(stats.offerings.lastMonth.total)}\n`;
        csvContent += `Growth Rate,${escapeCsv(stats.offerings.growth)}%\n\n`;

        csvContent += `OFFERINGS BREAKDOWN\n`;
        csvContent += `Category,Amount (ZAR),Count\n`;
        stats.offerings.byType.forEach(item => {
          csvContent += `${escapeCsv(item.type)},${escapeCsv(item.total)},${escapeCsv(item.count)}\n`;
        });
        break;

      case 'attendance':
        // Note: Currently using prayer request data for attendance report
        csvContent += `ATTENDANCE REPORT (PRAYER REQUESTS)\n`;
        csvContent += `Generated On,${escapeCsv(formattedDate)}\n\n`;

        csvContent += `SUMMARY STATISTICS\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `Total Requests,${escapeCsv(stats.prayerRequests.total)}\n`;
        csvContent += `Pending Requests,${escapeCsv(stats.prayerRequests.pending)}\n`;
        csvContent += `Answered Requests,${escapeCsv(stats.prayerRequests.answered)}\n`;
        break;

      case 'engagement':
        csvContent += `ENGAGEMENT REPORT\n`;
        csvContent += `Generated On,${escapeCsv(formattedDate)}\n\n`;
        
        csvContent += `LEAD STATISTICS\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `Total Leads,${escapeCsv(stats.leads.total)}\n`;
        csvContent += `New Leads,${escapeCsv(stats.leads.new)}\n`;
        csvContent += `Converted,${escapeCsv(stats.leads.converted)}\n`;
        csvContent += `Pending,${escapeCsv(stats.leads.pending)}\n`;
        csvContent += `Conversion Rate,${escapeCsv(stats.leads.conversionRate)}%\n\n`;
        
        csvContent += `LEADS BY SOURCE\n`;
        csvContent += `Source,Count\n`;
        stats.leads.bySource.forEach(item => {
          csvContent += `${escapeCsv(item.source)},${escapeCsv(item.count)}\n`;
        });
        csvContent += `\n`;

        csvContent += `CALL CENTER ACTIVITY\n`;
        csvContent += `Metric,Value\n`;
        csvContent += `Calls This Month,${escapeCsv(stats.callCenter.callsThisMonth)}\n`;
        csvContent += `Calls Last Month,${escapeCsv(stats.callCenter.callsLastMonth)}\n`;
        csvContent += `Growth,${escapeCsv(stats.callCenter.growth)}%\n`;
        break;
    }
    
    // Add BOM for Excel compatibility with UTF-8
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${selectedReport}-report-${date.toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
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
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">
            View and export reports and analytics
            {stats?.generatedAt && (
              <span className="ml-2 text-xs">
                · Last updated: {new Date(stats.generatedAt).toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
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
            {statsLoading ? (
              <div className="h-8 w-20 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.members.total ?? 0}</div>
                <div className="flex items-center gap-1 text-xs">
                  {stats?.members.growth !== undefined && stats.members.growth !== 0 && (
                    <>
                      {stats.members.growth >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={cn(
                        stats.members.growth >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {formatGrowth(stats.members.growth).text}
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground">
                    {stats?.members.active ?? 0} active · {stats?.members.newThisMonth ?? 0} new this month
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month's Offerings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(stats?.offerings.thisMonth.total ?? '0')}
                </div>
                <div className="flex items-center gap-1 text-xs">
                  {stats?.offerings.growth !== undefined && stats.offerings.growth !== 0 && (
                    <>
                      {stats.offerings.growth >= 0 ? (
                        <TrendingUp className="h-3 w-3 text-success" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-destructive" />
                      )}
                      <span className={cn(
                        stats.offerings.growth >= 0 ? 'text-success' : 'text-destructive'
                      )}>
                        {formatGrowth(stats.offerings.growth).text}
                      </span>
                    </>
                  )}
                  <span className="text-muted-foreground">
                    {stats?.offerings.thisMonth.count ?? 0} offerings
                  </span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prayer Requests</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.prayerRequests.total ?? 0}</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.prayerRequests.pending ?? 0} pending · {stats?.prayerRequests.answered ?? 0} answered
                </p>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lead Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats?.leads.conversionRate ?? 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {stats?.leads.converted ?? 0} converted of {stats?.leads.total ?? 0} total leads
                </p>
              </>
            )}
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
            {reportTypes.map((report) => {
              const isSelected = selectedReport === report.id;
              return (
                <div
                  key={report.id}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-lg border transition-colors cursor-pointer",
                    isSelected 
                      ? "border-primary bg-primary/5" 
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  )}
                  onClick={() => handleGenerateReport(report.id)}
                >
                  <div className={`p-3 rounded-lg ${report.color}`}>
                    <report.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{report.name}</h3>
                      {isSelected ? (
                        <Badge className="bg-primary text-primary-foreground">Active</Badge>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {report.description}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <Button 
                        size="sm" 
                        variant={isSelected ? "default" : "outline"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateReport(report.id);
                        }}
                        disabled={isGenerating || statsLoading}
                      >
                        {isGenerating && selectedReport === report.id ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <FileText className="h-4 w-4 mr-2" />
                        )}
                        {isSelected ? 'Refresh' : 'Generate'}
                      </Button>
                      {isSelected && (
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExportCSV();
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Generated Report Display */}
      {selectedReport && stats && (
        <Card ref={reportRef} className="print:shadow-none">
          <CardHeader className="flex flex-row items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {reportTypes.find(r => r.id === selectedReport)?.icon && (
                  (() => {
                    const ReportIcon = reportTypes.find(r => r.id === selectedReport)!.icon;
                    return <ReportIcon className="h-5 w-5" />;
                  })()
                )}
                {reportTypes.find(r => r.id === selectedReport)?.name}
              </CardTitle>
              <CardDescription>
                Generated on {formatDate(new Date())} · {getCurrentMonthName()}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedReport(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Membership Report */}
            {selectedReport === 'membership' && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg border bg-info/10">
                    <div className="flex items-center gap-2 text-info mb-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Members</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.members.total}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-success/10">
                    <div className="flex items-center gap-2 text-success mb-2">
                      <UserCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Active Members</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.members.active}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stats.members.total > 0 
                        ? `${((stats.members.active / stats.members.total) * 100).toFixed(1)}% of total`
                        : '0% of total'
                      }
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border bg-primary/10">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="text-sm font-medium">New This Month</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.members.newThisMonth}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-900/20">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                      {stats.members.growth >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">Growth Rate</span>
                    </div>
                    <p className={cn(
                      "text-3xl font-bold",
                      stats.members.growth >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {formatGrowth(stats.members.growth).text}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">vs. last month</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-4">Member Status Distribution</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active</span>
                      <span className="font-medium">{stats.members.active}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-success rounded-full"
                        style={{ width: `${stats.members.total > 0 ? (stats.members.active / stats.members.total) * 100 : 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Inactive</span>
                      <span className="font-medium">{stats.members.total - stats.members.active}</span>
                    </div>
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-muted-foreground rounded-full"
                        style={{ width: `${stats.members.total > 0 ? ((stats.members.total - stats.members.active) / stats.members.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Financial Report */}
            {selectedReport === 'financial' && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-lg border bg-success/10">
                    <div className="flex items-center gap-2 text-success mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">This Month</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.offerings.thisMonth.total)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.offerings.thisMonth.count} offerings</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-muted">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <DollarSign className="h-4 w-4" />
                      <span className="text-sm font-medium">Last Month</span>
                    </div>
                    <p className="text-2xl font-bold">{formatCurrency(stats.offerings.lastMonth.total)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stats.offerings.lastMonth.count} offerings</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-info/10">
                    <div className="flex items-center gap-2 text-info mb-2">
                      {stats.offerings.growth >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-sm font-medium">Growth</span>
                    </div>
                    <p className={cn(
                      "text-2xl font-bold",
                      stats.offerings.growth >= 0 ? 'text-success' : 'text-destructive'
                    )}>
                      {formatGrowth(stats.offerings.growth).text}
                    </p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-4">Offerings by Category</h4>
                  {stats.offerings.byType.length > 0 ? (
                    <div className="space-y-4">
                      {stats.offerings.byType.map((item) => {
                        const percentage = parseFloat(stats.offerings.thisMonth.total) > 0
                          ? (parseFloat(item.total) / parseFloat(stats.offerings.thisMonth.total)) * 100
                          : 0;
                        return (
                          <div key={item.type} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize">
                                  {item.type.toLowerCase().replace('_', ' ')}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  ({item.count} offering{item.count !== 1 ? 's' : ''})
                                </span>
                              </div>
                              <span className="font-medium">{formatCurrency(item.total)}</span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-success rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground text-right">{percentage.toFixed(1)}% of total</p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No offerings recorded this month</p>
                  )}
                </div>
              </>
            )}

            {/* Attendance/Prayer Report */}
            {selectedReport === 'attendance' && (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="p-4 rounded-lg border bg-primary/10">
                    <div className="flex items-center gap-2 text-primary mb-2">
                      <Activity className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Requests</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.prayerRequests.total}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-warning/10">
                    <div className="flex items-center gap-2 text-warning mb-2">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Pending</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.prayerRequests.pending}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-success/10">
                    <div className="flex items-center gap-2 text-success mb-2">
                      <UserCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Answered</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.prayerRequests.answered}</p>
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium mb-4">Prayer Request Status Distribution</h4>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Pending</span>
                        <span className="font-medium">{stats.prayerRequests.pending}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-warning rounded-full"
                          style={{ width: `${stats.prayerRequests.total > 0 ? (stats.prayerRequests.pending / stats.prayerRequests.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Answered</span>
                        <span className="font-medium">{stats.prayerRequests.answered}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full"
                          style={{ width: `${stats.prayerRequests.total > 0 ? (stats.prayerRequests.answered / stats.prayerRequests.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">Other</span>
                        <span className="font-medium">{stats.prayerRequests.total - stats.prayerRequests.pending - stats.prayerRequests.answered}</span>
                      </div>
                      <div className="h-3 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-muted-foreground rounded-full"
                          style={{ width: `${stats.prayerRequests.total > 0 ? ((stats.prayerRequests.total - stats.prayerRequests.pending - stats.prayerRequests.answered) / stats.prayerRequests.total) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Engagement Report */}
            {selectedReport === 'engagement' && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg border bg-info/10">
                    <div className="flex items-center gap-2 text-info mb-2">
                      <Users className="h-4 w-4" />
                      <span className="text-sm font-medium">Total Leads</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.leads.total}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-warning/10">
                    <div className="flex items-center gap-2 text-warning mb-2">
                      <UserPlus className="h-4 w-4" />
                      <span className="text-sm font-medium">New Leads</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.leads.new}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-success/10">
                    <div className="flex items-center gap-2 text-success mb-2">
                      <UserCheck className="h-4 w-4" />
                      <span className="text-sm font-medium">Converted</span>
                    </div>
                    <p className="text-3xl font-bold">{stats.leads.converted}</p>
                  </div>
                  <div className="p-4 rounded-lg border bg-orange-50 dark:bg-orange-900/20">
                    <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 mb-2">
                      <PieChart className="h-4 w-4" />
                      <span className="text-sm font-medium">Conversion Rate</span>
                    </div>
                    <p className="text-3xl font-bold text-success">{stats.leads.conversionRate}%</p>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="font-medium mb-4">Lead Sources</h4>
                    {stats.leads.bySource.length > 0 ? (
                      <div className="space-y-3">
                        {stats.leads.bySource.map((item) => {
                          const percentage = stats.leads.total > 0
                            ? (item.count / stats.leads.total) * 100
                            : 0;
                          return (
                            <div key={item.source} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <Badge variant="outline" className="capitalize">
                                  {item.source.toLowerCase().replace('_', ' ')}
                                </Badge>
                                <span className="font-medium">{item.count}</span>
                              </div>
                              <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-info rounded-full"
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-muted-foreground text-center py-4">No leads recorded</p>
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium mb-4">Call Center Activity</h4>
                    <div className="space-y-4">
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Calls This Month</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.callCenter.callsThisMonth}</p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">Calls Last Month</span>
                        </div>
                        <p className="text-2xl font-bold">{stats.callCenter.callsLastMonth}</p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                          {stats.callCenter.growth >= 0 ? (
                            <TrendingUp className="h-4 w-4 text-success" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-destructive" />
                          )}
                          <span className="text-sm font-medium">Growth</span>
                        </div>
                        <p className={cn(
                          "text-2xl font-bold",
                          stats.callCenter.growth >= 0 ? 'text-success' : 'text-destructive'
                        )}>
                          {formatGrowth(stats.callCenter.growth).text}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Data Breakdown Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Offerings by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Offerings by Type
            </CardTitle>
            <CardDescription>
              Breakdown of offerings this month by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-4 w-16 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : stats?.offerings.byType && stats.offerings.byType.length > 0 ? (
              <div className="space-y-3">
                {stats.offerings.byType.map((item) => {
                  const percentage = stats.offerings.thisMonth.count > 0 
                    ? (item.count / stats.offerings.thisMonth.count) * 100 
                    : 0;
                  return (
                    <div key={item.type} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="capitalize">
                            {item.type.toLowerCase().replace('_', ' ')}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            ({item.count} offering{item.count !== 1 ? 's' : ''})
                          </span>
                        </div>
                        <span className="font-medium">{formatCurrency(item.total)}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-success rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t mt-4">
                  <div className="flex items-center justify-between font-medium">
                    <span>Total This Month</span>
                    <span className="text-lg">{formatCurrency(stats.offerings.thisMonth.total)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <DollarSign className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No offerings recorded this month</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leads by Source */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-info" />
              Leads by Source
            </CardTitle>
            <CardDescription>
              Where your leads are coming from
            </CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg border animate-pulse">
                    <div className="h-4 w-24 bg-muted rounded" />
                    <div className="h-4 w-8 bg-muted rounded" />
                  </div>
                ))}
              </div>
            ) : stats?.leads.bySource && stats.leads.bySource.length > 0 ? (
              <div className="space-y-3">
                {stats.leads.bySource.map((item) => {
                  const percentage = stats.leads.total > 0 
                    ? (item.count / stats.leads.total) * 100 
                    : 0;
                  return (
                    <div key={item.source} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="capitalize">
                          {item.source.toLowerCase().replace('_', ' ')}
                        </Badge>
                        <span className="font-medium">{item.count} lead{item.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-info rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(percentage, 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-3 border-t mt-4">
                  <div className="flex items-center justify-between font-medium">
                    <span>Total Leads</span>
                    <span className="text-lg">{stats.leads.total}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mt-1">
                    <span>Conversion Rate</span>
                    <span className="text-success font-medium">{stats.leads.conversionRate}%</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No leads recorded yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Call Center Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Call Center Activity
          </CardTitle>
          <CardDescription>
            Call center performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          {statsLoading ? (
            <div className="grid gap-4 md:grid-cols-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="p-4 rounded-lg border animate-pulse">
                  <div className="h-4 w-24 bg-muted rounded mb-2" />
                  <div className="h-8 w-16 bg-muted rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">Calls This Month</p>
                <p className="text-2xl font-bold mt-1">{stats?.callCenter.callsThisMonth ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">Calls Last Month</p>
                <p className="text-2xl font-bold mt-1">{stats?.callCenter.callsLastMonth ?? 0}</p>
              </div>
              <div className="p-4 rounded-lg border bg-muted/30">
                <p className="text-sm text-muted-foreground">Growth</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className={cn(
                    "text-2xl font-bold",
                    (stats?.callCenter.growth ?? 0) >= 0 ? 'text-success' : 'text-destructive'
                  )}>
                    {formatGrowth(stats?.callCenter.growth ?? 0).text}
                  </p>
                  {(stats?.callCenter.growth ?? 0) >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-success" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-destructive" />
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
