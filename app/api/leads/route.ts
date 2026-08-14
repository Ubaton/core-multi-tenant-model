/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEADS API - LIST & CREATE
 * GET  /api/leads - List leads (tenant-scoped)
 * POST /api/leads - Create a new lead
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
import { createLeadSchema, leadFilterSchema } from '@/lib/validations';

const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  firstName: 'first_name',
  lastName: 'last_name',
  priority: 'priority',
  status: 'status',
};

interface LeadRow {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  source: string;
  source_details: string | null;
  status: string;
  notes: string | null;
  assigned_to_id: string | null;
  assigned_at: Date | null;
  converted_to_member_id: string | null;
  converted_at: Date | null;
  priority: number;
  last_contact_at: Date | null;
  next_follow_up: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapLeadRow(row: LeadRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    alternatePhone: row.alternate_phone,
    address: row.address,
    city: row.city,
    state: row.state,
    source: row.source,
    sourceDetails: row.source_details,
    status: row.status,
    notes: row.notes,
    assignedToId: row.assigned_to_id,
    assignedAt: row.assigned_at,
    convertedToMemberId: row.converted_to_member_id,
    convertedAt: row.converted_at,
    priority: row.priority,
    lastContactAt: row.last_contact_at,
    nextFollowUp: row.next_follow_up,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/leads
 * List leads with filtering and pagination
 */
export const GET = withPermission('list', 'lead', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, leadFilterSchema);
  const {
    page, pageSize, search, sortBy, sortOrder,
    status, source, assignedToId, unassigned,
    createdFrom, createdTo
  } = filters;

  const conditions: string[] = ['l.tenant_id = $1'];
  const params: unknown[] = [context.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(l.first_name ILIKE $${idx} OR l.last_name ILIKE $${idx} OR l.email ILIKE $${idx} OR l.phone ILIKE $${idx})`
    );
  }

  if (status) {
    params.push(status);
    conditions.push(`l.status = $${params.length}`);
  }

  if (source) {
    params.push(source);
    conditions.push(`l.source = $${params.length}`);
  }

  if (unassigned) {
    conditions.push(`l.assigned_to_id IS NULL`);
  } else if (assignedToId) {
    params.push(assignedToId);
    conditions.push(`l.assigned_to_id = $${params.length}`);
  }

  if (createdFrom) {
    params.push(createdFrom);
    conditions.push(`l.created_at >= $${params.length}`);
  }

  if (createdTo) {
    params.push(createdTo);
    conditions.push(`l.created_at <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORT_COLUMN_MAP[sortBy || 'createdAt'] || 'created_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];

  const [leadRows, countRows] = await Promise.all([
    query<LeadRow>(
      `SELECT l.* FROM lead l
       ${whereClause}
       ORDER BY l.${sortColumn} ${sortDirection}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM lead l ${whereClause}`, params),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const leadIds = leadRows.map((r) => r.id);
  const assignedToIds = [...new Set(leadRows.map((r) => r.assigned_to_id).filter((v): v is string => !!v))];
  const convertedMemberIds = [...new Set(leadRows.map((r) => r.converted_to_member_id).filter((v): v is string => !!v))];

  const [assignedUsers, convertedMembers, callLogCounts, commCounts] = await Promise.all([
    assignedToIds.length > 0
      ? query<{ id: string; first_name: string; last_name: string; email: string }>(
          `SELECT id, first_name, last_name, email FROM "user" WHERE id = ANY($1::text[])`,
          [assignedToIds]
        )
      : Promise.resolve([]),
    convertedMemberIds.length > 0
      ? query<{ id: string; first_name: string; last_name: string }>(
          `SELECT id, first_name, last_name FROM member WHERE id = ANY($1::text[])`,
          [convertedMemberIds]
        )
      : Promise.resolve([]),
    leadIds.length > 0
      ? query<{ lead_id: string; count: string }>(
          `SELECT lead_id, COUNT(*) AS count FROM call_log WHERE lead_id = ANY($1::text[]) GROUP BY lead_id`,
          [leadIds]
        )
      : Promise.resolve([]),
    leadIds.length > 0
      ? query<{ lead_id: string; count: string }>(
          `SELECT lead_id, COUNT(*) AS count FROM communication WHERE lead_id = ANY($1::text[]) GROUP BY lead_id`,
          [leadIds]
        )
      : Promise.resolve([]),
  ]);

  const userMap = new Map(assignedUsers.map((u) => [u.id, u]));
  const memberMap = new Map(convertedMembers.map((m) => [m.id, m]));
  const callLogCountMap = new Map(callLogCounts.map((c) => [c.lead_id, Number(c.count)]));
  const commCountMap = new Map(commCounts.map((c) => [c.lead_id, Number(c.count)]));

  const leads = leadRows.map((row) => {
    const assignedTo = row.assigned_to_id ? userMap.get(row.assigned_to_id) : undefined;
    const convertedToMember = row.converted_to_member_id ? memberMap.get(row.converted_to_member_id) : undefined;

    return {
      ...mapLeadRow(row),
      assignedTo: assignedTo
        ? { id: assignedTo.id, firstName: assignedTo.first_name, lastName: assignedTo.last_name, email: assignedTo.email }
        : null,
      convertedToMember: convertedToMember
        ? { id: convertedToMember.id, firstName: convertedToMember.first_name, lastName: convertedToMember.last_name }
        : null,
      _count: {
        callLogs: callLogCountMap.get(row.id) ?? 0,
        communications: commCountMap.get(row.id) ?? 0,
      },
    };
  });

  return successResponse(leads, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/leads
 * Create a new lead
 */
export const POST = withPermission('create', 'lead', async (request, context) => {
  const data = await parseBody(request, createLeadSchema);
  const id = randomUUID();
  const assignedAt = data.assignedToId ? new Date() : null;

  const rows = await query<LeadRow>(
    `INSERT INTO lead (
       id, tenant_id, first_name, last_name, email, phone, alternate_phone,
       address, city, state, source, source_details, status, notes,
       assigned_to_id, assigned_at, priority, next_follow_up
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
     RETURNING *`,
    [
      id,
      context.tenantId,
      data.firstName,
      data.lastName,
      data.email ?? null,
      data.phone,
      data.alternatePhone ?? null,
      data.address ?? null,
      data.city ?? null,
      data.state ?? null,
      data.source,
      data.sourceDetails ?? null,
      data.status ?? 'NEW',
      data.notes ?? null,
      data.assignedToId ?? null,
      assignedAt,
      data.priority ?? 0,
      data.nextFollowUp ?? null,
    ]
  );

  const leadRow = rows[0];

  let assignedTo: { id: string; firstName: string; lastName: string; email: string } | null = null;
  if (leadRow.assigned_to_id) {
    const userRows = await query<{ id: string; first_name: string; last_name: string; email: string }>(
      `SELECT id, first_name, last_name, email FROM "user" WHERE id = $1`,
      [leadRow.assigned_to_id]
    );
    if (userRows[0]) {
      assignedTo = {
        id: userRows[0].id,
        firstName: userRows[0].first_name,
        lastName: userRows[0].last_name,
        email: userRows[0].email,
      };
    }
  }

  const lead = { ...mapLeadRow(leadRow), assignedTo };

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_LEAD',
    'Lead',
    lead.id,
    null,
    lead,
    request
  );

  return createdResponse(lead);
});
