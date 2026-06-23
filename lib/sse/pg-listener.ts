/**
 * ════════════════════════════════════════════════════════════════════════════
 * POSTGRES NOTIFY/LISTEN MANAGER  (lib/sse/pg-listener.ts)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Maintains a SINGLE raw pg.Client connection for LISTEN.
 * ALL SSE route handlers share this one connection — no per-request DB cost.
 *
 * pg_notify payload shape:
 *   { table, action, tenantId, id, ts }
 *
 * GOTCHA (Prisma + Cloud Run):
 *  Prisma's connection pool uses short-lived connections optimised for
 *  query/response cycles.  LISTEN requires a persistent connection that
 *  MUST NOT be returned to the pool.  That's why we use a raw pg.Client here
 *  rather than Prisma's $queryRaw.
 *
 *  Prisma pool size: keep pool_size = (Cloud Run max-instances * 2) to avoid
 *  connection exhaustion.  The LISTEN client adds exactly 1 extra connection
 *  per Cloud Run instance — acceptable.
 */

import pg from 'pg';

// ─── Event shape emitted by pg_notify ────────────────────────────────────────

export interface AppChangeEvent {
  table: string;       // e.g. "Member", "Lead", "Offering"
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  tenantId: string | null;
  id: string;          // affected row PK
  ts: number;          // epoch ms
}

// ─── Subscriber registry ──────────────────────────────────────────────────────

type Subscriber = (event: AppChangeEvent) => void;

class PgListenerPool {
  private client: pg.Client | null = null;
  private subscribers = new Set<Subscriber>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1_000; // ms — doubles on each failure up to 30 s

  subscribe(fn: Subscriber) {
    this.subscribers.add(fn);
    if (!this.client) this.connect();
  }

  unsubscribe(fn: Subscriber) {
    this.subscribers.delete(fn);
    // Keep the connection alive even when there are no subscribers so
    // the next subscriber doesn't pay a cold-connect cost.
  }

  private async connect() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not set');

    // Use a direct pg connection — NOT through Prisma Accelerate/PgBouncer,
    // which proxies do not support LISTEN.  If DATABASE_URL points to a
    // pooler, set DATABASE_DIRECT_URL to the direct connection string.
    const url = process.env.DATABASE_DIRECT_URL ?? connectionString;

    this.client = new pg.Client({ connectionString: url });

    this.client.on('notification', (msg) => {
      if (msg.channel !== 'app_changes' || !msg.payload) return;
      try {
        const event = JSON.parse(msg.payload) as AppChangeEvent;
        this.subscribers.forEach((fn) => fn(event));
      } catch {
        console.error('[PgListener] malformed payload', msg.payload);
      }
    });

    this.client.on('error', (err) => {
      console.error('[PgListener] pg error', err.message);
      this.scheduleReconnect();
    });

    this.client.on('end', () => {
      console.warn('[PgListener] connection ended, reconnecting…');
      this.scheduleReconnect();
    });

    try {
      await this.client.connect();
      await this.client.query('LISTEN app_changes');
      this.reconnectDelay = 1_000; // reset backoff on success
      console.info('[PgListener] LISTEN app_changes — connected');
    } catch (err) {
      console.error('[PgListener] connect failed', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.client = null;
    const delay = Math.min(this.reconnectDelay, 30_000);
    this.reconnectDelay = delay * 2;
    console.info(`[PgListener] reconnecting in ${delay}ms`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
  }
}

// ─── Module-level singleton ───────────────────────────────────────────────────

const globalForListener = globalThis as unknown as {
  pgListenerPool?: PgListenerPool;
};

export function getListenerPool(): PgListenerPool {
  if (!globalForListener.pgListenerPool) {
    globalForListener.pgListenerPool = new PgListenerPool();
  }
  return globalForListener.pgListenerPool;
}
