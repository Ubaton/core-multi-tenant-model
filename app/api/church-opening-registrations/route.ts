/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATIONS API (authenticated, tenant-scoped)
 * GET /api/registrations - List submissions from the public form
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import { z } from 'zod';
import { normalizeRegistrationCode } from '@/lib/church-opening/attendance';
import { isChurchOpeningEmailTenant } from '@/lib/church-opening/email';
import {
  errorResponse,
  withPermission,
  successResponse,
  calculatePagination,
  createPaginationMeta,
} from '@/lib/api';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

interface RegistrationRow {
  id: string;
  surname: string;
  names: string;
  cell_number: string;
  email: string | null;
  id_number: string | null;
  data: Record<string, string>;
  status: string;
  registration_code: string;
  checked_in_at: Date | null;
  receipt_sent_at: Date | null;
  created_at: Date;
}

function clampInt(value: string | null, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, min), max) : fallback;
}

export const GET = withPermission('list', 'member', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const page = clampInt(searchParams.get('page'), 1, 1, 100000);
  const pageSize = clampInt(searchParams.get('limit'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE);
  const search = searchParams.get('search')?.trim().slice(0, 100);
  const attendance = searchParams.get('attendance');
  const registeredBefore = searchParams.get('registeredBefore');
  const receiptEmailsEnabled = isChurchOpeningEmailTenant(context.tenant.tenant?.slug ?? '');

  const params: unknown[] = [context.tenantId];
  let where = 'tenant_id = $1';
  if (search) {
    const code = normalizeRegistrationCode(search);
    if (code) {
      params.push(code);
      where += ' AND registration_code = $2';
    } else {
      params.push(`%${search}%`);
      where += ` AND (concat_ws(' ', names, surname) ILIKE $2 OR cell_number ILIKE $2 OR email ILIKE $2)`;
    }
  }
  if (attendance === 'checked-in') where += ' AND checked_in_at IS NOT NULL';
  if (attendance === 'not-checked-in') where += ' AND checked_in_at IS NULL';
  if (receiptEmailsEnabled && searchParams.get('receipt') === 'unrecorded') {
    where += " AND receipt_sent_at IS NULL AND NULLIF(btrim(email), '') IS NOT NULL";
  }
  if (registeredBefore) {
    if (registeredBefore.startsWith('0000') || !z.iso.date().safeParse(registeredBefore).success) {
      return errorResponse('VALIDATION_ERROR', 'Enter a valid registration cutoff date', 400);
    }
    params.push(registeredBefore);
    where += ` AND created_at < ($${params.length}::date::timestamp AT TIME ZONE 'Africa/Johannesburg') AT TIME ZONE 'UTC'`;
  }

  const { skip, take } = calculatePagination(page, pageSize);

  const [rows, countRows] = await Promise.all([
    query<RegistrationRow>(
      `SELECT id, surname, names, cell_number, email, id_number, data, status, registration_code, checked_in_at, receipt_sent_at,
              created_at AT TIME ZONE 'UTC' AS created_at
       FROM church_opening_registration WHERE ${where}
       ORDER BY church_opening_registration.created_at DESC, id DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, take, skip]
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM church_opening_registration WHERE ${where}`, params),
  ]);

  const registrations = rows.map((r) => ({
    id: r.id,
    surname: r.surname,
    names: r.names,
    cellNumber: r.cell_number,
    email: r.email,
    idNumber: r.id_number,
    data: r.data,
    status: r.status,
    registrationCode: r.registration_code,
    checkedInAt: r.checked_in_at,
    receiptSentAt: r.receipt_sent_at,
    createdAt: r.created_at,
  }));

  const meta = {
    ...createPaginationMeta(page, pageSize, Number(countRows[0]?.count ?? 0)),
    receiptEmailsEnabled,
  };
  return successResponse(registrations, meta);
});
