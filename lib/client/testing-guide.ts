/**
 * ════════════════════════════════════════════════════════════════════════════
 * TanStack Query Devtools + Network Tab Testing Guide
 * lib/client/testing-guide.ts
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This file is a REFERENCE ONLY — it is not imported anywhere.
 * Read it while you have the app running with NODE_ENV=development.
 */

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * 1. NETWORK TAB — Verifying no unnecessary fetches
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * a) Open DevTools → Network tab.
 * b) Filter by "Fetch/XHR".
 * c) Navigate to a page that loads data (e.g. /members).
 *    You should see exactly ONE GET /api/members request.
 *
 * d) Switch to another tab and come back.
 *    With refetchOnWindowFocus: false → NO new request fires.
 *    (Before this PR, the old config with refetchOnWindowFocus: true would
 *    fire a new request every time you alt-tab.)
 *
 * e) Sit idle for 10 minutes.
 *    With staleTime: Infinity → NO background refetch fires.
 *    The only request that should appear is the SSE heartbeat (text/event-stream).
 *
 * f) Simulate an SSE invalidation:
 *    Open the browser console and run:
 *
 *      // Manually dispatch a fake app_change event for testing
 *      const es = new EventSource('/api/events', { withCredentials: true });
 *
 *    Then trigger a mutation from a different browser tab (or directly via:
 *      curl -X POST http://localhost:4020/api/members -d '{"firstName":"Test",...}'
 *    )
 *    Within 1-2 seconds the first tab's Network tab should show a new
 *    GET /api/members request triggered by the SSE invalidation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 2. TANSTACK QUERY DEVTOOLS — Cache inspection
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The devtools panel is rendered in development by QueryProvider (bottom-right).
 * Click the TanStack logo to open it.
 *
 * KEY THINGS TO CHECK:
 *
 * a) staleTime column
 *    All queries should show "Infinity" (∞) under "Stale Time".
 *    If you see a number like "30000", the old config is still active somewhere.
 *
 * b) Query state badges
 *    • "fresh"   → data in cache, no refetch needed
 *    • "stale"   → data older than staleTime (should never appear with Infinity)
 *    • "fetching"→ request in flight
 *    • "paused"  → offline
 *
 * c) After a mutation, watch the invalidated keys turn "stale" and immediately
 *    start "fetching".  This confirms the invalidation → refetch cycle works.
 *
 * d) Cache entries after navigating away:
 *    Navigate away from /members.  After 10 minutes the ['members'] entries
 *    should disappear (gcTime: 10 min).  While on the page they stay "fresh".
 *
 * e) Optimistic updates:
 *    Trigger an update mutation.  In the devtools panel, BEFORE the network
 *    response returns, you should see the detail cache entry already updated
 *    with the new values.  If the mutation errors, the entry reverts.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 3. SSE CONNECTION VERIFICATION
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * a) Network tab → filter by "EventStream" (or filter URL by "/api/events").
 *    You should see one persistent connection with status 200.
 *
 * b) Click on the /api/events request → "EventStream" sub-tab.
 *    You will see:
 *      • event: connected — fires immediately on connect
 *      • event: heartbeat — fires every 25 seconds
 *      • event: app_change — fires when a row is mutated in the DB
 *
 * c) Disconnect test:
 *    Disable WiFi for 10 seconds, then re-enable.
 *    The hook's exponential backoff fires; after reconnect the "connected"
 *    event appears again in the EventStream tab.
 *    Also check the browser console for "[SSE] error — reconnecting in Xms".
 *
 * d) Heartbeat watchdog test (advanced):
 *    In the browser console, patch the last heartbeat time to simulate a stale
 *    connection:
 *      // This will trigger the watchdog reconnect on the next watchdog tick (30 s)
 *      // Note: you can't directly set lastHeartbeatRef from outside the hook,
 *      // but you can test by stopping the SSE server for > 60 s.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * 4. COMPLETE VERIFICATION CHECKLIST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Run through this checklist after deploying:
 *
 * [ ] Load a data page → exactly 1 API request fires
 * [ ] Alt-tab away and back → NO new request fires
 * [ ] Wait 5 minutes idle → NO background requests fire
 * [ ] Open Devtools → all query staleTime shows "Infinity"
 * [ ] SSE connection visible in Network → EventStream tab
 * [ ] Heartbeat events appear every ~25 s in EventStream tab
 * [ ] Create a record in another tab → list in first tab refreshes within 2 s
 * [ ] Update a record → detail page in first tab shows new data within 2 s
 * [ ] Delete a record → item disappears from list immediately (optimistic)
 * [ ] Force network error on mutation → optimistic update rolls back correctly
 * [ ] Disconnect network → console shows "[SSE] error — reconnecting in Xms"
 * [ ] Reconnect network → SSE reconnects, "[SSE] connected" appears in console
 * [ ] Check Cloud Run logs → single LISTEN connection per instance, not one per request
 * [ ] Verify Postgres connections: SELECT count(*) FROM pg_stat_activity;
 *     Should be ≤ (max_instances × pool_size) + max_instances
 */

export {};
