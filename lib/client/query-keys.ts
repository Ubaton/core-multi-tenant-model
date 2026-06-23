/**
 * ════════════════════════════════════════════════════════════════════════════
 * CENTRALIZED QUERY KEY FACTORY  (lib/client/query-keys.ts)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * WHY A FACTORY:
 *  • Single source of truth — rename a key here and TypeScript catches every
 *    callsite at compile time.
 *  • Hierarchical structure — TanStack Query uses PREFIX MATCHING for
 *    invalidation.  Calling:
 *      queryClient.invalidateQueries({ queryKey: queryKeys.members.all() })
 *    automatically invalidates:
 *      ['members']                    ← all()
 *      ['members', 'list']            ← lists()
 *      ['members', 'list', filters]   ← list(filters)
 *      ['members', 'detail']          ← details()
 *      ['members', 'detail', id]      ← detail(id)
 *    You only need to call the deepest key you care about, or the root to
 *    wipe everything.
 *
 * USAGE:
 *
 *   import { queryKeys } from '@/lib/client/query-keys';
 *
 *   // In a useQuery:
 *   useQuery({ queryKey: queryKeys.members.list({ status: 'ACTIVE' }), ... })
 *
 *   // Invalidate all member data (e.g. after an SSE event):
 *   queryClient.invalidateQueries({ queryKey: queryKeys.members.all() })
 *
 *   // Invalidate just the list (e.g. after create):
 *   queryClient.invalidateQueries({ queryKey: queryKeys.members.lists() })
 *
 *   // Invalidate a single detail (e.g. after update):
 *   queryClient.invalidateQueries({ queryKey: queryKeys.members.detail(id) })
 *
 *   // Update cache directly (optimistic):
 *   queryClient.setQueryData(queryKeys.members.detail(id), updatedMember)
 */

// ─── Shared filter types ──────────────────────────────────────────────────────

