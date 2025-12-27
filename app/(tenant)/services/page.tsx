/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICES PAGE
 * Manage church services and events
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import {
  Calendar,
  Clock,
  MapPin,
  Plus,
  Users,
  Video,
  Music,
  BookOpen,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { AccessDenied } from '@/components/permission-gate';

const upcomingServices = [
  {
    id: '1',
    name: 'Sunday Worship Service',
    type: 'worship',
    date: 'Sunday, Dec 29, 2024',
    time: '9:00 AM - 11:00 AM',
    location: 'Main Sanctuary',
    attendees: 0,
    icon: Music,
    status: 'upcoming',
  },
  {
    id: '2',
    name: 'Wednesday Bible Study',
    type: 'study',
    date: 'Wednesday, Jan 1, 2025',
    time: '7:00 PM - 8:30 PM',
    location: 'Fellowship Hall',
    attendees: 0,
    icon: BookOpen,
    status: 'upcoming',
  },
  {
    id: '3',
    name: 'Youth Service',
    type: 'youth',
    date: 'Friday, Jan 3, 2025',
    time: '6:00 PM - 8:00 PM',
    location: 'Youth Center',
    attendees: 0,
    icon: Users,
    status: 'upcoming',
  },
  {
    id: '4',
    name: 'Online Prayer Meeting',
    type: 'online',
    date: 'Saturday, Jan 4, 2025',
    time: '6:00 AM - 7:00 AM',
    location: 'Virtual (Zoom)',
    attendees: 0,
    icon: Video,
    status: 'upcoming',
  },
];

const serviceTypes = [
  { id: 'worship', name: 'Worship Service', count: 4, color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
  { id: 'study', name: 'Bible Study', count: 4, color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'youth', name: 'Youth Service', count: 4, color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  { id: 'online', name: 'Online Service', count: 2, color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
];

export default function ServicesPage() {
  const { canView, canCreate, isLoading } = useModulePermissions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!canView('services')) {
    return <AccessDenied message="You don't have permission to view services." />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage church services and events
          </p>
        </div>
        {canCreate('services') && (
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>

      {/* Service Type Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        {serviceTypes.map((type) => (
          <Card key={type.id}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{type.name}</CardTitle>
              <Badge variant="secondary" className={type.color}>
                {type.count}/month
              </Badge>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">
                Regular scheduled services
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Upcoming Services */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Services
          </CardTitle>
          <CardDescription>
            Scheduled services and events for the coming weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {upcomingServices.map((service) => (
              <div
                key={service.id}
                className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
              >
                <div className="p-3 rounded-lg bg-primary/10">
                  <service.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">{service.name}</h3>
                    <Badge variant="outline">{service.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {service.date}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {service.time}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {service.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {service.attendees} registered
                    </span>
                  </div>
                </div>
                <Button variant="outline" size="sm">
                  View Details
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Empty State for Past Services */}
      <Card>
        <CardHeader>
          <CardTitle>Past Services</CardTitle>
          <CardDescription>
            History of completed services with attendance records
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">No past services recorded yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Service history will appear here after services are completed
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
