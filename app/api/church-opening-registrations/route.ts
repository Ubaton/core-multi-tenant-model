/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTRATIONS API (authenticated, tenant-scoped)
 * GET /api/registrations - List submissions from the public form
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import {
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

  const params: unknown[] = [context.tenantId];
  let where = 'tenant_id = $1';
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (surname ILIKE $2 OR names ILIKE $2 OR cell_number ILIKE $2 OR email ILIKE $2)`;
  }

  const { skip, take } = calculatePagination(page, pageSize);

  const [rows, countRows] = await Promise.all([
    query<RegistrationRow>(
      `SELECT id, surname, names, cell_number, email, id_number, data, status, created_at
       FROM church_opening_registration WHERE ${where}
       ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
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
    createdAt: r.created_at,
  }));

  return successResponse(registrations, createPaginationMeta(page, pageSize, Number(countRows[0]?.count ?? 0)));
});
