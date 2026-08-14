/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRAYER REQUESTS API - SINGLE REQUEST OPERATIONS
 * GET    /api/prayer-requests/[id] - Get prayer request details
 * PATCH  /api/prayer-requests/[id] - Update prayer request
 * DELETE /api/prayer-requests/[id] - Delete prayer request
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import { PrayerRequestStatus } from '@/lib/types/db';
import {
  withPermission,
  successResponse,
  errorResponse,
  noContentResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updatePrayerRequestSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

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

async function fetchMemberBrief(memberId: string | null, full: boolean) {
  if (!memberId) return null;
  if (full) {
    const rows = await query<{ id: string; first_name: string; last_name: string; email: string | null; phone: string }>(
      `SELECT id, first_name, last_name, email, phone FROM member WHERE id = $1`,
      [memberId]
    );
    const m = rows[0];
    return m ? { id: m.id, firstName: m.first_name, lastName: m.last_name, email: m.email, phone: m.phone } : null;
  }
  const rows = await query<{ id: string; first_name: string; last_name: string }>(
    `SELECT id, first_name, last_name FROM member WHERE id = $1`,
    [memberId]
  );
  const m = rows[0];
  return m ? { id: m.id, firstName: m.first_name, lastName: m.last_name } : null;
}

/**
 * GET /api/prayer-requests/[id]
 */
export const GET = withPermission<RouteParams>('read', 'prayer_request', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const rows = await query<PrayerRequestRow>(
    `SELECT * FROM prayer_request WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const row = rows[0];

  if (!row) {
    return errorResponse('NOT_FOUND', 'Prayer request not found', 404);
  }

  const member = await fetchMemberBrief(row.member_id, true);

  return successResponse({ ...mapPrayerRequestRow(row), member });
});

/**
 * PATCH /api/prayer-requests/[id]
 */
export const PATCH = withPermission<RouteParams>('update', 'prayer_request', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updatePrayerRequestSchema);

  const existingRows = await query<PrayerRequestRow>(
    `SELECT * FROM prayer_request WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existingRequest = existingRows[0];

  if (!existingRequest) {
    return errorResponse('NOT_FOUND', 'Prayer request not found', 404);
  }

  // Track when prayer is marked as answered
  const answeredAt =
    data.status === PrayerRequestStatus.ANSWERED && existingRequest.status !== PrayerRequestStatus.ANSWERED
      ? new Date()
      : undefined;

  const setClauses: string[] = [];
  const params2: unknown[] = [];

  function addSet(column: string, value: unknown) {
    params2.push(value);
    setClauses.push(`${column} = $${params2.length}`);
  }

  if (data.title !== undefined) addSet('title', data.title);
  if (data.description !== undefined) addSet('description', data.description);
  if (data.status !== undefined) addSet('status', data.status);
  if (data.prayerResponse !== undefined) addSet('prayer_response', data.prayerResponse);
  if (data.isUrgent !== undefined) addSet('is_urgent', data.isUrgent);
  if (answeredAt !== undefined) addSet('answered_at', answeredAt);

  setClauses.push(`updated_at = NOW()`);

  params2.push(id);
  const rows = await query<PrayerRequestRow>(
    `UPDATE prayer_request SET ${setClauses.join(', ')} WHERE id = $${params2.length} RETURNING *`,
    params2
  );
  const prayerRequestRow = rows[0];

  const member = await fetchMemberBrief(prayerRequestRow.member_id, false);
  const prayerRequest = { ...mapPrayerRequestRow(prayerRequestRow), member };

  await logAudit(
    context.user.id,
    context.tenantId,
    'UPDATE_PRAYER_REQUEST',
    'PrayerRequest',
    prayerRequest.id,
    mapPrayerRequestRow(existingRequest),
    prayerRequest,
    request
  );

  return successResponse(prayerRequest);
});

/**
 * DELETE /api/prayer-requests/[id]
 */
export const DELETE = withPermission<RouteParams>('delete', 'prayer_request', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const existingRows = await query<PrayerRequestRow>(
    `SELECT * FROM prayer_request WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existingRequest = existingRows[0];

  if (!existingRequest) {
    return errorResponse('NOT_FOUND', 'Prayer request not found', 404);
  }

  await query(`DELETE FROM prayer_request WHERE id = $1`, [id]);

  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_PRAYER_REQUEST',
    'PrayerRequest',
    id,
    mapPrayerRequestRow(existingRequest),
    null,
    request
  );

  return noContentResponse();
});
