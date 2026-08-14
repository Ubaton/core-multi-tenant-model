/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBERS API - LIST & CREATE
 * GET  /api/members - List members (tenant-scoped)
 * POST /api/members - Create a new member
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import {
  withPermission,
  successResponse,
  createdResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
} from '@/lib/api';
import { createMemberSchema, memberFilterSchema } from '@/lib/validations';

const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  firstName: 'first_name',
  lastName: 'last_name',
  joinDate: 'join_date',
  status: 'status',
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
 * GET /api/members
 * List members with filtering and pagination
 */
export const GET = withPermission('list', 'member', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, memberFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, status, gender, departmentId, joinDateFrom, joinDateTo } = filters;

  const conditions: string[] = ['m.tenant_id = $1'];
  const params: unknown[] = [context.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(m.first_name ILIKE $${idx} OR m.last_name ILIKE $${idx} OR m.email ILIKE $${idx} OR m.phone ILIKE $${idx} OR m.membership_id ILIKE $${idx})`
    );
  }

  if (status) {
    params.push(status);
    conditions.push(`m.status = $${params.length}`);
  }

  if (gender) {
    params.push(gender);
    conditions.push(`m.gender = $${params.length}`);
  }

  if (joinDateFrom) {
    params.push(joinDateFrom);
    conditions.push(`m.join_date >= $${params.length}`);
  }

  if (joinDateTo) {
    params.push(joinDateTo);
    conditions.push(`m.join_date <= $${params.length}`);
  }

  if (departmentId) {
    params.push(departmentId);
    conditions.push(`EXISTS (SELECT 1 FROM department_member dm WHERE dm.member_id = m.id AND dm.department_id = $${params.length})`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORT_COLUMN_MAP[sortBy || 'createdAt'] || 'created_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];

  const [memberRows, countRows] = await Promise.all([
    query<MemberRow>(
      `SELECT m.* FROM member m
       ${whereClause}
       ORDER BY m.${sortColumn} ${sortDirection}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM member m ${whereClause}`, params),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const memberIds = memberRows.map((r) => r.id);

  let departmentsByMember = new Map<string, { id: string; name: string }[]>();
  let offeringCounts = new Map<string, number>();
  let prayerCounts = new Map<string, number>();

  if (memberIds.length > 0) {
    const [deptRows, offeringCountRows, prayerCountRows] = await Promise.all([
      query<{ member_id: string; department_id: string; department_name: string }>(
        `SELECT dm.member_id, d.id AS department_id, d.name AS department_name
         FROM department_member dm
         JOIN department d ON d.id = dm.department_id
         WHERE dm.member_id = ANY($1::text[])`,
        [memberIds]
      ),
      query<{ member_id: string; count: string }>(
        `SELECT member_id, COUNT(*) AS count FROM offering WHERE member_id = ANY($1::text[]) GROUP BY member_id`,
        [memberIds]
      ),
      query<{ member_id: string; count: string }>(
        `SELECT member_id, COUNT(*) AS count FROM prayer_request WHERE member_id = ANY($1::text[]) GROUP BY member_id`,
        [memberIds]
      ),
    ]);

    departmentsByMember = new Map();
    for (const row of deptRows) {
      const list = departmentsByMember.get(row.member_id) ?? [];
      list.push({ id: row.department_id, name: row.department_name });
      departmentsByMember.set(row.member_id, list);
    }

    offeringCounts = new Map(offeringCountRows.map((r) => [r.member_id, Number(r.count)]));
    prayerCounts = new Map(prayerCountRows.map((r) => [r.member_id, Number(r.count)]));
  }

  const members = memberRows.map((row) => {
    const departments = (departmentsByMember.get(row.id) ?? []).map((d) => ({
      department: { id: d.id, name: d.name },
    }));

    return {
      ...mapMemberRow(row),
      departments,
      _count: {
        offerings: offeringCounts.get(row.id) ?? 0,
        prayerRequests: prayerCounts.get(row.id) ?? 0,
      },
    };
  });

  return successResponse(members, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * Generate a unique membership ID
 * Format: MBR-YYYYMMDD-XXXX (e.g., MBR-20251229-0001)
 */
async function generateMembershipId(tenantId: string): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `MBR-${dateStr}`;

  // Count members created today for this tenant to generate sequence
  const startOfDay = new Date(today);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(today);
  endOfDay.setHours(23, 59, 59, 999);

  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM member WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3`,
    [tenantId, startOfDay, endOfDay]
  );

  const todayCount = Number(rows[0]?.count ?? 0);
  const sequence = String(todayCount + 1).padStart(4, '0');
  return `${prefix}-${sequence}`;
}

/**
 * POST /api/members
 * Create a new member
 */
export const POST = withPermission('create', 'member', async (request, context) => {
  const data = await parseBody(request, createMemberSchema);

  // Auto-generate membership ID if not provided
  const membershipId = data.membershipId || await generateMembershipId(context.tenantId);
  const id = randomUUID();

  const rows = await query<MemberRow>(
    `INSERT INTO member (
       id, tenant_id, first_name, last_name, middle_name, email, phone, alternate_phone,
       gender, date_of_birth, address, city, state, country, occupation, employer,
       membership_id, status, join_date, baptism_date, wedding_date, family_id,
       is_head_of_family, notes, photo
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, COALESCE($19, CURRENT_DATE), $20, $21, $22, $23, $24, $25)
     RETURNING *`,
    [
      id,
      context.tenantId,
      data.firstName,
      data.lastName,
      data.middleName ?? null,
      data.email ?? null,
      data.phone,
      data.alternatePhone ?? null,
      data.gender ?? null,
      data.dateOfBirth ?? null,
      data.address ?? null,
      data.city ?? null,
      data.state ?? null,
      data.country ?? 'South Africa',
      data.occupation ?? null,
      data.employer ?? null,
      membershipId,
      data.status ?? 'ACTIVE',
      data.joinDate ?? null,
      data.baptismDate ?? null,
      data.weddingDate ?? null,
      data.familyId ?? null,
      data.isHeadOfFamily ?? false,
      data.notes ?? null,
      data.photo ?? null,
    ]
  );

  const memberRow = rows[0];

  const deptRows = await query<{ department_id: string; department_name: string }>(
    `SELECT d.id AS department_id, d.name AS department_name
     FROM department_member dm JOIN department d ON d.id = dm.department_id
     WHERE dm.member_id = $1`,
    [memberRow.id]
  );

  const member = {
    ...mapMemberRow(memberRow),
    departments: deptRows.map((d) => ({ department: { id: d.department_id, name: d.department_name } })),
  };

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_MEMBER',
    'Member',
    member.id,
    null,
    member,
    request
  );

  return createdResponse(member);
});
