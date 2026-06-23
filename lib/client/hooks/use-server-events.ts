/**
 * ════════════════════════════════════════════════════════════════════════════
 * useServerEvents — SSE client hook  (lib/client/hooks/use-server-events.ts)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Connects to the SSE endpoint on your Cloud Run backend.
 * When an 'app_change' event arrives, the relevant TanStack Query keys are
 * invalidated — triggering a background refetch only for data that changed.
 *
 * RECONNECTION STRATEGY:
 *  The native EventSource already retries automatically after ~3 s on
 *  network drop.  We add exponential backoff on top for error events
 *  (e.g. auth 401, server 5xx) which the native client does NOT back off on.
 *
 * CLEANUP:
 *  The EventSource is closed when the component unmounts (useEffect return).
 *  The heartbeat monitor is cleared at the same time.
 *
 * USAGE (place in your root layout or a persistent provider):
 *
 *   // app/providers.tsx
 *   'use client';
 *   import { useServerEvents } from '@/lib/client/hooks/use-server-events';
 *
 *   export function AppProviders({ children }: { children: React.ReactNode }) {
 *     useServerEvents();          // ← single call, runs for lifetime of session
 *     return <>{children}</>;
 *   }
 *
 * GOTCHA (Vercel + Cloud Run CORS):
 *  withCredentials is required if your SSE endpoint uses cookie-based auth.
 *  EventSource does not support custom headers natively — use a token in
 *  the query string if you need Bearer auth, OR rely on HttpOnly cookies.
 *  See Section 5 for the Cloud Run CORS configuration.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../query-keys';
import type { AppChangeEvent } from '@/lib/sse/pg-listener';

// Map table names from the DB to the query key invalidation targets.
// Add rows here whenever you add a new table trigger.
const TABLE_TO_QUERY_KEY: Record<string, () => readonly unknown[]> = {
  Member:         () => queryKeys.members.all(),
  Lead:           () => queryKeys.leads.all(),
  Offering:       () => queryKeys.offerings.all(),
  PrayerRequest:  () => queryKeys.prayerRequests.all(),
  Service:        () => queryKeys.services.all(),
  Communication:  () => queryKeys.communications.all(),
  Message:        () => queryKeys.messages.all(),
};

const SSE_URL =
  (process.env.NEXT_PUBLIC_API_URL ?? '') + '/api/events';

// Maximum back-off delay in ms before attempting reconnection after an error.
const MAX_BACKOFF_MS = 30_000;

export function useServerEvents() {
  const queryClient = useQueryClient();
  const backoffRef = useRef(1_000);
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const esRef      = useRef<EventSource | null>(null);
  // Track last heartbeat to detect silent connection drops.
  const lastHeartbeatRef = useRef<number>(Date.now());

  useEffect(() => {
    let disposed = false;

    function connect() {
      if (disposed) return;

      // EventSource sends cookies automatically for same-origin; for
      // cross-origin (Cloud Run ↔ Vercel) the server must set
      // Access-Control-Allow-Credentials: true and NOT use wildcard origin.
      const es = new EventSource(SSE_URL, { withCredentials: true });
      esRef.current = es;

      es.addEventListener('connected', () => {
        console.info('[SSE] connected');
        backoffRef.current = 1_000; // reset backoff on successful connect
        lastHeartbeatRef.current = Date.now();
      });

      es.addEventListener('heartbeat', () => {
        lastHeartbeatRef.current = Date.now();
      });

      es.addEventListener('app_change', (evt: MessageEvent) => {
        try {
          const event = JSON.parse(evt.data) as AppChangeEvent;
          const getKey = TABLE_TO_QUERY_KEY[event.table];
          if (getKey) {
            queryClient.invalidateQueries({ queryKey: getKey() });
          }
        } catch {
          console.warn('[SSE] malformed app_change payload', evt.data);
        }
      });

      es.onerror = () => {
        // onerror fires on network errors AND HTTP errors (401, 5xx).
        // Close the current instance and reconnect after back-off.
        es.close();
        esRef.current = null;
        if (disposed) return;
        const delay = Math.min(backoffRef.current, MAX_BACKOFF_MS);
        backoffRef.current = delay * 2;
        console.warn(`[SSE] error — reconnecting in ${delay}ms`);
        timerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    // ── Heartbeat watchdog ─────────────────────────────────────────────────
    // If no heartbeat arrives for 60 s, the connection silently dropped
    // (e.g. Cloud Run idle timeout).  Force a fresh connection.
    const watchdog = setInterval(() => {
      if (Date.now() - lastHeartbeatRef.current > 60_000) {
        console.warn('[SSE] heartbeat timeout — forcing reconnect');
        esRef.current?.close();
        esRef.current = null;
        connect();
      }
    }, 30_000);

    return () => {
      disposed = true;
      clearInterval(watchdog);
      if (timerRef.current) clearTimeout(timerRef.current);
      esRef.current?.close();
      esRef.current = null;
    };
  }, [queryClient]);
}
