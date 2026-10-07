/**
 * ════════════════════════════════════════════════════════════════════════════
 * QUERY CLIENT FACTORY  (lib/client/query-client.ts)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This module is intentionally NOT marked 'use client' so it can be imported
 * from both Server Components (for prefetching) and Client Components.
 *
 * Usage:
 *   import { queryClient } from '@/lib/client/query-client';
 *   queryClient.invalidateQueries({ queryKey: queryKeys.members.all() });
 */

import { QueryClient } from '@tanstack/react-query';

// ─── Default options shared by both server & browser instances ───────────────

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * SSE is an optimization, not a guarantee. Keep a bounded freshness
         * window so navigation, focus and reconnection recover missed events.
         */
        staleTime: 30_000,

        /**
         * gcTime: 10 minutes
         * Keep cache entries for 10 min after all subscribers unmount.
         * Navigating back to a page re-uses the cache instantly while SSE
         * decides whether to invalidate.
         */
        gcTime: 10 * 60 * 1000,

        /**
         * Refetch stale data when returning to the application.
         */
        refetchOnWindowFocus: true,

        /**
         * refetchOnReconnect: true
         * When the network recovers, refetch any stale queries.  Combined with
         * the SSE reconnect logic, this guarantees the UI re-syncs after an
         * outage without manual intervention.
         */
        refetchOnReconnect: true,

        /**
         * retry: 1
         * One automatic retry on transient network errors (e.g. Cloud Run cold
         * start).  Keep this low — mutations have their own retry budget.
         */
        retry: 1,
      },

      mutations: {
        /**
         * Writes are not necessarily idempotent: retrying an uncertain result
         * can create duplicate records or rotate a registration token twice.
         */
        retry: 0,
      },
    },
  });
}

// ─── Browser singleton ───────────────────────────────────────────────────────
// Used by the SSE hook and any imperative invalidation outside React trees.
// The QueryProvider also points to this instance via getQueryClient().

export const queryClient = makeQueryClient();
