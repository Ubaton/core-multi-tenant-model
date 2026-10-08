/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBER REGISTRATION - SERVER HELPERS
 * Token generation/lookup and abuse limiting for the public form.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { createHash, randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';
import { query } from '@/lib/db';

const TOKEN_BYTES = 32;
/** base64url of 32 bytes is 43 chars; anything else is rejected before the DB. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 10;
export const MAX_BODY_BYTES = 64 * 1024;

export function generateRegistrationToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url');
}

export function isWellFormedToken(token: string): boolean {
  return TOKEN_PATTERN.test(token);
}

export interface ActiveRegistrationLink {
  tenantId: string;
  tenantName: string;
  tenantLogo: string | null;
}

/**
 * Resolve a public token to its tenant. Returns null for unknown, rotated,
 * disabled or expired tokens, and for inactive/deleted tenants. Callers must
 * not distinguish between these cases to the outside world.
 */
export async function findActiveLink(token: string): Promise<ActiveRegistrationLink | null> {
  if (!isWellFormedToken(token)) return null;

  const rows = await query<{ tenant_id: string; name: string; logo: string | null }>(
    `SELECT t.id AS tenant_id, t.name, t.logo
     FROM church_opening_link rl
     JOIN tenant t ON t.id = rl.tenant_id
     WHERE rl.token = $1
       AND rl.is_active = TRUE
       AND (rl.expires_at IS NULL OR rl.expires_at > NOW())
       AND t.is_active = TRUE
       AND t.deleted_at IS NULL`,
    [token]
  );

  const row = rows[0];
  return row ? { tenantId: row.tenant_id, tenantName: row.name, tenantLogo: row.logo } : null;
}

/** Salted hash of the caller's IP: enough to rate-limit, useless to identify. */
export function hashClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = forwarded || request.headers.get('x-real-ip');
  if (!ip) return null;

  const salt = process.env.JWT_SECRET ?? '';
  return createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

/** DB-backed so the limit holds across Cloud Run instances. */
export async function isRateLimited(tenantId: string, ipHash: string | null): Promise<boolean> {
  if (!ipHash) return false;

  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM church_opening_registration
     WHERE tenant_id = $1 AND ip_hash = $2 AND created_at > NOW() - INTERVAL '1 hour'`,
    [tenantId, ipHash]
  );
  return Number(rows[0]?.count ?? 0) >= MAX_SUBMISSIONS_PER_IP_PER_HOUR;
}
