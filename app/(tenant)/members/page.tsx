/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBERS LIST PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useMembers, useDeleteMember } from '@/lib/client';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  INACTIVE: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  TRANSFERRED: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  DECEASED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function MembersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useMembers({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  const deleteMember = useDeleteMember();

  const members = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Members</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage your church members
          </p>
        </div>
        <Link href="/members/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Member
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
                placeholder="Search members..."
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
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="TRANSFERRED">Transferred</option>
              <option value="DECEASED">Deceased</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {meta ? `${meta.total} Members` : 'Members'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No members found</p>
              <Link href="/members/new" className="mt-4 inline-block">
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add your first member
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
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Join Date</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {member.firstName} {member.lastName}
                          </p>
                          {member.email && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {member.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {member.phone}
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={cn('font-medium', statusColors[member.status])}>
                          {member.status}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {new Date(member.joinDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => window.location.href = `/members/${member.id}`}>
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.location.href = `/members/${member.id}/edit`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this member?')) {
                                  deleteMember.mutate(member.id);
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
