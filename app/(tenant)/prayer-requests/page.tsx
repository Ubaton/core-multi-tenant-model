/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRAYER REQUESTS LIST PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Check, Loader2, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { 
  usePrayerRequests, 
  useCreatePrayerRequest,
  useDeletePrayerRequest, 
  useUpdatePrayerRequest,
  useMembers,
  useModulePermissions,
} from '@/lib/client';
import { cn } from '@/lib/utils';
import { RequireCreate, AccessDenied } from '@/components/permission-gate';
import { toast } from 'sonner';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ANSWERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

interface PrayerRequestFormData {
  title: string;
  description: string;
  memberId: string;
  requestorName: string;
  requestorEmail: string;
  requestorPhone: string;
  isAnonymous: boolean;
  isUrgent: boolean;
}

const initialFormData: PrayerRequestFormData = {
  title: '',
  description: '',
  memberId: '',
  requestorName: '',
  requestorEmail: '',
  requestorPhone: '',
  isAnonymous: false,
  isUrgent: false,
};

export default function PrayerRequestsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<PrayerRequestFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [requestorType, setRequestorType] = useState<'member' | 'guest'>('member');
  
  const { canView, canEdit, canDelete, isLoading: permissionsLoading } = useModulePermissions();
  const createPrayerRequest = useCreatePrayerRequest();
  
  // Fetch members for the dropdown
  const { data: membersData } = useMembers({ limit: 100 });
  const members = membersData?.data ?? [];

  const { data, isLoading } = usePrayerRequests({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  const deletePrayerRequest = useDeletePrayerRequest();

  const prayerRequests = data?.data ?? [];
  const meta = data?.meta;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenDialog = () => {
    setFormData(initialFormData);
    setFormError('');
    setRequestorType('member');
    setIsAddDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsAddDialogOpen(false);
    setFormData(initialFormData);
    setFormError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    // Validation
    if (!formData.title.trim()) {
      setFormError('Please enter a title for the prayer request');
      return;
    }

    if (!formData.description.trim()) {
      setFormError('Please enter the prayer request details');
      return;
    }

    if (requestorType === 'guest' && !formData.isAnonymous && !formData.requestorName.trim()) {
      setFormError('Please enter your name or mark the request as anonymous');
      return;
    }

    try {
      await createPrayerRequest.mutateAsync({
        title: formData.title.trim(),
        description: formData.description.trim(),
        memberId: requestorType === 'member' && formData.memberId ? formData.memberId : undefined,
        requestorName: requestorType === 'guest' && !formData.isAnonymous ? formData.requestorName.trim() : undefined,
        requestorEmail: requestorType === 'guest' && formData.requestorEmail ? formData.requestorEmail.trim() : undefined,
        requestorPhone: requestorType === 'guest' && formData.requestorPhone ? formData.requestorPhone.trim() : undefined,
        isAnonymous: formData.isAnonymous,
        isUrgent: formData.isUrgent,
      });
      toast.success('Prayer request submitted successfully');
      handleCloseDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit prayer request');
      setFormError(err instanceof Error ? err.message : 'Failed to submit prayer request');
    }
  };

  // Check for view permission
  if (!permissionsLoading && !canView('prayer_requests')) {
    return <AccessDenied message="You do not have permission to view prayer requests." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prayer Requests</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Manage prayer requests from members and visitors
          </p>
        </div>
        <RequireCreate module="prayer_requests">
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Add Request
          </Button>
        </RequireCreate>
      </div>

      {/* Add Prayer Request Dialog */}
      <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>Submit Prayer Request</AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseDialog} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription>
              Share your prayer request with the church. All requests are treated with confidentiality.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                value={formData.title}
                onChange={handleFormChange}
                placeholder="Brief title for your prayer request"
                maxLength={200}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Prayer Request Details *</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Please share what you would like us to pray for..."
                rows={4}
                maxLength={5000}
                required
              />
            </div>

            {/* Requestor Type Selection */}
            <div className="space-y-2">
              <Label>Who is this request from?</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="requestorType"
                    value="member"
                    checked={requestorType === 'member'}
                    onChange={() => setRequestorType('member')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Church Member</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="requestorType"
                    value="guest"
                    checked={requestorType === 'guest'}
                    onChange={() => setRequestorType('guest')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Guest / Visitor</span>
                </label>
              </div>
            </div>

            {/* Member Selection or Guest Details */}
            {requestorType === 'member' ? (
              <div className="space-y-2">
                <Label htmlFor="memberId">Select Member</Label>
                <select
                  id="memberId"
                  name="memberId"
                  value={formData.memberId}
                  onChange={handleFormChange}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">-- Select a member (optional) --</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="requestorName">Your Name {!formData.isAnonymous && '*'}</Label>
                  <Input
                    id="requestorName"
                    name="requestorName"
                    value={formData.requestorName}
                    onChange={handleFormChange}
                    placeholder="Enter your name"
                    disabled={formData.isAnonymous}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="requestorEmail">Email</Label>
                    <Input
                      id="requestorEmail"
                      name="requestorEmail"
                      type="email"
                      value={formData.requestorEmail}
                      onChange={handleFormChange}
                      placeholder="your@email.com"
                      disabled={formData.isAnonymous}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="requestorPhone">Phone</Label>
                    <Input
                      id="requestorPhone"
                      name="requestorPhone"
                      value={formData.requestorPhone}
                      onChange={handleFormChange}
                      placeholder="Phone number"
                      disabled={formData.isAnonymous}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Options */}
            <div className="space-y-3 pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isAnonymous"
                  checked={formData.isAnonymous}
                  onChange={handleFormChange}
                  className="h-4 w-4 rounded"
                />
                <span className="text-sm">Submit anonymously</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={formData.isUrgent}
                  onChange={handleFormChange}
                  className="h-4 w-4 rounded"
                />
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Mark as urgent</span>
                </div>
              </label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDialog}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={createPrayerRequest.isPending}>
                {createPrayerRequest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Request'
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search prayer requests..."
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
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="ANSWERED">Answered</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Prayer Requests List */}
      <div className="space-y-4">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="py-6">
                <div className="h-20 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              </CardContent>
            </Card>
          ))
        ) : prayerRequests.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-gray-500 dark:text-gray-400">No prayer requests found</p>
            </CardContent>
          </Card>
        ) : (
          prayerRequests.map((request) => (
            <PrayerRequestCard 
              key={request.id} 
              request={request}
              onDelete={() => deletePrayerRequest.mutate(request.id)}
              canEdit={canEdit('prayer_requests')}
              canDelete={canDelete('prayer_requests')}
            />
          ))
        )}
      </div>

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

