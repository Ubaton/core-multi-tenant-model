/**
 * ════════════════════════════════════════════════════════════════════════════
 * USERS MANAGEMENT PAGE (Super Admin)
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
  User,
  Shield,
  UserCog,
  Users as UsersIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUsers, useDeleteUser } from '@/lib/client';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  CHURCH_ADMIN: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  STAFF: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  CALL_CENTER: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  SUBSCRIBER: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
  MEMBER: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
};

const roleIcons: Record<string, React.ElementType> = {
  SUPER_ADMIN: Shield,
  CHURCH_ADMIN: UserCog,
  STAFF: User,
  CALL_CENTER: User,
  SUBSCRIBER: UsersIcon,
  MEMBER: UsersIcon,
};

export default function UsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useUsers({
    search: search || undefined,
    role: role || undefined,
    page,
    limit: 20,
  });

  const deleteUser = useDeleteUser();

  const users = data?.data ?? [];
  const meta = data?.meta;

  const handleDelete = async (id: string, email: string) => {
    if (confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) {
      deleteUser.mutate(id, {
        onSuccess: () => toast.success('User deleted successfully'),
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete user'),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Users</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage all system users across all tenants
          </p>
        </div>
        <Link href="/super-admin/users/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
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
                placeholder="Search users by name or email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <select
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="CHURCH_ADMIN">Church Admin</option>
              <option value="STAFF">Staff</option>
              <option value="CALL_CENTER">Call Center</option>
              <option value="SUBSCRIBER">Subscriber</option>
              <option value="MEMBER">Member</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800/50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="relative px-6 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex items-center justify-center">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                      </div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <User className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                        No users found
                      </h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {search || role ? 'Try adjusting your filters' : 'Get started by adding a new user'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.map((user) => {
                    const RoleIcon = roleIcons[user.role] || User;
                    return (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-10 w-10 shrink-0">
                              {user.avatar ? (
                                <img
                                  className="h-10 w-10 rounded-full object-cover"
                                  src={user.avatar}
                                  alt=""
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                                  <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                                </div>
                              )}
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={cn('gap-1', roleColors[user.role])}>
                            <RoleIcon className="h-3 w-3" />
                            {user.role.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {user.tenant ? (
                            <span className="text-sm text-gray-900 dark:text-white">
                              {user.tenant.name}
                            </span>
                          ) : (
                            <span className="text-sm text-gray-400 italic">
                              No tenant (Global)
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge
                            className={cn(
                              user.isActive
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                            )}
                          >
                            {user.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                          {user.lastLoginAt
                            ? new Date(user.lastLoginAt).toLocaleDateString()
                            : 'Never'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <DropdownMenu>
                            <DropdownMenuTrigger className="inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800">
                              <MoreHorizontal className="h-5 w-5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuGroup>
                                <DropdownMenuItem>
                                  <Link
                                    href={`/super-admin/users/${user.id}`}
                                    className="flex items-center w-full"
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Link
                                    href={`/super-admin/users/${user.id}/edit`}
                                    className="flex items-center w-full"
                                  >
                                    <Pencil className="mr-2 h-4 w-4" />
                                    Edit
                                  </Link>
                                </DropdownMenuItem>
                              </DropdownMenuGroup>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(user.id, user.email)}
                                className="text-red-600 dark:text-red-400"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-6 py-3">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Showing {(page - 1) * (meta.pageSize || 20) + 1} to{' '}
                {Math.min(page * (meta.pageSize || 20), meta.total)} of {meta.total} users
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= meta.totalPages}
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
