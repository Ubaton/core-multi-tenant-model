/**
 * ════════════════════════════════════════════════════════════════════════════
 * OFFERINGS LIST PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { Plus, Search, DollarSign, TrendingUp, Calendar, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { useOfferings, useCreateOffering, useMembers, useModulePermissions } from '@/lib/client';
import { cn } from '@/lib/utils';
import { RequireCreate, AccessDenied } from '@/components/permission-gate';
import { toast } from 'sonner';

const typeColors: Record<string, string> = {
  TITHE: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  OFFERING: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  FIRST_FRUIT: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  SPECIAL_SEED: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  BUILDING_PROJECT: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  MISSIONS: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
  OTHER: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

function formatCurrency(amount: string | number) {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
  }).format(num);
}

const OFFERING_TYPES = [
  { value: 'TITHE', label: 'Tithe' },
  { value: 'OFFERING', label: 'Offering' },
  { value: 'FIRST_FRUIT', label: 'First Fruit' },
  { value: 'SPECIAL_SEED', label: 'Special Seed' },
  { value: 'BUILDING_PROJECT', label: 'Building Project' },
  { value: 'MISSIONS', label: 'Missions' },
  { value: 'OTHER', label: 'Other' },
];

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Cash' },
  { value: 'CARD', label: 'Card' },
  { value: 'EFT', label: 'EFT / Bank Transfer' },
  { value: 'MOBILE', label: 'Mobile Payment' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'OTHER', label: 'Other' },
];

interface OfferingFormData {
  memberId: string;
  giverName: string;
  giverPhone: string;
  type: string;
  amount: string;
  description: string;
  paymentMethod: string;
  reference: string;
  givenAt: string;
}

const initialFormData: OfferingFormData = {
  memberId: '',
  giverName: '',
  giverPhone: '',
  type: 'OFFERING',
  amount: '',
  description: '',
  paymentMethod: 'CASH',
  reference: '',
  givenAt: new Date().toISOString().split('T')[0],
};

export default function OfferingsPage() {
  const [search, setSearch] = useState('');
  const [type, setType] = useState<string>('');
  const [page, setPage] = useState(1);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [formData, setFormData] = useState<OfferingFormData>(initialFormData);
  const [formError, setFormError] = useState('');
  const [giverType, setGiverType] = useState<'member' | 'guest'>('member');
  
  const { canView, isLoading: permissionsLoading } = useModulePermissions();
  const createOffering = useCreateOffering();
  
  // Fetch members for the dropdown
  const { data: membersData } = useMembers({ limit: 100 });
  const members = membersData?.data ?? [];

  const { data, isLoading } = useOfferings({
    search: search || undefined,
    type: type || undefined,
    page,
    limit: 20,
  });

  const offerings = data?.offerings ?? [];
  const summary = data?.summary;
  const meta = data?.meta;

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenDialog = () => {
    setFormData(initialFormData);
    setFormError('');
    setGiverType('member');
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
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Please enter a valid amount');
      return;
    }

    if (!formData.type) {
      setFormError('Please select an offering type');
      return;
    }

    if (giverType === 'guest' && !formData.giverName.trim()) {
      setFormError('Please enter the giver\'s name');
      return;
    }

    try {
      await createOffering.mutateAsync({
        memberId: giverType === 'member' && formData.memberId ? formData.memberId : undefined,
        giverName: giverType === 'guest' ? formData.giverName.trim() : undefined,
        giverPhone: giverType === 'guest' && formData.giverPhone ? formData.giverPhone.trim() : undefined,
        type: formData.type as 'TITHE' | 'OFFERING' | 'FIRST_FRUIT' | 'SPECIAL_SEED' | 'BUILDING_PROJECT' | 'MISSIONS' | 'OTHER',
        amount: parseFloat(formData.amount),
        currency: 'ZAR',
        description: formData.description.trim() || undefined,
        paymentMethod: formData.paymentMethod || undefined,
        reference: formData.reference.trim() || undefined,
        givenAt: formData.givenAt ? new Date(formData.givenAt) : undefined,
      });
      toast.success('Offering recorded successfully');
      handleCloseDialog();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record offering');
      setFormError(err instanceof Error ? err.message : 'Failed to record offering');
    }
  };

  // Check for view permission
  if (!permissionsLoading && !canView('offerings')) {
    return <AccessDenied message="You do not have permission to view offerings." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Offerings</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track and manage church offerings
          </p>
        </div>
        <RequireCreate module="offerings">
          <Button onClick={handleOpenDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Record Offering
          </Button>
        </RequireCreate>
      </div>

      {/* Add Offering Dialog */}
      <AlertDialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <AlertDialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <AlertDialogHeader>
            <div className="flex items-center justify-between">
              <AlertDialogTitle>Record New Offering</AlertDialogTitle>
              <Button variant="ghost" size="icon" onClick={handleCloseDialog} className="h-6 w-6">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AlertDialogDescription>
              Enter the offering details below. Amount will be recorded in South African Rand (ZAR).
            </AlertDialogDescription>
          </AlertDialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded-lg text-sm">
                {formError}
              </div>
            )}

            {/* Giver Type Selection */}
            <div className="space-y-2">
              <Label>Giver Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="giverType"
                    value="member"
                    checked={giverType === 'member'}
                    onChange={() => setGiverType('member')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Church Member</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="giverType"
                    value="guest"
                    checked={giverType === 'guest'}
                    onChange={() => setGiverType('guest')}
                    className="h-4 w-4"
                  />
                  <span className="text-sm">Guest / Anonymous</span>
                </label>
              </div>
            </div>

            {/* Member Selection or Guest Details */}
            {giverType === 'member' ? (
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
                      {member.firstName} {member.lastName} {member.membershipId ? `(${member.membershipId})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="giverName">Giver Name *</Label>
                  <Input
                    id="giverName"
                    name="giverName"
                    value={formData.giverName}
                    onChange={handleFormChange}
                    placeholder="Enter name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="giverPhone">Phone Number</Label>
                  <Input
                    id="giverPhone"
                    name="giverPhone"
                    value={formData.giverPhone}
                    onChange={handleFormChange}
                    placeholder="Enter phone"
                  />
                </div>
              </div>
            )}

            {/* Offering Type and Amount */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Offering Type *</Label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleFormChange}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  {OFFERING_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (ZAR) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={handleFormChange}
                    placeholder="0.00"
                    className="pl-8"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Payment Method and Date */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method</Label>
                <select
                  id="paymentMethod"
                  name="paymentMethod"
                  value={formData.paymentMethod}
                  onChange={handleFormChange}
                  className="w-full h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="givenAt">Date Given</Label>
                <Input
                  id="givenAt"
                  name="givenAt"
                  type="date"
                  value={formData.givenAt}
                  onChange={handleFormChange}
                />
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference / Receipt No.</Label>
              <Input
                id="reference"
                name="reference"
                value={formData.reference}
                onChange={handleFormChange}
                placeholder="Enter reference number"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description / Notes</Label>
              <Textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                placeholder="Add any additional notes..."
                rows={3}
              />
            </div>

            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCloseDialog}>Cancel</AlertDialogCancel>
              <Button type="submit" disabled={createOffering.isPending}>
                {createOffering.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Record Offering
                  </>
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Collected
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrency(summary.totalAmount) : 'R 0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {summary?.count ?? 0} offerings
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Amount
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {summary ? formatCurrency(summary.averageAmount) : 'R 0.00'}
            </div>
            <p className="text-xs text-muted-foreground">per offering</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Period
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary?.count ?? 0}</div>
            <p className="text-xs text-muted-foreground">total offerings</p>
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
                placeholder="Search by name or reference..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>
            <select 
              value={type} 
              onChange={(e) => {
                setType(e.target.value);
                setPage(1);
              }}
              className="h-10 rounded-lg border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Types</option>
              <option value="TITHE">Tithe</option>
              <option value="OFFERING">Offering</option>
              <option value="FIRST_FRUIT">First Fruit</option>
              <option value="SPECIAL_SEED">Special Seed</option>
              <option value="BUILDING_PROJECT">Building Project</option>
              <option value="MISSIONS">Missions</option>
              <option value="OTHER">Other</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Offerings Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Offerings</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
              ))}
            </div>
          ) : offerings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">No offerings found</p>
              <Button variant="outline" className="mt-4" onClick={handleOpenDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Record your first offering
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b dark:border-gray-800">
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Giver</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Amount</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Date</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500 dark:text-gray-400">Reference</th>
                  </tr>
                </thead>
                <tbody>
                  {offerings.map((offering) => (
                    <tr key={offering.id} className="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {offering.member 
                              ? `${offering.member.firstName} ${offering.member.lastName}`
                              : offering.giverName || 'Anonymous'
                            }
                          </p>
                          {offering.giverPhone && (
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {offering.giverPhone}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={cn('font-medium', typeColors[offering.type])}>
                          {offering.type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 font-medium text-gray-900 dark:text-white">
                        {formatCurrency(offering.amount)}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {new Date(offering.givenAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                        {offering.reference || '-'}
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
                Showing {(meta.page - 1) * meta.limit + 1} to {Math.min(meta.page * meta.limit, meta.total)} of {meta.total}
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
