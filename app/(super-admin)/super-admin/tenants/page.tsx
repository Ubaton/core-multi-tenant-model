/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANTS MANAGEMENT PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Trash2, 
  Building2,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTenants, useDeleteTenant } from '@/lib/client';
import { cn } from '@/lib/utils';

export default function TenantsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useTenants({
    search: search || undefined,
    isActive: status === 'active' ? true : status === 'inactive' ? false : undefined,
    page,
    limit: 20,
  });

  const deleteTenant = useDeleteTenant();

  const tenants = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tenants</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage all church organizations on the platform
          </p>
        </div>
        <Link href="/super-admin/tenants/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search tenants..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select 
              value={status} 
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Grid */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : tenants.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No tenants found</p>
            <Link href="/super-admin/tenants/new" className="mt-4 inline-block">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Create your first tenant
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => (
            <Card key={tenant.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{tenant.name}</CardTitle>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {tenant.slug}
                      </p>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => window.location.href = `/super-admin/tenants/${tenant.id}`}>
                        <Eye className="h-4 w-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.location.href = `/super-admin/tenants/${tenant.id}/edit`}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => window.open(`https://${tenant.slug}.yourdomain.com`, '_blank')}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Visit Portal
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete ${tenant.name}? This action cannot be undone.`)) {
                            deleteTenant.mutate(tenant.id);
                          }
                        }}
                        className="text-red-600 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge className={cn(
                      tenant.isActive 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    )}>
                      {tenant.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    {tenant.isHQ && (
                      <Badge variant="outline">HQ</Badge>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 pt-3 border-t dark:border-gray-800">
                    <div className="text-center">
                      <p className="text-lg font-semibold">{tenant._count?.members ?? 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Members</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{tenant._count?.users ?? 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Users</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold">{tenant._count?.branches ?? 0}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Branches</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        ${parseFloat(tenant.totalOfferings ?? '0').toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Offerings</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Page {meta.page} of {meta.totalPages}
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
    </div>
  );
}
