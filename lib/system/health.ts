/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM HEALTH
 * Probes the database and keeps a short in-memory history of recent checks so
 * the Super Admin settings page can report availability and the last failure.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';

/** How many recent probes to keep. History is per-process and resets on deploy. */
const HISTORY_LIMIT = 20;

export type HealthStatus = 'online' | 'degraded' | 'offline';

/** A probe is degraded rather than online once it takes longer than this. */
const DEGRADED_LATENCY_MS = 1000;

export interface HealthCheck {
  status: HealthStatus;
  /** Round-trip time of the probe query in milliseconds. */
  latencyMs: number;
  /** PostgreSQL server version, e.g. "PostgreSQL 16.4". Null when unreachable. */
  database: string | null;
  /** Human-readable failure reason, null when the probe succeeded. */
  error: string | null;
  checkedAt: string;
}

export interface HealthReport extends HealthCheck {
  /** Most recent probes, newest first. */
  history: HealthCheck[];
  /** Percentage of successful probes in the retained history. */
  uptimePercent: number;
  /** The most recent failing probe, if any is still in the history. */
  lastFailure: HealthCheck | null;
}

const globalForHealth = globalThis as unknown as {
  systemHealthHistory: HealthCheck[] | undefined;
};

const history = globalForHealth.systemHealthHistory ?? [];
globalForHealth.systemHealthHistory = history;

/**
 * Probe the database and record the result in the availability history.
 */
export async function checkDatabaseHealth(): Promise<HealthReport> {
  const startedAt = Date.now();
  let check: HealthCheck;

  try {
    const rows = await query<{ version: string }>('SELECT version()');
    const latencyMs = Date.now() - startedAt;
    const raw = rows[0]?.version ?? '';
    const match = raw.match(/^PostgreSQL\s+([\d.]+)/i);

    check = {
      status: latencyMs > DEGRADED_LATENCY_MS ? 'degraded' : 'online',
      latencyMs,
      database: match ? `PostgreSQL ${match[1]}` : 'PostgreSQL',
      error: null,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    check = {
      status: 'offline',
      latencyMs: Date.now() - startedAt,
      database: null,
      error: error instanceof Error ? error.message : 'Unknown database error',
      checkedAt: new Date().toISOString(),
    };
  }

  history.unshift(check);
  history.splice(HISTORY_LIMIT);

  return buildReport(check);
}

/**
 * The last recorded probe without running a new one, or null if none yet.
 */
export function getLastHealthReport(): HealthReport | null {
  return history[0] ? buildReport(history[0]) : null;
}

function buildReport(check: HealthCheck): HealthReport {
  const healthy = history.filter((entry) => entry.status !== 'offline').length;

  return {
    ...check,
    history: [...history],
    uptimePercent: history.length
      ? Math.round((healthy / history.length) * 1000) / 10
      : 0,
    lastFailure: history.find((entry) => entry.status === 'offline') ?? null,
  };
}
