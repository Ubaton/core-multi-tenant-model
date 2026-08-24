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
import { toast } from 'sonner';

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
          toast.success('Tenant deleted successfully');
          router.push('/super-admin/tenants');
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : 'Failed to delete tenant'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 bg-muted rounded-lg animate-pulse" />
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Card><CardContent className="h-64 bg-muted animate-pulse" /></Card>
          </div>
          <div>
            <Card><CardContent className="h-48 bg-muted animate-pulse" /></Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="space-y-6">
        <Link href="/super-admin/tenants" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Churches
        </Link>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Tenant Not Found
            </h2>
            <p className="text-muted-foreground">
              The tenant you're looking for doesn't exist or you don't have access to it.
            </p>
            <Link href="/super-admin/tenants" className="mt-4 inline-block">
              <Button>Return to Churches</Button>
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
        <Link href="/super-admin/tenants" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Churches
        </Link>
        
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-xl bg-muted flex items-center justify-center">
              {tenant.logo ? (
                <img src={tenant.logo} alt={tenant.name} className="h-12 w-12 object-contain rounded" />
              ) : (
                <Building2 className="h-8 w-8 text-muted-foreground" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{tenant.name}</h1>
              <p className="text-muted-foreground">{tenant.slug}</p>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn(
                  tenant.isActive 
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground'
                )}>
                  {tenant.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {tenant.isHQ && (
                  <Badge variant="outline" className="border-info text-info">
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
              className="text-destructive hover:text-destructive hover:bg-destructive/10 dark:text-destructive"
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
                <p className="text-muted-foreground">{tenant.description}</p>
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
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a href={`mailto:${tenant.email}`} className="text-info hover:underline">
                      {tenant.email}
                    </a>
                  </div>
                </div>
              )}
              
              {tenant.phone && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Phone className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Phone</p>
                    <a href={`tel:${tenant.phone}`} className="text-info hover:underline">
                      {tenant.phone}
                    </a>
                  </div>
                </div>
              )}
              
              {tenant.website && (
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Website</p>
                    <a href={tenant.website} target="_blank" rel="noopener noreferrer" className="text-info hover:underline">
                      {tenant.website}
                    </a>
                  </div>
                </div>
              )}

              {!tenant.email && !tenant.phone && !tenant.website && (
                <p className="text-muted-foreground text-sm">No contact information provided</p>
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
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  {tenant.address && <p className="text-foreground">{tenant.address}</p>}
                  <p className="text-muted-foreground">
                    {[tenant.city, tenant.state, tenant.postalCode, tenant.country].filter(Boolean).join(', ') || 'No location provided'}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
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
                      className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <GitBranch className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <p className="font-medium text-foreground">{branch.name}</p>
                          <p className="text-sm text-muted-foreground">{branch.slug}</p>
                        </div>
                      </div>
                      <Badge className={cn(
                        branch.isActive 
                          ? 'bg-success/10 text-success'
                          : 'bg-muted text-muted-foreground'
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
                  <Users className="h-5 w-5 text-info" />
                  Members ({membersData?.meta?.total ?? tenant._count?.members ?? 0})
                </CardTitle>
              </div>
              <div className="relative mt-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg border animate-pulse">
                      <div className="h-10 w-10 rounded-full bg-muted" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted rounded" />
                        <div className="h-3 w-24 bg-muted rounded" />
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
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                            {member.photo ? (
                              <img src={member.photo} alt={`${member.firstName} ${member.lastName}`} className="h-full w-full object-cover" />
                            ) : (
                              <UserCircle className="h-6 w-6 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">
                              {member.firstName} {member.lastName}
                            </p>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              {member.email && <span>{member.email}</span>}
                              {member.email && member.phone && <span>•</span>}
                              {member.phone && <span>{member.phone}</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {member.membershipId && (
                            <span className="text-xs text-muted-foreground font-mono">
                              {member.membershipId}
                            </span>
                          )}
                          <Badge className={cn(
                            member.status === 'ACTIVE'
                              ? 'bg-success/10 text-success'
                              : member.status === 'INACTIVE'
                              ? 'bg-muted text-muted-foreground'
                              : 'bg-warning/10 text-warning'
                          )}>
                            {member.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pagination */}
                  {membersData.meta && membersData.meta.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
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
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
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
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <UserCircle className="h-5 w-5 text-info" />
                  <span className="text-muted-foreground">Members</span>
                </div>
                <span className="text-xl font-semibold">{tenant._count?.members ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-success" />
                  <span className="text-muted-foreground">Users</span>
                </div>
                <span className="text-xl font-semibold">{tenant._count?.users ?? 0}</span>
              </div>
              
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <GitBranch className="h-5 w-5 text-primary" />
                  <span className="text-muted-foreground">Branches</span>
                </div>
                <span className="text-xl font-semibold">{tenant._count?.branches ?? 0}</span>
              </div>

              <Separator />

              <div className="flex items-center justify-between p-3 rounded-lg bg-success/10">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-success" />
                  <span className="text-muted-foreground">Total Offerings</span>
                </div>
                <span className="text-xl font-semibold text-success">
                  R {parseFloat(tenant.totalOfferings ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              {tenant.thisMonthOfferings && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-info/10">
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-info" />
                    <div>
                      <span className="text-muted-foreground">This Month</span>
                      <p className="text-xs text-muted-foreground">
                        {tenant.thisMonthOfferings.count} offering{tenant.thisMonthOfferings.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <span className="text-xl font-semibold text-info">
                    R {parseFloat(tenant.thisMonthOfferings.total ?? '0').toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted transition-colors"
                >
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">{tenant.parent.name}</p>
                    <p className="text-sm text-muted-foreground">{tenant.parent.slug}</p>
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
                <p className="text-sm text-muted-foreground">Tenant ID</p>
                <p className="font-mono text-sm text-foreground break-all">{tenant.id}</p>
              </div>
              
              <Separator />
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Created</p>
                  <p className="text-foreground">{formatDate(tenant.createdAt)}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Updated</p>
                  <p className="text-foreground">{formatDate(tenant.updatedAt)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
