/**
 * ════════════════════════════════════════════════════════════════════════════
 * CALL LOGS API - LIST & CREATE
 * GET  /api/calls - List call logs (tenant-scoped)
 * POST /api/calls - Record a call
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
import { createCallLogSchema, searchSchema } from '@/lib/validations';
import { z } from 'zod';
import { CallOutcome } from '@/lib/types/db';

const callLogFilterSchema = searchSchema.extend({
  outcome: z.nativeEnum(CallOutcome).optional(),
  operatorId: z.string().cuid().optional(),
  memberId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  requiresFollowUp: z.coerce.boolean().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: '"createdAt"',
  updatedAt: '"updatedAt"',
  calledAt: '"calledAt"',
  duration: 'duration',
  outcome: 'outcome',
};

interface CallLogRow {
  id: string;
  tenant_id: string;
  operator_id: string;
  member_id: string | null;
  lead_id: string | null;
  phone_number: string;
  outcome: CallOutcome;
  duration: number | null;
  notes: string | null;
  requires_follow_up: boolean;
  follow_up_date: Date | null;
  follow_up_notes: string | null;
  called_at: Date;
  created_at: Date;
  updated_at: Date;
}

function mapCallLogRow(row: CallLogRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    operatorId: row.operator_id,
    memberId: row.member_id,
    leadId: row.lead_id,
    phoneNumber: row.phone_number,
    outcome: row.outcome,
    duration: row.duration,
    notes: row.notes,
    requiresFollowUp: row.requires_follow_up,
    followUpDate: row.follow_up_date,
    followUpNotes: row.follow_up_notes,
    calledAt: row.called_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PersonBrief {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
}

async function fetchMembersById(ids: string[]) {
  if (ids.length === 0) return new Map<string, PersonBrief>();
  const rows = await query<PersonBrief>(
    `SELECT id, "firstName" AS first_name, "lastName" AS last_name, phone FROM "Member" WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

async function fetchLeadsById(ids: string[]) {
  if (ids.length === 0) return new Map<string, PersonBrief>();
  const rows = await query<PersonBrief>(
    `SELECT id, "firstName" AS first_name, "lastName" AS last_name, phone FROM "Lead" WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

async function fetchOperatorsById(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; first_name: string; last_name: string }>();
  const rows = await query<{ id: string; first_name: string; last_name: string }>(
    `SELECT id, "firstName" AS first_name, "lastName" AS last_name FROM "User" WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

function briefPerson(p?: PersonBrief) {
  if (!p) return null;
  return { id: p.id, firstName: p.first_name, lastName: p.last_name, phone: p.phone };
}

function briefPersonNoPhone(p?: { id: string; first_name: string; last_name: string }) {
  if (!p) return null;
  return { id: p.id, firstName: p.first_name, lastName: p.last_name };
}

/**
 * GET /api/calls
 * List call logs with filtering
 */
