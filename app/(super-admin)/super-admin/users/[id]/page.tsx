/**
 * ════════════════════════════════════════════════════════════════════════════
 * USER DETAIL PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield,
  Calendar,
  Clock,
  Pencil,
  UserCog,
  PhoneCall,
  Users,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUser } from '@/lib/client';
import { cn } from '@/lib/utils';

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
  CALL_CENTER: PhoneCall,
  SUBSCRIBER: Users,
  MEMBER: Users,
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function UserDetailPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: user, isLoading, error } = useUser(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Not Found</h1>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium">User not found</h3>
            <p className="mt-2 text-muted-foreground">
              The user you&apos;re looking for doesn&apos;t exist or has been deleted.
            </p>
            <Link href="/super-admin/users" className="mt-4 inline-block">
              <Button>Back to Users</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const RoleIcon = roleIcons[user.role] || User;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/super-admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
          </div>
        </div>
        <Link href={`/super-admin/users/${id}/edit`}>
          <Button>
            <Pencil className="h-4 w-4 mr-2" />
            Edit User
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar */}
            <div className="flex justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={`${user.firstName} ${user.lastName}`}
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-500 dark:text-gray-400" />
                </div>
              )}
            </div>

            {/* Status Badges */}
            <div className="flex flex-wrap justify-center gap-2">
              <Badge className={cn('gap-1', roleColors[user.role])}>
                <RoleIcon className="h-3 w-3" />
                {user.role.replace('_', ' ')}
              </Badge>
              <Badge
                className={cn(
                  user.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                )}
              >
                {user.isActive ? 'Active' : 'Inactive'}
              </Badge>
              {user.emailVerified && (
                <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                  Verified
                </Badge>
              )}
            </div>

            {/* Contact Info */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.tenant && (
                <div className="flex items-center gap-3 text-sm">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span>{user.tenant.name}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Details Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>User Details</CardTitle>
            <CardDescription>Complete information about this user</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">First Name</dt>
                <dd className="text-sm">{user.firstName}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Last Name</dt>
                <dd className="text-sm">{user.lastName}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Email</dt>
                <dd className="text-sm">{user.email}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Phone</dt>
                <dd className="text-sm">{user.phone || 'Not provided'}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Role</dt>
                <dd className="text-sm">
                  <Badge className={cn('gap-1', roleColors[user.role])}>
                    {user.role.replace('_', ' ')}
                  </Badge>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm">
                  <Badge
                    className={cn(
                      user.isActive
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                    )}
                  >
                    {user.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Tenant/Organization</dt>
                <dd className="text-sm">
                  {user.tenant ? (
                    <Link
                      href={`/super-admin/tenants/${user.tenant.id}`}
                      className="text-primary hover:underline"
                    >
                      {user.tenant.name}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground italic">Global (No tenant)</span>
                  )}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Email Verified</dt>
                <dd className="text-sm">{user.emailVerified ? 'Yes' : 'No'}</dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Last Login</dt>
                <dd className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : 'Never'}
                </dd>
              </div>
              <div className="space-y-1">
                <dt className="text-sm font-medium text-muted-foreground">Created At</dt>
                <dd className="text-sm flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  {new Date(user.createdAt).toLocaleString()}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        {/* Activity Stats */}
        {user._count && (
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Activity Statistics</CardTitle>
              <CardDescription>User activity across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <PhoneCall className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{user._count.callLogs}</p>
                  <p className="text-sm text-muted-foreground">Call Logs</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <Users className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{user._count.assignedLeads}</p>
                  <p className="text-sm text-muted-foreground">Assigned Leads</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                  <p className="text-2xl font-bold">{user._count.sentCommunications}</p>
                  <p className="text-sm text-muted-foreground">Communications Sent</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
