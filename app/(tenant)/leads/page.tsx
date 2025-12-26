/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEADS LIST PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, UserCheck } from 'lucide-react';
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
import { useLeads, useDeleteLead, useConvertLead } from '@/lib/client';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  CONTACTED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  INTERESTED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  NOT_INTERESTED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  CONVERTED: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
};

const sourceColors: Record<string, string> = {
  FACEBOOK: 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  TV_PROGRAM: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
  REFERRAL: 'bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300',
  WALK_IN: 'bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300',
  WEBSITE: 'bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300',
  OTHER: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
};

export default function LeadsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [source, setSource] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useLeads({
    search: search || undefined,
    status: status || undefined,
    source: source || undefined,
    page,
    limit: 20,
  });

  const deleteLead = useDeleteLead();

  const leads = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leads</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track and convert potential members
          </p>
        </div>
        <Link href="/leads/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Lead
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
                placeholder="Search leads..."
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
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="INTERESTED">Interested</option>
              <option value="NOT_INTERESTED">Not Interested</option>
              <option value="CONVERTED">Converted</option>
            </select>
            <select 
              value={source} 
              onChange={(e) => {
                setSource(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Sources</option>
              <option value="FACEBOOK">Facebook</option>
              <option value="TV_PROGRAM">TV Program</option>
              <option value="REFERRAL">Referral</option>
              <option value="WALK_IN">Walk In</option>
              <option value="WEBSITE">Website</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {meta ? `${meta.total} Leads` : 'Leads'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No leads found</p>
              <Link href="/leads/new" className="mt-4 inline-block">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first lead
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Contact</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Source</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Created</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <LeadRow 
                      key={lead.id} 
                      lead={lead} 
                      onDelete={() => deleteLead.mutate(lead.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
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
        </CardContent>
      </Card>
    </div>
  );
}

function LeadRow({ lead, onDelete }: { lead: any; onDelete: () => void }) {
  const convertLead = useConvertLead(lead.id);

  return (
    <tr className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
      <td className="py-3 px-4">
        <div>
          <p className="font-medium text-gray-900 dark:text-white">
            {lead.firstName} {lead.lastName}
          </p>
          {lead.email && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {lead.email}
            </p>
          )}
        </div>
      </td>
      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
        {lead.phone}
      </td>
      <td className="py-3 px-4">
        <Badge className={cn('font-medium', sourceColors[lead.source])}>
          {lead.source.replace('_', ' ')}
        </Badge>
      </td>
      <td className="py-3 px-4">
        <Badge className={cn('font-medium', statusColors[lead.status])}>
          {lead.status.replace('_', ' ')}
        </Badge>
      </td>
      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
        {new Date(lead.createdAt).toLocaleDateString()}
      </td>
      <td className="py-3 px-4 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.location.href = `/leads/${lead.id}`}>
              <Eye className="h-4 w-4 mr-2" />
              View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.location.href = `/leads/${lead.id}/edit`}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            {lead.status !== 'CONVERTED' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    if (confirm('Convert this lead to a member?')) {
                      convertLead.mutate({});
                    }
                  }}
                  className="text-green-600 dark:text-green-400"
                >
                  <UserCheck className="h-4 w-4 mr-2" />
                  Convert to Member
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                if (confirm('Are you sure you want to delete this lead?')) {
                  onDelete();
                }
              }}
              className="text-red-600 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </td>
    </tr>
  );
}