export const GET = withPermission('list', 'call_log', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, callLogFilterSchema);
  const {
    page, pageSize, search, sortBy, sortOrder,
    outcome, operatorId, memberId, leadId, requiresFollowUp, from, to
  } = filters;

  const conditions: string[] = ['"tenantId" = $1'];
  const params: unknown[] = [context.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`("phoneNumber" ILIKE $${idx} OR notes ILIKE $${idx})`);
  }

  if (outcome) {
    params.push(outcome);
    conditions.push(`outcome = $${params.length}`);
  }

  if (operatorId) {
    params.push(operatorId);
    conditions.push(`"operatorId" = $${params.length}`);
  }

  if (memberId) {
    params.push(memberId);
    conditions.push(`"memberId" = $${params.length}`);
  }

  if (leadId) {
    params.push(leadId);
    conditions.push(`"leadId" = $${params.length}`);
  }

  if (requiresFollowUp !== undefined) {
    params.push(requiresFollowUp);
    conditions.push(`"requiresFollowUp" = $${params.length}`);
  }

  if (from) {
    params.push(from);
    conditions.push(`"calledAt" >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    conditions.push(`"calledAt" <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORT_COLUMN_MAP[sortBy || 'calledAt'] || '"calledAt"';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];

  const [rows, countRows] = await Promise.all([
    query<CallLogRow>(
      `SELECT
         id,
         "tenantId" AS tenant_id,
         "operatorId" AS operator_id,
         "memberId" AS member_id,
         "leadId" AS lead_id,
         "phoneNumber" AS phone_number,
         outcome,
         duration,
         notes,
         "requiresFollowUp" AS requires_follow_up,
         "followUpDate" AS follow_up_date,
         "followUpNotes" AS follow_up_notes,
         "calledAt" AS called_at,
         "createdAt" AS created_at,
         "updatedAt" AS updated_at
       FROM "CallLog"
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM "CallLog" ${whereClause}`, params),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);

  const operatorIds = [...new Set(rows.map((r) => r.operator_id).filter((v): v is string => !!v))];
  const memberIds = [...new Set(rows.map((r) => r.member_id).filter((v): v is string => !!v))];
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter((v): v is string => !!v))];

  const [operatorsById, membersById, leadsById] = await Promise.all([
    fetchOperatorsById(operatorIds),
    fetchMembersById(memberIds),
    fetchLeadsById(leadIds),
  ]);

  const callLogs = rows.map((row) => ({
    ...mapCallLogRow(row),
    operator: briefPersonNoPhone(operatorsById.get(row.operator_id)),
    member: row.member_id ? briefPerson(membersById.get(row.member_id)) : null,
    lead: row.lead_id ? briefPerson(leadsById.get(row.lead_id)) : null,
  }));

  return successResponse(callLogs, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/calls
 * Record a new call
 */
export const POST = withPermission('create', 'call_log', async (request, context) => {
  const data = await parseBody(request, createCallLogSchema);

  const id = randomUUID();
  const rows = await query<CallLogRow>(
    `INSERT INTO "CallLog" (
       id, "tenantId", "operatorId", "memberId", "leadId", "phoneNumber", outcome,
       duration, notes, "requiresFollowUp", "followUpDate", "followUpNotes"
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING
       id,
       "tenantId" AS tenant_id,
       "operatorId" AS operator_id,
       "memberId" AS member_id,
       "leadId" AS lead_id,
       "phoneNumber" AS phone_number,
       outcome,
       duration,
       notes,
       "requiresFollowUp" AS requires_follow_up,
       "followUpDate" AS follow_up_date,
       "followUpNotes" AS follow_up_notes,
       "calledAt" AS called_at,
       "createdAt" AS created_at,
       "updatedAt" AS updated_at`,
    [
      id,
      context.tenantId,
      context.user.id,
      data.memberId ?? null,
      data.leadId ?? null,
      data.phoneNumber,
      data.outcome,
      data.duration ?? null,
      data.notes ?? null,
      data.requiresFollowUp ?? false,
      data.followUpDate ?? null,
      data.followUpNotes ?? null,
    ]
  );

  const callLogRow = rows[0];

  const [operatorsById, membersById, leadsById] = await Promise.all([
    fetchOperatorsById([callLogRow.operator_id]),
    fetchMembersById(callLogRow.member_id ? [callLogRow.member_id] : []),
    fetchLeadsById(callLogRow.lead_id ? [callLogRow.lead_id] : []),
  ]);

  const callLog = {
    ...mapCallLogRow(callLogRow),
    operator: briefPersonNoPhone(operatorsById.get(callLogRow.operator_id)),
    member: callLogRow.member_id
      ? (() => {
          const m = membersById.get(callLogRow.member_id!);
          return m ? { id: m.id, firstName: m.first_name, lastName: m.last_name } : null;
        })()
      : null,
    lead: callLogRow.lead_id
      ? (() => {
          const l = leadsById.get(callLogRow.lead_id!);
          return l ? { id: l.id, firstName: l.first_name, lastName: l.last_name } : null;
        })()
      : null,
  };

  // Update lead's lastContactAt if this is a lead call
  if (data.leadId) {
    await query(`UPDATE "Lead" SET "lastContactAt" = NOW() WHERE id = $1`, [data.leadId]);
  }

  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_CALL_LOG',
    'CallLog',
    callLog.id,
    null,
    callLog,
    request
  );

  return createdResponse(callLog);
});
