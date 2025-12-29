/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICES PAGE
 * Manage church services and events
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Users,
  Music,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  X,
  Loader2,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { useServices, useCreateService, useUpdateService, useDeleteService } from '@/lib/client';
import { AccessDenied } from '@/components/permission-gate';

interface ServiceFormData {
  name: string;
  description: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  attendanceCount: string;
}

const initialFormData: ServiceFormData = {
  name: '',
  description: '',
  serviceDate: new Date().toISOString().split('T')[0],
  startTime: '09:00',
  endTime: '12:00',
  attendanceCount: '',
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-ZA', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(startTime?: string, endTime?: string) {
  if (!startTime) return 'Time not set';
  if (!endTime) return startTime;
  return `${startTime} - ${endTime}`;
}

function isUpcoming(dateString: string) {
  return new Date(dateString) >= new Date();
}

export default function ServicesPage() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [formData, setFormData] = useState<ServiceFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  
  const { canView, canCreate, canEdit, canDelete, isLoading: permissionsLoading } = useModulePermissions();
  
  const { data, isLoading } = useServices({
    search: search || undefined,
    upcoming: filter === 'upcoming' ? true : filter === 'past' ? false : undefined,
    page,
    limit: 20,
  });
  
  const createService = useCreateService();
  const updateService = useUpdateService(selectedService?.id || '');
  const deleteService = useDeleteService();

  const services = data?.services ?? [];
  const summary = data?.summary;
  const meta = data?.meta;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenAddDialog = () => {
    setFormData(initialFormData);
    setFormError('');
    setIsAddDialogOpen(true);
  };

  const handleOpenViewDialog = (service: any) => {
    setSelectedService(service);
    setIsViewDialogOpen(true);
  };

  const handleOpenEditDialog = (service: any) => {
    setSelectedService(service);
    setFormData({
      name: service.name,
      description: service.description || '',
      serviceDate: new Date(service.serviceDate).toISOString().split('T')[0],
      startTime: service.startTime || '09:00',
      endTime: service.endTime || '12:00',
      attendanceCount: service.attendanceCount?.toString() || '',
    });
    setFormError('');
    setIsEditDialogOpen(true);
  };

  const handleCloseDialogs = () => {
    setIsAddDialogOpen(false);
    setIsViewDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedService(null);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleSubmitCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Service name is required');
      return;
    }

    if (!formData.serviceDate) {
      setFormError('Service date is required');
      return;
    }

    try {
      await createService.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        serviceDate: new Date(formData.serviceDate),
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        attendanceCount: formData.attendanceCount ? parseInt(formData.attendanceCount) : undefined,
      });
      handleCloseDialogs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to create service');
    }
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Service name is required');
      return;
    }

    try {
      await updateService.mutateAsync({
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        serviceDate: new Date(formData.serviceDate),
        startTime: formData.startTime || undefined,
        endTime: formData.endTime || undefined,
        attendanceCount: formData.attendanceCount ? parseInt(formData.attendanceCount) : undefined,
      });
      handleCloseDialogs();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to update service');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this service?')) {
      try {
        await deleteService.mutateAsync(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'Failed to delete service');
      }
    }
  };

  if (permissionsLoading) {
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
          <Button onClick={handleOpenAddDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </Button>
        )}
      </div>

      {/* Service Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">All recorded services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{summary?.upcomingCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Scheduled services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Services</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.pastCount ?? 0}</div>
            <p className="text-xs text-muted-foreground">Completed services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Attendance</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.averageAttendance ?? 0}</div>
            <p className="text-xs text-muted-foreground">Per service</p>
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
                placeholder="Search services..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select 
              value={filter} 
              onChange={(e) => {
                setFilter(e.target.value as 'all' | 'upcoming' | 'past');
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="all">All Services</option>
              <option value="upcoming">Upcoming</option>
              <option value="past">Past</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Services List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Services
          </CardTitle>
          <CardDescription>
            {filter === 'upcoming' ? 'Upcoming scheduled services' : 
             filter === 'past' ? 'Past completed services' : 
             'All church services and events'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No services found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {canCreate('services') 
                  ? 'Click "Add Service" to create your first service'
                  : 'Services will appear here once created'}
              </p>
              {canCreate('services') && (
                <Button onClick={handleOpenAddDialog} className="mt-4">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Service
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors"
                >
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Music className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{service.name}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant={isUpcoming(service.serviceDate) ? 'default' : 'secondary'}>
                          {isUpcoming(service.serviceDate) ? 'Upcoming' : 'Completed'}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenViewDialog(service)}>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {canEdit('services') && (
                              <DropdownMenuItem onClick={() => handleOpenEditDialog(service)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                            )}
                            {canDelete('services') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleDelete(service.id)}
                                  className="text-red-600 dark:text-red-400"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    {service.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                        {service.description}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(service.serviceDate)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatTime(service.startTime, service.endTime)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {service.attendanceCount ?? 0} attendance
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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

      {/* Add Service Dialog */}
      <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>Add New Service</AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseDialogs} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription>
              Create a new church service or event.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmitCreate} className="space-y-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Service Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="e.g., Sunday Worship Service"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Add details about this service..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="serviceDate">Date *</Label>
              <Input
                id="serviceDate"
                name="serviceDate"
                type="date"
                value={formData.serviceDate}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Input
                  id="startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="attendanceCount">Expected Attendance</Label>
              <Input
                id="attendanceCount"
                name="attendanceCount"
                type="number"
                min="0"
                value={formData.attendanceCount}
                onChange={handleFormChange}
                placeholder="0"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDialogs}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={createService.isPending}>
                {createService.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Service'
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Service Dialog */}
      <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>Service Details</AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseDialogs} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDialogHeader>

          {selectedService && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={isUpcoming(selectedService.serviceDate) ? 'default' : 'secondary'}>
                  {isUpcoming(selectedService.serviceDate) ? 'Upcoming' : 'Completed'}
                </Badge>
              </div>

              <div>
                <h3 className="font-semibold text-lg">{selectedService.name}</h3>
                {selectedService.description && (
                  <p className="text-muted-foreground mt-1">{selectedService.description}</p>
                )}
              </div>

              <div className="grid gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(selectedService.serviceDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{formatTime(selectedService.startTime, selectedService.endTime)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedService.attendanceCount ?? 0} attendance</span>
                </div>
              </div>

              {selectedService._count?.offerings > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedService._count.offerings} offering(s) recorded for this service
                  </p>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <Button variant="outline" onClick={handleCloseDialogs}>
              Close
            </Button>
            {canEdit('services') && selectedService && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleOpenEditDialog(selectedService);
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Service Dialog */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>Edit Service</AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseDialogs} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription>
              Update the service details.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="edit-name">Service Name *</Label>
              <Input
                id="edit-name"
                name="name"
                value={formData.name}
                onChange={handleFormChange}
                placeholder="e.g., Sunday Worship Service"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Add details about this service..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-serviceDate">Date *</Label>
              <Input
                id="edit-serviceDate"
                name="serviceDate"
                type="date"
                value={formData.serviceDate}
                onChange={handleFormChange}
                required
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Start Time</Label>
                <Input
                  id="edit-startTime"
                  name="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={handleFormChange}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">End Time</Label>
                <Input
                  id="edit-endTime"
                  name="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-attendanceCount">Attendance Count</Label>
              <Input
                id="edit-attendanceCount"
                name="attendanceCount"
                type="number"
                min="0"
                value={formData.attendanceCount}
                onChange={handleFormChange}
                placeholder="0"
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDialogs}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={updateService.isPending}>
                {updateService.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
