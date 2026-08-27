/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUDIT TRAIL PAGE (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The permanent record of every mutating action in the system. Deleted tenants
 * and users are soft deleted, so entries stay fully resolvable after deletion -
 * a deleted actor or church is shown with a "deleted" marker rather than
 * disappearing from the trail.
 */

'use client';

import { Fragment, useState } from 'react';
import {
  Search,
  ScrollText,
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Globe,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuditLogs, useAuditLogFilterOptions, type AuditLogEntry } from '@/lib/client';
import { cn } from '@/lib/utils';

const PAGE_SIZE = 25;

type ActionKind = 'create' | 'update' | 'delete' | 'other';

/** CREATE / UPDATE / DELETE drive the row's icon and colour. */
function actionKind(action: string): ActionKind {
  const upper = action.toUpperCase();
  if (upper.startsWith('CREATE')) return 'create';
  if (upper.startsWith('UPDATE')) return 'update';
  if (upper.startsWith('DELETE')) return 'delete';
  return 'other';
}

const ACTION_STYLES: Record<ActionKind, { badge: string; Icon: React.ElementType }> = {
  create: { badge: 'bg-success/10 text-success', Icon: Plus },
  update: { badge: 'bg-info/10 text-info', Icon: Pencil },
  delete: { badge: 'bg-destructive/10 text-destructive', Icon: Trash2 },
  other: { badge: 'bg-muted text-muted-foreground', Icon: ScrollText },
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function actorName(entry: AuditLogEntry): string {
  const { firstName, lastName, email, id } = entry.actor;
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name || email || id;
}

/** Before/after payloads, rendered only when a row is expanded. */
function DataPanel({ title, data }: { title: string; data: Record<string, unknown> | null }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {data ? (
        <pre className="max-h-64 overflow-auto overscroll-contain rounded-lg border border-border/60 bg-muted/40 p-3 text-xs leading-relaxed">
          {JSON.stringify(data, null, 2)}
        </pre>
      ) : (
        <div className="rounded-lg border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
          None recorded
        </div>
      )}
    </div>
  );
}

export default function AuditTrailPage() {
  const [search, setSearch] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [actorId, setActorId] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: options } = useAuditLogFilterOptions();
  const { data, isLoading, isError, error } = useAuditLogs({
    page,
    limit: PAGE_SIZE,
    ...(search ? { search } : {}),
    ...(action ? { action } : {}),
    ...(entityType ? { entityType } : {}),
    ...(actorId ? { userId: actorId } : {}),
  });

  const entries = data?.data ?? [];
  const meta = data?.meta;

  const selectClass =
    'h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Trail</h1>
        <p className="text-muted-foreground">
          Every change made across the platform, including records that have since been deleted
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by action, record id, user or church..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <select
              value={action}
              onChange={(e) => {
                setAction(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">All Actions</option>
              {options?.actions.map((value) => (
                <option key={value} value={value}>
                  {value.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            <select
              value={entityType}
              onChange={(e) => {
                setEntityType(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">All Record Types</option>
              {options?.entityTypes.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              value={actorId}
              onChange={(e) => {
                setActorId(e.target.value);
                setPage(1);
              }}
              className={selectClass}
            >
              <option value="">All Users</option>
              {options?.actors.map((actor) => (
                <option key={actor.id} value={actor.id}>
                  {actor.name || actor.email}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Entries */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-muted">
                  <th className="w-10 px-3 py-3">
                    <span className="sr-only">Expand</span>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Action
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Record
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Performed By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Church
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    When
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      Loading audit trail...
                    </td>
                  </tr>
                ) : isError ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-destructive">
                      {error instanceof Error ? error.message : 'Failed to load the audit trail'}
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                      No audit entries match these filters
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => {
                    const { badge, Icon } = ACTION_STYLES[actionKind(entry.action)];
                    const isExpanded = expandedId === entry.id;

                    return (
                      <Fragment key={entry.id}>
                        <tr
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="cursor-pointer hover:bg-muted"
                        >
                          <td className="px-3 py-4 text-muted-foreground">
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4">
                            <Badge className={cn('gap-1', badge)}>
                              <Icon className="h-3 w-3" />
                              {entry.action.replace(/_/g, ' ')}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-foreground">
                              {entry.entityType}
                            </div>
                            <div className="font-mono text-xs text-muted-foreground">
                              {entry.entityId}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2 text-sm text-foreground">
                              {actorName(entry)}
                              {entry.actor.role === 'SUPER_ADMIN' && (
                                <Shield className="h-3 w-3 text-destructive" />
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              {entry.actor.email ?? entry.actor.id}
                              {entry.actor.isDeleted && (
                                <Badge className="bg-muted text-muted-foreground">deleted</Badge>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {entry.tenant ? (
                              <div className="flex items-center gap-2 text-sm text-foreground">
                                {entry.tenant.name}
                                {entry.tenant.isDeleted && (
                                  <Badge className="bg-muted text-muted-foreground">deleted</Badge>
                                )}
                              </div>
                            ) : (
                              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Globe className="h-3 w-3" />
                                Platform-wide
                              </span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                            {formatTimestamp(entry.createdAt)}
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-muted/30">
                            <td colSpan={6} className="px-6 py-4">
                              <div className="flex flex-col gap-4 lg:flex-row">
                                <DataPanel title="Before" data={entry.oldData} />
                                <DataPanel title="After" data={entry.newData} />
                              </div>
                              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                                <span>IP: {entry.ipAddress ?? 'not recorded'}</span>
                                <span className="max-w-full truncate">
                                  Device: {entry.userAgent ?? 'not recorded'}
                                </span>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border px-6 py-3">
              <div className="text-sm text-muted-foreground">
                Showing {(page - 1) * PAGE_SIZE + 1} to {Math.min(page * PAGE_SIZE, meta.total)} of{' '}
                {meta.total} entries
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= meta.totalPages}
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