interface PrayerRequestCardProps {
  request: {
    id: string;
    title: string;
    description: string;
    requestorName?: string;
    requestorEmail?: string;
    requestorPhone?: string;
    isAnonymous: boolean;
    isUrgent: boolean;
    status: string;
    prayerResponse?: string;
    answeredAt?: string;
    member?: {
      id: string;
      firstName: string;
      lastName: string;
    };
    createdAt: string;
    updatedAt: string;
  };
  onDelete: () => void;
  canEdit: boolean;
  canDelete: boolean;
}

function PrayerRequestCard({ request, onDelete, canEdit, canDelete }: PrayerRequestCardProps) {
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: request.title,
    description: request.description,
    status: request.status,
    prayerResponse: request.prayerResponse || '',
    isUrgent: request.isUrgent,
  });
  const [editError, setEditError] = useState('');
  
  const updateRequest = useUpdatePrayerRequest(request.id);

  const handleMarkAnswered = () => {
    updateRequest.mutate({
      status: 'ANSWERED',
    });
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setEditFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setEditFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleOpenEditDialog = () => {
    setEditFormData({
      title: request.title,
      description: request.description,
      status: request.status,
      prayerResponse: request.prayerResponse || '',
      isUrgent: request.isUrgent,
    });
    setEditError('');
    setIsEditDialogOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError('');

    if (!editFormData.title.trim()) {
      setEditError('Title is required');
      return;
    }

    if (!editFormData.description.trim()) {
      setEditError('Description is required');
      return;
    }

    try {
      await updateRequest.mutateAsync({
        title: editFormData.title.trim(),
        description: editFormData.description.trim(),
        status: editFormData.status as 'PENDING' | 'IN_PROGRESS' | 'ANSWERED' | 'CLOSED',
        prayerResponse: editFormData.prayerResponse.trim() || undefined,
        isUrgent: editFormData.isUrgent,
      });
      setIsEditDialogOpen(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update prayer request');
    }
  };

  const getRequestorDisplay = () => {
    if (request.isAnonymous) return 'Anonymous';
    if (request.requestorName) return request.requestorName;
    if (request.member) return `${request.member.firstName} ${request.member.lastName}`;
    return 'Unknown';
  };

  return (
    <>
      <Card>
        <CardContent className="py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-3">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {request.title}
                </h3>
                <Badge className={cn('font-medium', statusColors[request.status])}>
                  {request.status.replace('_', ' ')}
                </Badge>
                {request.isUrgent && (
                  <Badge variant="destructive">Urgent</Badge>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-300 line-clamp-2">
                {request.description}
              </p>
              <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span>{getRequestorDisplay()}</span>
                <span>•</span>
                <span>{new Date(request.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsViewDialogOpen(true)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                {canEdit && (
                  <DropdownMenuItem onClick={handleOpenEditDialog}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {request.status !== 'ANSWERED' && canEdit && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleMarkAnswered}
                      className="text-green-600 dark:text-green-400"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Mark as Answered
                    </DropdownMenuItem>
                  </>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this prayer request?')) {
                          onDelete();
                        }
                      }}
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
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle className="flex items-center gap-2">
                Prayer Request Details
                {request.isUrgent && (
                  <Badge variant="destructive" className="ml-2">Urgent</Badge>
                )}
              </AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsViewDialogOpen(false)} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </AlertDialogHeader>

          <div className="space-y-4">
            {/* Status */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge className={cn('font-medium', statusColors[request.status])}>
                {request.status.replace('_', ' ')}
              </Badge>
            </div>

            {/* Title */}
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                {request.title}
              </h3>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label className="text-muted-foreground">Prayer Request</Label>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {request.description}
              </p>
            </div>

            {/* Prayer Response (if answered) */}
            {request.prayerResponse && (
              <div className="space-y-1 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <Label className="text-green-700 dark:text-green-400">Prayer Response / Testimony</Label>
                <p className="text-green-800 dark:text-green-300 whitespace-pre-wrap">
                  {request.prayerResponse}
                </p>
              </div>
            )}

            {/* Requestor Info */}
            <div className="space-y-2 pt-2 border-t">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Requested by:</span>
                  <p className="font-medium">{getRequestorDisplay()}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>
                  <p className="font-medium">{new Date(request.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              {!request.isAnonymous && (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {request.requestorEmail && (
                    <div>
                      <span className="text-muted-foreground">Email:</span>
                      <p className="font-medium">{request.requestorEmail}</p>
                    </div>
                  )}
                  {request.requestorPhone && (
                    <div>
                      <span className="text-muted-foreground">Phone:</span>
                      <p className="font-medium">{request.requestorPhone}</p>
                    </div>
                  )}
                </div>
              )}
              {request.answeredAt && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Answered on:</span>
                  <p className="font-medium text-green-600 dark:text-green-400">
                    {new Date(request.answeredAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>

          <AlertDialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Close
            </Button>
            {canEdit && (
              <Button onClick={() => {
                setIsViewDialogOpen(false);
                handleOpenEditDialog();
              }}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Dialog */}
      <AlertDialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>Edit Prayer Request</AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsEditDialogOpen(false)} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription>
              Update the prayer request details below.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            {editError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                {editError}
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                name="title"
                value={editFormData.title}
                onChange={handleEditFormChange}
                placeholder="Brief title for the prayer request"
                maxLength={200}
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="edit-description">Prayer Request Details *</Label>
              <Textarea
                id="edit-description"
                name="description"
                value={editFormData.description}
                onChange={handleEditFormChange}
                placeholder="Prayer request details..."
                rows={4}
                maxLength={5000}
                required
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <select
                id="edit-status"
                name="status"
                value={editFormData.status}
                onChange={handleEditFormChange}
                className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="PENDING">Pending</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ANSWERED">Answered</option>
                <option value="CLOSED">Closed</option>
              </select>
            </div>

            {/* Prayer Response */}
            <div className="space-y-2">
              <Label htmlFor="edit-prayerResponse">Prayer Response / Testimony</Label>
              <Textarea
                id="edit-prayerResponse"
                name="prayerResponse"
                value={editFormData.prayerResponse}
                onChange={handleEditFormChange}
                placeholder="Add a response or testimony when the prayer is answered..."
                rows={3}
                maxLength={5000}
              />
            </div>

            {/* Urgent Toggle */}
            <div className="pt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="isUrgent"
                  checked={editFormData.isUrgent}
                  onChange={handleEditFormChange}
                  className="h-4 w-4 rounded"
                />
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-orange-500" />
                  <span className="text-sm">Mark as urgent</span>
                </div>
              </label>
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setIsEditDialogOpen(false)}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={updateRequest.isPending}>
                {updateRequest.isPending ? (
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
    </>
  );
}

