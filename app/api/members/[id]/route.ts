/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBERS API - SINGLE MEMBER OPERATIONS
 * GET    /api/members/[id] - Get member details
 * PATCH  /api/members/[id] - Update member
 * DELETE /api/members/[id] - Delete member
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  withPermission,
  successResponse,
  errorResponse,
  noContentResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateMemberSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

const FIELD_TO_COLUMN: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  middleName: 'middle_name',
  email: 'email',
  phone: 'phone',
  alternatePhone: 'alternate_phone',
  gender: 'gender',
  dateOfBirth: 'date_of_birth',
  address: 'address',
  city: 'city',
  state: 'state',
  country: 'country',
  occupation: 'occupation',
  employer: 'employer',
  membershipId: 'membership_id',
  status: 'status',
  joinDate: 'join_date',
  baptismDate: 'baptism_date',
  weddingDate: 'wedding_date',
  familyId: 'family_id',
  isHeadOfFamily: 'is_head_of_family',
  notes: 'notes',
  photo: 'photo',
};

interface MemberRow {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  middle_name: string | null;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  gender: string | null;
  date_of_birth: Date | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  occupation: string | null;
  employer: string | null;
  membership_id: string | null;
  status: string;
  join_date: Date;
  baptism_date: Date | null;
  wedding_date: Date | null;
  family_id: string | null;
  is_head_of_family: boolean;
  notes: string | null;
  photo: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapMemberRow(row: MemberRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    email: row.email,
    phone: row.phone,
    alternatePhone: row.alternate_phone,
    gender: row.gender,
    dateOfBirth: row.date_of_birth,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    occupation: row.occupation,
    employer: row.employer,
    membershipId: row.membership_id,
    status: row.status,
    joinDate: row.join_date,
    baptismDate: row.baptism_date,
    weddingDate: row.wedding_date,
    familyId: row.family_id,
    isHeadOfFamily: row.is_head_of_family,
    notes: row.notes,
    photo: row.photo,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/members/[id]
 * Get member details
 */
export const GET = withPermission<RouteParams>('read', 'member', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const rows = await query<MemberRow>(
    `SELECT * FROM member WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const memberRow = rows[0];

  if (!memberRow) {
    return errorResponse('NOT_FOUND', 'Member not found', 404);
  }

  const [deptRows, offeringRows, prayerRows, callLogRows, leadRows] = await Promise.all([
    query<{ department_id: string; department_name: string }>(
      `SELECT d.id AS department_id, d.name AS department_name
       FROM department_member dm JOIN department d ON d.id = dm.department_id
       WHERE dm.member_id = $1`,
      [id]
    ),
    query<{ id: string; type: string; amount: string; currency: string; given_at: Date }>(
      `SELECT id, type, amount, currency, given_at FROM offering WHERE member_id = $1 ORDER BY given_at DESC LIMIT 10`,
      [id]
    ),
    query<{ id: string; title: string; status: string; created_at: Date }>(
      `SELECT id, title, status, created_at FROM prayer_request WHERE member_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [id]
    ),
    query<{ id: string; outcome: string; notes: string | null; called_at: Date }>(
      `SELECT id, outcome, notes, called_at FROM call_log WHERE member_id = $1 ORDER BY called_at DESC LIMIT 5`,
      [id]
    ),
    query<{ id: string; source: string; converted_at: Date | null }>(
      `SELECT id, source, converted_at FROM lead WHERE converted_to_member_id = $1`,
      [id]
    ),
  ]);

  const member = {
    ...mapMemberRow(memberRow),
    departments: deptRows.map((d) => ({ department: { id: d.department_id, name: d.department_name } })),
    offerings: offeringRows.map((o) => ({
      id: o.id,
      type: o.type,
      amount: o.amount,
      currency: o.currency,
      givenAt: o.given_at,
    })),
    prayerRequests: prayerRows.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      createdAt: p.created_at,
    })),
    callLogs: callLogRows.map((c) => ({
      id: c.id,
      outcome: c.outcome,
      notes: c.notes,
      calledAt: c.called_at,
    })),
    convertedFromLead: leadRows[0]
      ? { id: leadRows[0].id, source: leadRows[0].source, convertedAt: leadRows[0].converted_at }
      : null,
  };

  return successResponse(member);
});

/**
 * PATCH /api/members/[id]
 * Update member
 */
export const PATCH = withPermission<RouteParams>('update', 'member', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updateMemberSchema);

  // Get current member for audit
  const existingRows = await query<MemberRow>(
    `SELECT * FROM member WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existingMember = existingRows[0];

  if (!existingMember) {
    return errorResponse('NOT_FOUND', 'Member not found', 404);
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    const column = FIELD_TO_COLUMN[key];
    if (!column || value === undefined) continue;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  let updatedRow: MemberRow;
  if (setClauses.length === 0) {
    updatedRow = existingMember;
  } else {
    values.push(id);
    const updatedRows = await query<MemberRow>(
      `UPDATE member SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
      values
    );
    updatedRow = updatedRows[0];
  }

  const deptRows = await query<{ department_id: string; department_name: string }>(
    `SELECT d.id AS department_id, d.name AS department_name
     FROM department_member dm JOIN department d ON d.id = dm.department_id
     WHERE dm.member_id = $1`,
    [id]
  );

  const member = {
    ...mapMemberRow(updatedRow),
    departments: deptRows.map((d) => ({ department: { id: d.department_id, name: d.department_name } })),
  };

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'UPDATE_MEMBER',
    'Member',
    member.id,
    mapMemberRow(existingMember),
    member,
    request
  );

  return successResponse(member);
});

/**
 * DELETE /api/members/[id]
 * Delete member
 */
export const DELETE = withPermission<RouteParams>('delete', 'member', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const existingRows = await query<MemberRow>(
    `SELECT * FROM member WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existingMember = existingRows[0];

  if (!existingMember) {
    return errorResponse('NOT_FOUND', 'Member not found', 404);
  }

  // Delete member (cascades to related records based on schema)
  await query(`DELETE FROM member WHERE id = $1`, [id]);

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_MEMBER',
    'Member',
    id,
    mapMemberRow(existingMember),
    null,
    request
  );

  return noContentResponse();
});
