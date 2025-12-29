/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT DETAIL PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Mail,
  Phone,
  Globe,
  MapPin,
  Calendar,
  Users,
  UserCircle,
  GitBranch,
  Pencil,
  Trash2,
  ExternalLink,
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { useTenant, useDeleteTenant, useTenantMembers } from '@/lib/client';
import { cn } from '@/lib/utils';

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  // State for members filters
  const [membersPage, setMembersPage] = useState(1);
  const [membersSearch, setMembersSearch] = useState('');

  const { data: tenant, isLoading, error } = useTenant(id);
  const { data: membersData, isLoading: membersLoading } = useTenantMembers(id, {
    page: membersPage,
    pageSize: 10,
    search: membersSearch || undefined,
  });
  const deleteTenant = useDeleteTenant();

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${tenant?.name}? This action cannot be undone.`)) {
      deleteTenant.mutate(id, {
        onSuccess: () => {
          router.push('/super-admin/tenants');
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse" /></Card>
          </div>
          <div>
            <Card><CardContent className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse" /></Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="space-y-6">
        <Link href="/super-admin/tenants" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Tenant Not Found
            </h2>
            <p className="text-gray-500 dark:text-gray-400">
              The tenant you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/super-admin/tenants" className="mt-4 inline-block">
              <Button>Return to Tenants</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Link href="/super-admin/tenants" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Tenants
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-12 w-12 object-contain rounded" />
              ) : (
                <Building2 className="h-8 w-8 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{tenant.name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{tenant.slug}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn(
                  tenant.isActive 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                )}>
                  {tenant.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {tenant.isHQ && (
                  <Badge variant="outline" className="border-blue-500 text-blue-600">
                    HQ
                  </Badge>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => window.open(`https://${tenant.slug}.yourdomain.com`, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Visit Portal
            </Button>
            <Link href={`/super-admin/tenants/${id}/edit`}>
              <Button variant="outline">
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </Link>
            <Button 
              variant="outline" 
              onClick={handleDelete}
              disabled={deleteTenant.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          {tenant.description && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 dark:text-gray-300">{tenant.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenant.email && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Mail className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Email</p>
                    <a href={`mailto:${tenant.email}`} className="text-blue-600 hover:underline">
                      {tenant.email}
                    </a>
                  </div>
                </div>
              )}
              
              {tenant.phone && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Phone className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Phone</p>
                    <a href={`tel:${tenant.phone}`} className="text-blue-600 hover:underline">
                      {tenant.phone}
                    </a>
                  </div>
                </div>
              )}
              
              {tenant.website && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Website</p>
                    <a href={tenant.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                      {tenant.website}
                    </a>
                  </div>
                </div>
              )}

              {!tenant.email && !tenant.phone && !tenant.website && (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No contact information provided</p>
              )}
            </CardContent>
          </Card>

          {/* Location */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Location</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-gray-500" />
                </div>
                <div>
                  {tenant.address && <p className="text-gray-900 dark:text-white">{tenant.address}</p>}
                  <p className="text-gray-600 dark:text-gray-300">
                    {[tenant.city, tenant.state, tenant.country].filter(Boolean).join(', ') || 'No location provided'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{tenant.timezone || 'UTC'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Branches */}
          {tenant.branches && tenant.branches.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Branches ({tenant.branches.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenant.branches.map((branch) => (
                    <Link 
                      key={branch.id}
                      href={`/super-admin/tenants/${branch.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{branch.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{branch.slug}</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        branch.isActive 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      )}>
                        {branch.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  Members ({membersData?.meta?.total ?? tenant._count?.members ?? 0})
                </CardTitle>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search members..."
                  value={membersSearch}
                  onChange={(e) => {
                    setMembersSearch(e.target.value);
                    setMembersPage(1);
                  }}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border dark:border-gray-800 animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded" />
                        <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : membersData?.data && membersData.data.length > 0 ? (
                <>
                  <div className="space-y-3">
                    {membersData.data.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                            {member.photo ? (
                              <img src={member.photo} alt={`${member.firstName} ${member.lastName}`} className="h-full w-full object-cover" />
                            ) : (
                              <UserCircle className="h-6 w-6 text-gray-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {member.firstName} {member.lastName}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                              {member.email && <span>{member.email}</span>}
                              {member.email && member.phone && <span>•</span>}
                              {member.phone && <span>{member.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.membershipId && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                              {member.membershipId}
                            </span>
                          )}
                          <Badge className={cn(
                            member.status === 'ACTIVE'
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                              : member.status === 'INACTIVE'
                              ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          )}>
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {membersData.meta && membersData.meta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t dark:border-gray-800">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Page {membersData.meta.page} of {membersData.meta.totalPages}
                      </p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMembersPage((p) => Math.max(1, p - 1))}
                          disabled={!membersData.meta.hasPrevPage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setMembersPage((p) => p + 1)}
                          disabled={!membersData.meta.hasNextPage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500 dark:text-gray-400">
                    {membersSearch ? 'No members found matching your search' : 'No members in this tenant yet'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Stats & Meta */}
        <div className="space-y-6">
          {/* Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <UserCircle className="h-5 w-5 text-blue-500" />
                  <span className="text-gray-600 dark:text-gray-300">Members</span>
                </div>
                <span className="text-xl font-semibold">{tenant._count?.members ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-green-500" />
                  <span className="text-gray-600 dark:text-gray-300">Users</span>
                </div>
                <span className="text-xl font-semibold">{tenant._count?.users ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-purple-500" />
                  <span className="text-gray-600 dark:text-gray-300">Branches</span>
                </div>
                <span className="text-xl font-semibold">{tenant._count?.branches ?? 0}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-gray-600 dark:text-gray-300">Total Offerings</span>
                </div>
                <span className="text-xl font-semibold text-green-600 dark:text-green-400">
                  ${parseFloat(tenant.totalOfferings ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {tenant.thisMonthOfferings && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <div>
                      <span className="text-gray-600 dark:text-gray-300">This Month</span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {tenant.thisMonthOfferings.count} offering{tenant.thisMonthOfferings.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    ${parseFloat(tenant.thisMonthOfferings.total ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Parent Tenant */}
          {tenant.parent && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Parent Organization</CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  href={`/super-admin/tenants/${tenant.parent.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg border dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                >
                  <Building2 className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{tenant.parent.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{tenant.parent.slug}</p>
                  </div>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Tenant ID</p>
                <p className="font-mono text-sm text-gray-900 dark:text-white break-all">{tenant.id}</p>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Created</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(tenant.createdAt)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Last Updated</p>
                  <p className="text-gray-900 dark:text-white">{formatDate(tenant.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
