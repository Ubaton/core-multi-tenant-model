/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRAYER REQUESTS API - LIST & CREATE
 * GET  /api/prayer-requests - List prayer requests (tenant-scoped)
 * POST /api/prayer-requests - Submit a prayer request
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import {
  withPermission,
  withPublic,
  successResponse,
  createdResponse,
  errorResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
} from '@/lib/api';
import { createPrayerRequestSchema, prayerRequestFilterSchema } from '@/lib/validations';

const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  title: 'title',
  status: 'status',
  isUrgent: 'is_urgent',
  answeredAt: 'answered_at',
};

interface PrayerRequestRow {
  id: string;
  tenant_id: string;
  member_id: string | null;
  requestor_name: string | null;
  requestor_email: string | null;
  requestor_phone: string | null;
  title: string;
  description: string;
  is_anonymous: boolean;
  is_urgent: boolean;
  status: string;
  prayer_response: string | null;
  answered_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapPrayerRequestRow(row: PrayerRequestRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    memberId: row.member_id,
    requestorName: row.requestor_name,
    requestorEmail: row.requestor_email,
    requestorPhone: row.requestor_phone,
    title: row.title,
    description: row.description,
    isAnonymous: row.is_anonymous,
    isUrgent: row.is_urgent,
    status: row.status,
    prayerResponse: row.prayer_response,
    answeredAt: row.answered_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface MemberBrief {
  id: string;
  first_name: string;
  last_name: string;
}

async function fetchMembersById(ids: string[]) {
  if (ids.length === 0) return new Map<string, MemberBrief>();
  const rows = await query<MemberBrief>(
    `SELECT id, first_name, last_name FROM member WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

function briefMember(m?: MemberBrief) {
  if (!m) return null;
  return { id: m.id, firstName: m.first_name, lastName: m.last_name };
}

/**
 * GET /api/prayer-requests
 * List prayer requests with filtering
 */
export const GET = withPermission('list', 'prayer_request', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, prayerRequestFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, status, isUrgent, memberId } = filters;

  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [context.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx} OR requestor_name ILIKE $${idx})`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (isUrgent !== undefined) {
    params.push(isUrgent);
    conditions.push(`is_urgent = $${params.length}`);
  }

  if (memberId) {
    params.push(memberId);
    conditions.push(`member_id = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORT_COLUMN_MAP[sortBy || 'createdAt'] || 'created_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];

  const [rows, countRows] = await Promise.all([
    query<PrayerRequestRow>(
      `SELECT * FROM prayer_request
       ${whereClause}
       ORDER BY is_urgent DESC, ${sortColumn} ${sortDirection}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM prayer_request ${whereClause}`, params),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);

  const memberIds = [...new Set(rows.map((r) => r.member_id).filter((v): v is string => !!v))];
  const membersById = await fetchMembersById(memberIds);

  const prayerRequests = rows.map((row) => ({
    ...mapPrayerRequestRow(row),
    member: row.member_id ? briefMember(membersById.get(row.member_id)) : null,
  }));

  return successResponse(prayerRequests, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/prayer-requests
 * Submit a prayer request (can be public)
 */
export const POST = withPublic(async (request, context) => {
  const data = await parseBody(request, createPrayerRequestSchema);

  if (!context.tenant) {
    // For public submissions, tenant must be identifiable
    return errorResponse(
      'TENANT_REQUIRED',
      'Unable to identify church for this request',
      400
    );
  }

  const tenantId = context.tenant.tenantId!;
  const id = randomUUID();

  const rows = await query<PrayerRequestRow>(
    `INSERT INTO prayer_request (
       id, tenant_id, member_id, requestor_name, requestor_email, requestor_phone,
       title, description, is_anonymous, is_urgent
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      id,
      tenantId,
      data.memberId ?? null,
      data.requestorName ?? null,
      data.requestorEmail ?? null,
      data.requestorPhone ?? null,
      data.title,
      data.description,
      data.isAnonymous ?? false,
      data.isUrgent ?? false,
    ]
  );

  const prayerRequestRow = rows[0];

  const membersById = await fetchMembersById(prayerRequestRow.member_id ? [prayerRequestRow.member_id] : []);

  const prayerRequest = {
    ...mapPrayerRequestRow(prayerRequestRow),
    member: prayerRequestRow.member_id ? briefMember(membersById.get(prayerRequestRow.member_id)) : null,
  };

  // Log audit if user is authenticated
  if (context.user) {
    await logAudit(
      context.user.id,
      tenantId,
      'CREATE_PRAYER_REQUEST',
      'PrayerRequest',
      prayerRequest.id,
      null,
      prayerRequest,
      request
    );
  }

  return createdResponse(prayerRequest);
});
