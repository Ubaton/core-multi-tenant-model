/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRAYER REQUESTS LIST PAGE
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useState } from 'react';
import { Plus, Search, MoreHorizontal, Eye, Pencil, Trash2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  usePrayerRequests, 
  useDeletePrayerRequest, 
  useUpdatePrayerRequest,
} from '@/lib/client';
import { cn } from '@/lib/utils';

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  IN_PROGRESS: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  ANSWERED: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  CLOSED: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
};

export default function PrayerRequestsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = usePrayerRequests({
    search: search || undefined,
    status: status || undefined,
    page,
    limit: 20,
  });

  const deletePrayerRequest = useDeletePrayerRequest();

  const prayerRequests = data?.data ?? [];
  const meta = data?.meta;

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
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Request
        </Button>
      </div>

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

function PrayerRequestCard({ request, onDelete }: { request: any; onDelete: () => void }) {
  const updateRequest = useUpdatePrayerRequest(request.id);

  const handleMarkAnswered = () => {
    updateRequest.mutate({
      status: 'ANSWERED',
    });
  };

  return (
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
              <span>
                {request.isAnonymous 
                  ? 'Anonymous' 
                  : request.requestorName || request.member?.firstName + ' ' + request.member?.lastName
                }
              </span>
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
              <DropdownMenuItem>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              {request.status !== 'ANSWERED' && (
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