export interface PaginatedFilters {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface MemberFilters extends PaginatedFilters {
  status?: string;
  gender?: string;
  departmentId?: string;
}

export interface LeadFilters extends PaginatedFilters {
  status?: string;
  assignedToId?: string;
  source?: string;
}

export interface OfferingFilters extends PaginatedFilters {
  memberId?: string;
  type?: string;
  from?: string;
  to?: string;
}

export interface ServiceFilters extends PaginatedFilters {
  type?: string;
  from?: string;
  to?: string;
}

export interface CommunicationFilters extends PaginatedFilters {
  type?: string;
  from?: string;
  to?: string;
}

export interface MessageFilters extends PaginatedFilters {
  threadId?: string;
}

export interface UserFilters extends PaginatedFilters {
  role?: string;
  tenantId?: string;
}

export interface TenantFilters extends PaginatedFilters {
  status?: string;
  plan?: string;
}

// ─── Key factory ─────────────────────────────────────────────────────────────

export const queryKeys = {

  // ── Members ──────────────────────────────────────────────────────────────
  members: {
    /** ['members'] — root; invalidating this wipes ALL member cache */
    all:     ()                       => ['members']               as const,
    /** ['members', 'list'] */
    lists:   ()                       => ['members', 'list']       as const,
    /** ['members', 'list', filters] */
    list:    (f: MemberFilters)       => ['members', 'list', f]    as const,
    /** ['members', 'list', 'infinite', filters] */
    infinite:(f: Omit<MemberFilters, 'page'>) =>
                                         ['members', 'list', 'infinite', f] as const,
    /** ['members', 'detail'] */
    details: ()                       => ['members', 'detail']     as const,
    /** ['members', 'detail', id] */
    detail:  (id: string)             => ['members', 'detail', id] as const,
  },

  // ── Leads ─────────────────────────────────────────────────────────────────
  leads: {
    all:     ()                       => ['leads']               as const,
    lists:   ()                       => ['leads', 'list']       as const,
    list:    (f: LeadFilters)         => ['leads', 'list', f]    as const,
    details: ()                       => ['leads', 'detail']     as const,
    detail:  (id: string)             => ['leads', 'detail', id] as const,
  },

  // ── Offerings ─────────────────────────────────────────────────────────────
  offerings: {
    all:     ()                       => ['offerings']               as const,
    lists:   ()                       => ['offerings', 'list']       as const,
    list:    (f: OfferingFilters)     => ['offerings', 'list', f]    as const,
    details: ()                       => ['offerings', 'detail']     as const,
    detail:  (id: string)             => ['offerings', 'detail', id] as const,
  },

  // ── Prayer Requests ───────────────────────────────────────────────────────
  prayerRequests: {
    all:     ()                       => ['prayer-requests']               as const,
    lists:   ()                       => ['prayer-requests', 'list']       as const,
    list:    (f: PaginatedFilters)    => ['prayer-requests', 'list', f]    as const,
    details: ()                       => ['prayer-requests', 'detail']     as const,
    detail:  (id: string)             => ['prayer-requests', 'detail', id] as const,
  },

  // ── Services ──────────────────────────────────────────────────────────────
  services: {
    all:     ()                       => ['services']               as const,
    lists:   ()                       => ['services', 'list']       as const,
    list:    (f: ServiceFilters)      => ['services', 'list', f]    as const,
    details: ()                       => ['services', 'detail']     as const,
    detail:  (id: string)             => ['services', 'detail', id] as const,
  },

  // ── Communications ────────────────────────────────────────────────────────
  communications: {
    all:     ()                       => ['communications']               as const,
    lists:   ()                       => ['communications', 'list']       as const,
    list:    (f: CommunicationFilters)=> ['communications', 'list', f]    as const,
    details: ()                       => ['communications', 'detail']     as const,
    detail:  (id: string)             => ['communications', 'detail', id] as const,
  },

  // ── Messages ──────────────────────────────────────────────────────────────
  messages: {
    all:     ()                       => ['messages']               as const,
    lists:   ()                       => ['messages', 'list']       as const,
    list:    (f: MessageFilters)      => ['messages', 'list', f]    as const,
    details: ()                       => ['messages', 'detail']     as const,
    detail:  (id: string)             => ['messages', 'detail', id] as const,
  },

  // ── Users (super-admin) ───────────────────────────────────────────────────
  users: {
    all:     ()                       => ['users']               as const,
    lists:   ()                       => ['users', 'list']       as const,
    list:    (f: UserFilters)         => ['users', 'list', f]    as const,
    details: ()                       => ['users', 'detail']     as const,
    detail:  (id: string)             => ['users', 'detail', id] as const,
    /** Current authenticated user profile */
    me:      ()                       => ['users', 'me']         as const,
  },

  // ── Tenants (super-admin) ─────────────────────────────────────────────────
  tenants: {
    all:     ()                       => ['tenants']               as const,
    lists:   ()                       => ['tenants', 'list']       as const,
    list:    (f: TenantFilters)       => ['tenants', 'list', f]    as const,
    details: ()                       => ['tenants', 'detail']     as const,
    detail:  (id: string)             => ['tenants', 'detail', id] as const,
  },

  // ── Permissions ───────────────────────────────────────────────────────────
  permissions: {
    all:     ()                       => ['permissions']                   as const,
    me:      ()                       => ['permissions', 'me']             as const,
    user:    (userId: string)         => ['permissions', 'user', userId]   as const,
  },

  // ── Stats ─────────────────────────────────────────────────────────────────
  stats: {
    all:     ()                       => ['stats']                as const,
    tenant:  ()                       => ['stats', 'tenant']      as const,
    platform:()                       => ['stats', 'platform']    as const,
  },

  // ── Settings ──────────────────────────────────────────────────────────────
  settings: {
    all:     ()                       => ['settings']             as const,
    tenant:  ()                       => ['settings', 'tenant']   as const,
  },

} as const;
