/**
 * ════════════════════════════════════════════════════════════════════════════
 * OFFERINGS LIST PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { Plus, Search, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOfferings, useModulePermissions } from '@/lib/client';
import { cn } from '@/lib/utils';
import { RequireCreate, AccessDenied } from '@/components/permission-gate';

const typeColors: Record<string, string> = {
  TITHE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  OFFERING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  FIRST_FRUIT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  THANKSGIVING: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  SEED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  DONATION: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export default function OfferingsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [page, setPage] = useState(1);
  const { canView, isLoading: permissionsLoading } = useModulePermissions();

  const { data, isLoading } = useOfferings({
    search: search || undefined,
    type: type || undefined,
    page,
    limit: 20,
  });

  const offerings = data?.offerings ?? [];
  const summary = data?.summary;
  const meta = data?.meta;

  // Check for view permission
  if (!permissionsLoading && !canView('offerings')) {
    return <AccessDenied message="You do not have permission to view offerings." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offerings</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track and manage church offerings
          </p>
        </div>
        <RequireCreate module="offerings">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Record Offering
          </Button>
        </RequireCreate>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrency(summary.totalAmount) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.count ?? 0} offerings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Amount
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrency(summary.averageAmount) : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">per offering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Period
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.count ?? 0}</div>
            <p className="text-xs text-muted-foreground">total offerings</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name or reference..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select 
              value={type} 
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="TITHE">Tithe</option>
              <option value="OFFERING">Offering</option>
              <option value="FIRST_FRUIT">First Fruit</option>
              <option value="THANKSGIVING">Thanksgiving</option>
              <option value="SEED">Seed</option>
              <option value="DONATION">Donation</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Offerings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Offerings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : offerings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No offerings found</p>
              <Button variant="outline" className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Record your first offering
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Giver</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.map((offering) => (
                    <tr key={offering.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {offering.member 
                              ? `${offering.member.firstName} ${offering.member.lastName}`
                              : offering.giverName || 'Anonymous'
                            }
                          </p>
                          {offering.giverPhone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {offering.giverPhone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={cn('font-medium', typeColors[offering.type])}>
                          {offering.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {formatCurrency(offering.amount)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {new Date(offering.givenAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {offering.reference || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasPrevPage}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!meta.hasNextPage}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
