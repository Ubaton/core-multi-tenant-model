/**
 * ════════════════════════════════════════════════════════════════════════════
 * QUERY CLIENT PROVIDER
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Singleton queryClient is exported for use outside React trees
 * (e.g. imperative invalidation from the SSE hook, Server Component prefetch).
 *
 * The <QueryProvider> wraps the Next.js app and passes the singleton down
 * via context so every useQuery / useMutation inside shares the same cache.
 *
 * Default strategy — "SSE-first, no redundant polling":
 *  • staleTime: Infinity  — data never goes stale on its own; only SSE
 *                           events (or explicit user actions) trigger refetches.
 *  • gcTime: 10 min       — keep unused cache entries around so navigating
 *                           back to a page is instant.
 *  • refetchOnWindowFocus: false — we have SSE; focus-refetch is redundant
 *                                   and wastes DB queries.
 *  • refetchOnReconnect: true    — if the network drops, re-sync on recovery.
 *  • retry: 1             — one automatic retry on transient network errors.
 *
 * GOTCHA (Next.js / Vercel):
 *  Do NOT instantiate QueryClient at module scope in a 'use client' file that
 *  gets imported by Server Components — it runs on every SSR request and leaks
 *  between requests. Use useState() here instead, and export the singleton
 *  from a dedicated non-'use client' module (lib/client/query-client.ts).
 */

'use client';

import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { makeQueryClient } from './query-client';

interface ProvidersProps {
  children: ReactNode;
}

// Browser-side singleton — created once per page load.
// Kept in module scope so it survives React strict-mode double-mounts.
let browserQueryClient: ReturnType<typeof makeQueryClient> | undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always create a new client to avoid sharing state between requests.
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function QueryProvider({ children }: ProvidersProps) {
  // useState ensures the client is stable across re-renders on the server too.
  const [queryClient] = useState(() => getQueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} position="bottom" />
      )}
    </QueryClientProvider>
  );
}
