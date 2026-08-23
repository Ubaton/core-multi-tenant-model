/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVER-SENT EVENTS — Backend endpoint
 * (app/api/events/route.ts  — Next.js edge/node route)
 *
 * NOTE: The request reads context on this end so you can migrate this file
 * verbatim to an Express/Fastify handler on Cloud Run.  See the comment block
 * at the bottom for the Express equivalent.
 * ════════════════════════════════════════════════════════════════════════════
 *
 * HOW IT WORKS:
 *  1. A raw pg.Client (NOT the Prisma pool) holds a LISTEN connection for the
 *     life of the process.  One connection shared across all SSE clients is
 *     far cheaper than one LISTEN per HTTP connection.
 *  2. DB triggers call pg_notify('app_changes', json_payload) whenever a row
 *     is inserted/updated/deleted in key tables.
 *  3. This handler registers a subscriber in a module-level Set.  When a
 *     pg NOTIFY arrives, every subscriber is notified and the JSON payload
 *     is written to their SSE stream.
 *  4. Each SSE client is a long-lived HTTP response (chunked transfer).
 *     Cloud Run must be configured with request-timeout ≥ 3600s and
 *     min-instances ≥ 1 (see Section 5 notes).
 *
 * POSTGRES TRIGGER SETUP (run once via migration):
 *  See the SQL at the bottom of this file.
 *
 * GOTCHA (Vercel):
 *  Vercel Serverless Functions have a 60 s max duration on Pro, 300 s on
 *  Enterprise.  Long-lived SSE is NOT suitable for Next.js API routes on
 *  Vercel.  This file is included for local dev + Cloud Run parity; in
 *  production the SSE endpoint MUST live on the Cloud Run Express service.
 *  The frontend hook (use-server-events.ts) points to NEXT_PUBLIC_API_URL
 *  which is your Cloud Run origin.
 */

import { NextRequest } from 'next/server';
import { getListenerPool, type AppChangeEvent } from '@/lib/sse/pg-listener';
import { getCurrentUser } from '@/lib/auth';

// ─── Route config ─────────────────────────────────────────────────────────────
// Opt out of static generation; this is always dynamic.
export const dynamic = 'force-dynamic';
// Use Node.js runtime — the Web Streams API is available here and we need
// the pg package which is Node-only.
export const runtime = 'nodejs';

// ─── SSE Headers ──────────────────────────────────────────────────────────────
function sseHeaders(origin: string | null): HeadersInit {
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '').split(',').map((s) => s.trim());
  const corsOrigin =
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] ?? '*';

  return {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx buffering on Cloud Run
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Credentials': 'true',
  };
}

// ─── GET /api/events ──────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  // Auth check — only authenticated users receive events.
  const user = await getCurrentUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const origin = request.headers.get('origin');
  const tenantId = user.tenantId ?? null;

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  function send(event: string, data: unknown) {
    const chunk = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    writer.write(encoder.encode(chunk)).catch(() => {/* stream closed */});
  }

  // Send an initial connection-established event so the client knows it's live.
  send('connected', { userId: user.id, tenantId, ts: Date.now() });

  // Send a heartbeat every 25 s to prevent proxies from killing the connection.
  const heartbeat = setInterval(() => {
    send('heartbeat', { ts: Date.now() });
  }, 25_000);

  // ── Subscribe to pg NOTIFY events ────────────────────────────────────────
  const listener = getListenerPool();

  function onAppChange(event: AppChangeEvent) {
    // Scope events to the user's tenant; super-admins receive all events.
    if (tenantId && event.tenantId && event.tenantId !== tenantId) return;
    send('app_change', event);
  }

  listener.subscribe(onAppChange);

  // ── Cleanup on client disconnect ──────────────────────────────────────────
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeat);
    listener.unsubscribe(onAppChange);
    writer.close().catch(() => {/* already closed */});
  });

  return new Response(readable, { headers: sseHeaders(origin) });
}

// ─── CORS preflight ───────────────────────────────────────────────────────────
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return new Response(null, { status: 204, headers: sseHeaders(origin) });
}

/*
 * ═══════════════════════════════════════════════════════════════════════════
 * EXPRESS EQUIVALENT (Cloud Run backend)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * import { Router, Request, Response } from 'express';
 * import { getListenerPool, AppChangeEvent } from '../sse/pg-listener';
 *
 * export const eventsRouter = Router();
 *
 * eventsRouter.get('/events', requireAuth, (req: Request, res: Response) => {
 *   const user = req.user!;
 *   const tenantId = user.tenantId ?? null;
 *
 *   res.setHeader('Content-Type', 'text/event-stream');
 *   res.setHeader('Cache-Control', 'no-cache, no-transform');
 *   res.setHeader('Connection', 'keep-alive');
 *   res.setHeader('X-Accel-Buffering', 'no');
 *   res.flushHeaders();
 *
 *   const send = (event: string, data: unknown) =>
 *     res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
 *
 *   send('connected', { userId: user.id, tenantId, ts: Date.now() });
 *
 *   const heartbeat = setInterval(() => send('heartbeat', { ts: Date.now() }), 25_000);
 *
 *   const listener = getListenerPool();
 *   const onAppChange = (event: AppChangeEvent) => {
 *     if (tenantId && event.tenantId && event.tenantId !== tenantId) return;
 *     send('app_change', event);
 *   };
 *   listener.subscribe(onAppChange);
 *
 *   req.on('close', () => {
 *     clearInterval(heartbeat);
 *     listener.unsubscribe(onAppChange);
 *     res.end();
 *   });
 * });
 */
