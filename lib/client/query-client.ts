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
         * staleTime: Infinity
         * Data never goes stale on its own — the SSE hook is solely responsible
         * for signalling when remote data has changed.  This eliminates ALL
         * background refetches that TanStack would otherwise schedule.
         *
         * Override per-query when you genuinely need time-based freshness:
         *   useQuery({ queryKey: ..., staleTime: 60_000 })
         */
        staleTime: Infinity,

        /**
         * gcTime: 10 minutes
         * Keep cache entries for 10 min after all subscribers unmount.
         * Navigating back to a page re-uses the cache instantly while SSE
         * decides whether to invalidate.
         */
        gcTime: 10 * 60 * 1000,

        /**
         * refetchOnWindowFocus: false
         * With SSE delivering invalidations in real-time, focus-based refetches
         * are pure waste.  Disabled globally.
         */
        refetchOnWindowFocus: false,

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
         * retry: 1 for mutations too.  Cloud Run can respond slowly on first
         * request after scale-to-zero; a single retry handles that gracefully.
         */
        retry: 1,
      },
    },
  });
}

// ─── Browser singleton ───────────────────────────────────────────────────────
// Used by the SSE hook and any imperative invalidation outside React trees.
// The QueryProvider also points to this instance via getQueryClient().

export const queryClient = makeQueryClient();
