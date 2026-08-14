/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT MEMBERS API - Super Admin Access
 * GET /api/tenants/[id]/members - List members for a specific tenant
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  errorResponse,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
} from '@/lib/api';
import { memberFilterSchema, idParamSchema } from '@/lib/validations';
import type { Member } from '@/lib/types/db';

type RouteParams = { id: string };

type MemberRow = {
  id: string; tenant_id: string; first_name: string; last_name: string;
  middle_name: string | null; email: string | null; phone: string;
  alternate_phone: string | null; gender: string | null; date_of_birth: Date | null;
  address: string | null; city: string | null; state: string | null; country: string;
  occupation: string | null; employer: string | null; membership_id: string | null;
  status: string; join_date: Date; baptism_date: Date | null; wedding_date: Date | null;
  family_id: string | null; is_head_of_family: boolean; notes: string | null;
  photo: string | null; created_at: Date; updated_at: Date;
};

function mapMember(row: MemberRow): Member {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    middleName: row.middle_name,
    email: row.email,
    phone: row.phone,
    alternatePhone: row.alternate_phone,
    gender: row.gender as Member['gender'],
    dateOfBirth: row.date_of_birth,
    address: row.address,
    city: row.city,
    state: row.state,
    country: row.country,
    occupation: row.occupation,
    employer: row.employer,
    membershipId: row.membership_id,
    status: row.status as Member['status'],
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

const SORT_COLUMN_MAP: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone: 'phone',
  status: 'status',
  joinDate: 'join_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

/**
 * GET /api/tenants/[id]/members
 * List all members for a specific tenant (Super Admin only)
 */
export const GET = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id: tenantId } = idParamSchema.parse(params);
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, memberFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, status, gender, departmentId, joinDateFrom, joinDateTo } = filters;

  // Verify tenant exists
  const tenantRows = await query<{ id: string; name: string }>(
    `SELECT id, name FROM tenant WHERE id = $1`,
    [tenantId]
  );
  const tenant = tenantRows[0];

  if (!tenant) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  const { skip, take } = calculatePagination(page, pageSize);

  const conditions: string[] = ['m.tenant_id = $1'];
  const params2: unknown[] = [tenantId];

  if (search) {
    params2.push(`%${search}%`);
    const idx = params2.length;
    conditions.push(
      `(m.first_name ILIKE $${idx} OR m.last_name ILIKE $${idx} OR m.email ILIKE $${idx} OR m.phone ILIKE $${idx} OR m.membership_id ILIKE $${idx})`
    );
  }
  if (status) {
    params2.push(status);
    conditions.push(`m.status = $${params2.length}`);
  }
  if (gender) {
    params2.push(gender);
    conditions.push(`m.gender = $${params2.length}`);
  }
  if (joinDateFrom) {
    params2.push(joinDateFrom);
    conditions.push(`m.join_date >= $${params2.length}`);
  }
  if (joinDateTo) {
    params2.push(joinDateTo);
    conditions.push(`m.join_date <= $${params2.length}`);
  }
  if (departmentId) {
    params2.push(departmentId);
    conditions.push(
      `EXISTS (SELECT 1 FROM department_member dm WHERE dm.member_id = m.id AND dm.department_id = $${params2.length})`
    );
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const orderColumn = SORT_COLUMN_MAP[sortBy || 'createdAt'] ?? 'created_at';
  const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const limitIdx = params2.length + 1;
  const offsetIdx = params2.length + 2;

  const [memberRows, countRows] = await Promise.all([
    query<MemberRow>(
      `SELECT m.* FROM member m ${whereClause}
       ORDER BY m.${orderColumn} ${orderDirection}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params2, take, skip]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM member m ${whereClause}`,
      params2
    ),
  ]);

  const totalCount = parseInt(countRows[0]?.count ?? '0', 10);
  const members = memberRows.map(mapMember);
  const memberIds = members.map((m) => m.id);

  const [departmentRows, offeringCounts, prayerRequestCounts] = memberIds.length
    ? await Promise.all([
        query<{ member_id: string; department_id: string; department_name: string; dm_id: string; role: string | null; joined_at: Date }>(
          `SELECT dm.id as dm_id, dm.member_id, dm.department_id, dm.role, dm.joined_at, d.name as department_name
           FROM department_member dm
           JOIN department d ON d.id = dm.department_id
           WHERE dm.member_id = ANY($1)`,
          [memberIds]
        ),
        query<{ member_id: string; count: string }>(
          `SELECT member_id, COUNT(*) as count FROM offering WHERE member_id = ANY($1) GROUP BY member_id`,
          [memberIds]
        ),
        query<{ member_id: string; count: string }>(
          `SELECT member_id, COUNT(*) as count FROM prayer_request WHERE member_id = ANY($1) GROUP BY member_id`,
          [memberIds]
        ),
      ])
    : [[], [], []];

  const departmentsByMember = new Map<string, Array<{ id: string; departmentId: string; memberId: string; role: string | null; joinedAt: Date; department: { id: string; name: string } }>>();
  for (const row of departmentRows) {
    const list = departmentsByMember.get(row.member_id) ?? [];
    list.push({
      id: row.dm_id,
      departmentId: row.department_id,
      memberId: row.member_id,
      role: row.role,
      joinedAt: row.joined_at,
      department: { id: row.department_id, name: row.department_name },
    });
    departmentsByMember.set(row.member_id, list);
  }
  const offeringCountMap = new Map(offeringCounts.map((r) => [r.member_id, parseInt(r.count, 10)]));
  const prayerRequestCountMap = new Map(prayerRequestCounts.map((r) => [r.member_id, parseInt(r.count, 10)]));

  const membersWithRelations = members.map((member) => ({
    ...member,
    departments: departmentsByMember.get(member.id) ?? [],
    _count: {
      offerings: offeringCountMap.get(member.id) ?? 0,
      prayerRequests: prayerRequestCountMap.get(member.id) ?? 0,
    },
  }));

  return successResponse(membersWithRelations, createPaginationMeta(page, pageSize, totalCount));
});
