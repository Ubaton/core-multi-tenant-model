/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBERS API - BULK IMPORT
 * POST /api/members/import - Create many members from parsed CSV rows
 *
 * Every row is re-validated here (the client preview is a convenience, not a
 * trust boundary). Invalid rows and duplicate cell numbers are reported back
 * per row; all remaining rows are inserted atomically in one transaction.
 * ════════════════════════════════════════════════════════════════════════════
 */

import { randomUUID } from 'crypto';
import { query, withTransaction } from '@/lib/db';
import {
  withPermission,
  successResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import {
  importRequestSchema,
  validateImportRow,
  phoneKey,
  type ImportRow,
  type RawImportRow,
} from '@/lib/members-import';

/** Row numbers are reported as spreadsheet rows: header is row 1. */
const FIRST_DATA_ROW = 2;

interface RowIssue {
  row: number;
  name: string;
  reasons: string[];
}

function displayName(raw: RawImportRow): string {
  const parts = [raw.firstName, raw.lastName].filter((p): p is string => typeof p === 'string' && p.trim() !== '');
  return parts.join(' ').trim() || '(blank)';
}

/**
 * Next free sequence numbers for today's MBR-YYYYMMDD-XXXX ids. Based on the
 * highest existing sequence rather than a row count so deletions can't cause
 * a collision.
 */
async function nextMembershipIds(tenantId: string, count: number): Promise<string[]> {
  const prefix = `MBR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
  const rows = await query<{ membership_id: string }>(
    `SELECT membership_id FROM member WHERE tenant_id = $1 AND membership_id LIKE $2`,
    [tenantId, `${prefix}-%`]
  );

  const highest = rows.reduce((max, r) => {
    const sequence = Number(r.membership_id.slice(prefix.length + 1));
    return Number.isFinite(sequence) && sequence > max ? sequence : max;
  }, 0);

  return Array.from({ length: count }, (_, i) => `${prefix}-${String(highest + i + 1).padStart(4, '0')}`);
}

export const POST = withPermission('create', 'member', async (request, context) => {
  const { rows } = await parseBody(request, importRequestSchema);

  const invalid: RowIssue[] = [];
  const skipped: RowIssue[] = [];
  const valid: { rowNumber: number; row: ImportRow }[] = [];

  rows.forEach((raw, index) => {
    const rowNumber = index + FIRST_DATA_ROW;
    const result = validateImportRow(raw as RawImportRow);
    if (result.ok) {
      valid.push({ rowNumber, row: result.row });
    } else {
      invalid.push({ row: rowNumber, name: displayName(raw as RawImportRow), reasons: result.errors });
    }
  });

  // Duplicate cell numbers: against existing members, and within the file.
  const existingRows = await query<{ phone: string }>(`SELECT phone FROM member WHERE tenant_id = $1`, [context.tenantId]);
  const seen = new Set(existingRows.map((r) => phoneKey(r.phone)));
  const toInsert: ImportRow[] = [];

  for (const { rowNumber, row } of valid) {
    const key = phoneKey(row.phone);
    if (seen.has(key)) {
      skipped.push({
        row: rowNumber,
        name: `${row.firstName} ${row.lastName}`,
        reasons: ['A member with this cell number already exists'],
      });
      continue;
    }
    seen.add(key);
    toInsert.push(row);
  }

  if (toInsert.length > 0) {
    const membershipIds = await nextMembershipIds(context.tenantId, toInsert.length);

    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO member (
           id, tenant_id, first_name, last_name, email, phone, country, state,
           membership_id, status, join_date, is_head_of_family
         )
         SELECT id, $1, first_name, last_name, email, phone, country, state,
                membership_id, 'ACTIVE'::member_status, CURRENT_DATE, FALSE
         FROM unnest($2::text[], $3::text[], $4::text[], $5::text[], $6::text[], $7::text[], $8::text[], $9::text[])
           AS t(id, first_name, last_name, email, phone, country, state, membership_id)`,
        [
          context.tenantId,
          toInsert.map(() => randomUUID()),
          toInsert.map((r) => r.firstName),
          toInsert.map((r) => r.lastName),
          toInsert.map((r) => r.email ?? null),
          toInsert.map((r) => r.phone),
          toInsert.map((r) => r.country),
          toInsert.map((r) => r.state ?? null),
          membershipIds,
        ]
      );
    });
  }

  const summary = {
    total: rows.length,
    created: toInsert.length,
    skipped,
    invalid,
  };

  await logAudit(
    context.user.id,
    context.tenantId,
    'IMPORT_MEMBERS',
    'Member',
    randomUUID(),
    null,
    { total: summary.total, created: summary.created, skipped: skipped.length, invalid: invalid.length },
    request
  );

  return successResponse(summary);
});
