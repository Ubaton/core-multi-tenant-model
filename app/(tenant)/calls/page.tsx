'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Phone, Search, Loader2 } from 'lucide-react';
import { get, getTenantId } from '@/lib/client/api-client';
import { useModulePermissions } from '@/lib/client/hooks/use-user-permissions';
import { AccessDenied } from '@/components/permission-gate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { PaginationMeta } from '@/lib/types';
import { CallOutcome } from '@/lib/types/db';

interface Call {
  id: string;
  phoneNumber: string;
  outcome: string;
  notes: string | null;
  calledAt: string;
  requiresFollowUp: boolean;
  operator?: { firstName: string; lastName: string } | null;
}

export default function CallsPage() {
  const permissions = useModulePermissions();
  if (permissions.isLoading) return <p role="status">Loading permissions…</p>;
  if (!permissions.canView('calls')) return <AccessDenied message="You don't have permission to view call logs." />;
  return <CallLogs />;
}

function CallLogs() {
  const [search, setSearch] = useState('');
  const [outcome, setOutcome] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['calls', getTenantId(), { search, outcome, page }],
    queryFn: async () => {
      const response = await get<Call[]>('/api/calls', { search: search || undefined, outcome: outcome || undefined, page, pageSize: 20 });
      return { calls: response.data ?? [], meta: response.meta as PaginationMeta };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Call Center</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review calls and identify conversations that need follow-up.</p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative sm:max-w-md sm:flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-3 size-4 text-muted-foreground" />
          <Input aria-label="Search calls" placeholder="Search phone number or notes" className="pl-9" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} />
        </div>
        <select aria-label="Filter call outcome" className="h-10 rounded-lg border bg-background px-3 text-sm" value={outcome} onChange={(event) => { setOutcome(event.target.value); setPage(1); }}>
          <option value="">All outcomes</option>
          {Object.values(CallOutcome).map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ').toLowerCase()}</option>)}
        </select>
      </div>
      <Card>
        <CardHeader><CardTitle>Call logs{data?.meta ? ` (${data.meta.totalCount})` : ''}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <p role="status" className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Loading calls…</p>
            : error ? <div className="space-y-3"><p role="alert" className="text-destructive">Could not load calls.</p><Button variant="outline" onClick={() => void refetch()}>Try again</Button></div>
              : !data?.calls.length ? <div className="py-12 text-center"><Phone className="mx-auto mb-3 size-6 text-muted-foreground" aria-hidden="true" /><p className="font-medium">{search || outcome ? 'No matching calls' : 'No calls recorded yet'}</p><p className="mt-1 text-sm text-muted-foreground">{search || outcome ? 'Try another search or outcome.' : 'Recorded calls will appear here.'}</p></div>
                : <ul className="divide-y">{data.calls.map((call) => <li key={call.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div className="min-w-0"><p className="font-medium">{call.phoneNumber}</p><p className="text-sm capitalize text-muted-foreground">{call.outcome.replaceAll('_', ' ').toLowerCase()}</p>{call.notes && <p className="mt-2 max-w-xl break-words text-sm">{call.notes}</p>}</div>
                  <div className="text-sm text-muted-foreground"><p>{new Date(call.calledAt).toLocaleString()}</p>{call.requiresFollowUp && <p className="mt-1 font-medium text-warning">Follow-up required</p>}</div>
                </li>)}</ul>}
          {data?.meta && data.meta.totalPages > 1 && <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><span className="text-sm text-muted-foreground">Page {page} of {data.meta.totalPages}</span><div className="flex gap-2"><Button variant="outline" disabled={!data.meta.hasPrevPage || isFetching} onClick={() => setPage((value) => value - 1)}>Previous</Button><Button variant="outline" disabled={!data.meta.hasNextPage || isFetching} onClick={() => setPage((value) => value + 1)}>Next</Button></div></div>}
        </CardContent>
      </Card>
    </div>
  );
}
