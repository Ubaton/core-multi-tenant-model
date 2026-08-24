/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBER DETAILS PAGE
 * View individual member details
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Pencil, Mail, Phone, MapPin, Briefcase, Calendar, User, Building } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMember } from '@/lib/client';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { RequireEdit, AccessDenied } from '@/components/permission-gate';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  ACTIVE: 'bg-success/10 text-success',
  INACTIVE: 'bg-muted text-muted-foreground',
  TRANSFERRED: 'bg-info/10 text-info',
  DECEASED: 'bg-muted text-muted-foreground',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function MemberDetailsPage({ params }: PageProps) {
  const { id } = use(params);
  const { data: member, isLoading, error } = useMember(id);
  const { canView, isLoading: permissionsLoading } = useModulePermissions();

  // Check permissions
  if (!permissionsLoading && !canView('members')) {
    return <AccessDenied message="You don't have permission to view members." />;
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/members">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-32 bg-muted rounded animate-pulse" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !member) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/members">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">Member Not Found</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              The member you are looking for does not exist or has been removed.
            </p>
            <Link href="/members" className="mt-4 inline-block">
              <Button>Back to Members</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/members">
            <Button variant="ghost" size="icon" aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground">
                {member.firstName} {member.middleName || ''} {member.lastName}
              </h1>
              <Badge className={cn(statusColors[member.status] || statusColors.INACTIVE)}>
                {member.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {member.membershipId ? `ID: ${member.membershipId}` : 'Member Profile'}
            </p>
          </div>
        </div>
        <RequireEdit module="members">
          <Link href={`/members/${id}/edit`}>
            <Button>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Member
            </Button>
          </Link>
        </RequireEdit>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contact Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a href={`mailto:${member.email}`} className="text-info hover:underline">
                  {member.email}
                </a>
              </div>
            )}
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <a href={`tel:${member.phone}`} className="text-info hover:underline">
                {member.phone}
              </a>
            </div>
            {member.alternatePhone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${member.alternatePhone}`} className="text-info hover:underline">
                  {member.alternatePhone} (Alt)
                </a>
              </div>
            )}
            {member.gender && (
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{member.gender}</span>
              </div>
            )}
            {member.dateOfBirth && (
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>Born: {formatDate(member.dateOfBirth)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {member.address && <p>{member.address}</p>}
            {(member.city || member.state) && (
              <p>
                {member.city}{member.city && member.state ? ', ' : ''}{member.state}
              </p>
            )}
            {member.country && <p>{member.country}</p>}
            {!member.address && !member.city && !member.state && (
              <p className="text-muted-foreground">No address on file</p>
            )}
          </CardContent>
        </Card>

        {/* Employment */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Employment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.occupation && (
              <div className="flex items-center gap-3">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{member.occupation}</span>
              </div>
            )}
            {member.employer && (
              <div className="flex items-center gap-3">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{member.employer}</span>
              </div>
            )}
            {!member.occupation && !member.employer && (
              <p className="text-muted-foreground">No employment information on file</p>
            )}
          </CardContent>
        </Card>

        {/* Church Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Church Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Join Date</p>
                <p className="font-medium">{formatDate(member.joinDate)}</p>
              </div>
              {member.baptismDate && (
                <div>
                  <p className="text-sm text-muted-foreground">Baptism Date</p>
                  <p className="font-medium">{formatDate(member.baptismDate)}</p>
                </div>
              )}
            </div>
            {member.departments && member.departments.length > 0 && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Departments</p>
                <div className="flex flex-wrap gap-2">
                  {member.departments.map((dept: { department: { id: string; name: string }; role?: string }) => (
                    <Badge key={dept.department.id} variant="outline">
                      {dept.department.name}
                      {dept.role && ` (${dept.role})`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Offerings */}
        {'offerings' in member && Array.isArray(member.offerings) && member.offerings.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Offerings</CardTitle>
              <CardDescription>Last {member.offerings.length} offerings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {member.offerings.map((offering: { id: string; type: string; amount: number; currency: string; givenAt: string }) => (
                  <div key={offering.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{offering.type}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(offering.givenAt)}</p>
                    </div>
                    <p className="font-semibold">
                      {offering.currency} {offering.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Prayer Requests */}
        {'prayerRequests' in member && Array.isArray(member.prayerRequests) && member.prayerRequests.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recent Prayer Requests</CardTitle>
              <CardDescription>Last {member.prayerRequests.length} requests</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {member.prayerRequests.map((request: { id: string; title: string; status: string; createdAt: string }) => (
                  <div key={request.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{request.title}</p>
                      <p className="text-sm text-muted-foreground">{formatDate(request.createdAt)}</p>
                    </div>
                    <Badge variant="outline">{request.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
