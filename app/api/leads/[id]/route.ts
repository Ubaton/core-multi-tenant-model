/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEADS API - SINGLE LEAD OPERATIONS
 * GET    /api/leads/[id] - Get lead details
 * PATCH  /api/leads/[id] - Update lead
 * DELETE /api/leads/[id] - Delete lead
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
import { updateLeadSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

const FIELD_TO_COLUMN: Record<string, string> = {
  firstName: 'first_name',
  lastName: 'last_name',
  email: 'email',
  phone: 'phone',
  alternatePhone: 'alternate_phone',
  address: 'address',
  city: 'city',
  state: 'state',
  source: 'source',
  sourceDetails: 'source_details',
  status: 'status',
  notes: 'notes',
  assignedToId: 'assigned_to_id',
  priority: 'priority',
  nextFollowUp: 'next_follow_up',
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
 * GET /api/leads/[id]
 * Get lead details
 */
export const GET = withPermission<RouteParams>('read', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const rows = await query<LeadRow>(
    `SELECT * FROM lead WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const leadRow = rows[0];

  if (!leadRow) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  const [assignedToRows, convertedMemberRows, callLogRows, commRows] = await Promise.all([
    leadRow.assigned_to_id
      ? query<{ id: string; first_name: string; last_name: string; email: string; phone: string | null }>(
          `SELECT id, first_name, last_name, email, phone FROM "user" WHERE id = $1`,
          [leadRow.assigned_to_id]
        )
      : Promise.resolve([]),
    leadRow.converted_to_member_id
      ? query<{ id: string; first_name: string; last_name: string; phone: string }>(
          `SELECT id, first_name, last_name, phone FROM member WHERE id = $1`,
          [leadRow.converted_to_member_id]
        )
      : Promise.resolve([]),
    query<{
      id: string; outcome: string; duration: number | null; notes: string | null;
      called_at: Date; operator_id: string; operator_first_name: string; operator_last_name: string;
    }>(
      `SELECT c.id, c.outcome, c.duration, c.notes, c.called_at, c.operator_id,
              u.first_name AS operator_first_name, u.last_name AS operator_last_name
       FROM call_log c JOIN "user" u ON u.id = c.operator_id
       WHERE c.lead_id = $1 ORDER BY c.called_at DESC LIMIT 10`,
      [id]
    ),
    query<{ id: string; type: string; message: string; status: string; created_at: Date }>(
      `SELECT id, type, message, status, created_at FROM communication WHERE lead_id = $1 ORDER BY created_at DESC LIMIT 10`,
      [id]
    ),
  ]);

  const lead = {
    ...mapLeadRow(leadRow),
    assignedTo: assignedToRows[0]
      ? {
          id: assignedToRows[0].id,
          firstName: assignedToRows[0].first_name,
          lastName: assignedToRows[0].last_name,
          email: assignedToRows[0].email,
          phone: assignedToRows[0].phone,
        }
      : null,
    convertedToMember: convertedMemberRows[0]
      ? {
          id: convertedMemberRows[0].id,
          firstName: convertedMemberRows[0].first_name,
          lastName: convertedMemberRows[0].last_name,
          phone: convertedMemberRows[0].phone,
        }
      : null,
    callLogs: callLogRows.map((c) => ({
      id: c.id,
      outcome: c.outcome,
      duration: c.duration,
      notes: c.notes,
      calledAt: c.called_at,
      operator: { id: c.operator_id, firstName: c.operator_first_name, lastName: c.operator_last_name },
    })),
    communications: commRows.map((c) => ({
      id: c.id,
      type: c.type,
      message: c.message,
      status: c.status,
      createdAt: c.created_at,
    })),
  };

  return successResponse(lead);
});

/**
 * PATCH /api/leads/[id]
 * Update lead
 */
export const PATCH = withPermission<RouteParams>('update', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updateLeadSchema);

  // Get current lead for audit
  const existingRows = await query<LeadRow>(
    `SELECT * FROM lead WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existingLead = existingRows[0];

  if (!existingLead) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(data)) {
    const column = FIELD_TO_COLUMN[key];
    if (!column || value === undefined) continue;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  // Track assignment changes
  if (data.assignedToId && data.assignedToId !== existingLead.assigned_to_id) {
    values.push(new Date());
    setClauses.push(`assigned_at = $${values.length}`);
  }

  values.push(new Date());
  setClauses.push(`last_contact_at = $${values.length}`);

  values.push(id);

  const updatedRows = await query<LeadRow>(
    `UPDATE lead SET ${setClauses.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  );
  const leadRow = updatedRows[0];

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
    'UPDATE_LEAD',
    'Lead',
    lead.id,
    mapLeadRow(existingLead),
    lead,
    request
  );

  return successResponse(lead);
});

/**
 * DELETE /api/leads/[id]
 * Delete lead
 */
export const DELETE = withPermission<RouteParams>('delete', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const existingRows = await query<LeadRow>(
    `SELECT * FROM lead WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existingLead = existingRows[0];

  if (!existingLead) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  await query(`DELETE FROM lead WHERE id = $1`, [id]);

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_LEAD',
    'Lead',
    id,
    mapLeadRow(existingLead),
    null,
    request
  );

  return noContentResponse();
});
