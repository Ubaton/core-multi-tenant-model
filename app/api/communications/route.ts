/**
 * ════════════════════════════════════════════════════════════════════════════
 * COMMUNICATIONS API - LIST & CREATE
 * GET  /api/communications - List communications (tenant-scoped)
 * POST /api/communications - Create a new communication
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
import { z } from 'zod';
import { CommunicationType, CommunicationStatus } from '@/lib/types/db';

// Validation schemas
const communicationFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  type: z.nativeEnum(CommunicationType).optional(),
  status: z.nativeEnum(CommunicationStatus).optional(),
  memberId: z.string().optional(),
  leadId: z.string().optional(),
});

const createCommunicationSchema = z.object({
  type: z.nativeEnum(CommunicationType),
  subject: z.string().max(500).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  memberId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  recipientPhone: z.string().max(20).optional(),
  recipientEmail: z.string().email().optional(),
});

const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  sentAt: 'sent_at',
  deliveredAt: 'delivered_at',
  type: 'type',
  status: 'status',
  subject: 'subject',
};

interface CommunicationRow {
  id: string;
  tenant_id: string;
  type: CommunicationType;
  subject: string | null;
  message: string;
  member_id: string | null;
  lead_id: string | null;
  recipient_phone: string | null;
  recipient_email: string | null;
  sender_id: string;
  status: CommunicationStatus;
  sent_at: Date | null;
  delivered_at: Date | null;
  failure_reason: string | null;
  external_id: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapCommunicationRow(row: CommunicationRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    type: row.type,
    subject: row.subject,
    message: row.message,
    memberId: row.member_id,
    leadId: row.lead_id,
    recipientPhone: row.recipient_phone,
    recipientEmail: row.recipient_email,
    senderId: row.sender_id,
    status: row.status,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    failureReason: row.failure_reason,
    externalId: row.external_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PersonBrief {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
}

async function fetchMembersById(ids: string[]) {
  if (ids.length === 0) return new Map<string, PersonBrief>();
  const rows = await query<PersonBrief>(
    `SELECT id, first_name, last_name, phone, email FROM member WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

async function fetchLeadsById(ids: string[]) {
  if (ids.length === 0) return new Map<string, PersonBrief>();
  const rows = await query<PersonBrief>(
    `SELECT id, first_name, last_name, phone, email FROM lead WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

async function fetchUsersById(ids: string[]) {
  if (ids.length === 0) return new Map<string, { id: string; first_name: string; last_name: string }>();
  const rows = await query<{ id: string; first_name: string; last_name: string }>(
    `SELECT id, first_name, last_name FROM "user" WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

function briefMember(m?: PersonBrief) {
  if (!m) return null;
  return { id: m.id, firstName: m.first_name, lastName: m.last_name, phone: m.phone, email: m.email };
}

function briefUser(u?: { id: string; first_name: string; last_name: string }) {
  if (!u) return null;
  return { id: u.id, firstName: u.first_name, lastName: u.last_name };
}

/**
 * GET /api/communications
 * List communications with filtering and pagination
 */
export const GET = withPermission('list', 'communication', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, communicationFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, type, status, memberId, leadId } = filters;

  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [context.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(subject ILIKE $${idx} OR message ILIKE $${idx} OR recipient_phone ILIKE $${idx} OR recipient_email ILIKE $${idx})`
    );
  }

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (memberId) {
    params.push(memberId);
    conditions.push(`member_id = $${params.length}`);
  }

  if (leadId) {
    params.push(leadId);
    conditions.push(`lead_id = $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORT_COLUMN_MAP[sortBy || 'createdAt'] || 'created_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];

  const [rows, countRows] = await Promise.all([
    query<CommunicationRow>(
      `SELECT
         id,
         tenant_id,
         type,
         subject,
         message,
         member_id,
         lead_id,
         recipient_phone,
         recipient_email,
         sender_id,
         status,
         sent_at,
         delivered_at,
         failure_reason,
         external_id,
         created_at,
         updated_at
       FROM communication
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM communication ${whereClause}`, params),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);

  const memberIds = [...new Set(rows.map((r) => r.member_id).filter((v): v is string => !!v))];
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter((v): v is string => !!v))];
  const senderIds = [...new Set(rows.map((r) => r.sender_id).filter((v): v is string => !!v))];

  const [membersById, leadsById, sendersById] = await Promise.all([
    fetchMembersById(memberIds),
    fetchLeadsById(leadIds),
    fetchUsersById(senderIds),
  ]);

  const communications = rows.map((row) => ({
    ...mapCommunicationRow(row),
    member: row.member_id ? briefMember(membersById.get(row.member_id)) : null,
    lead: row.lead_id ? briefMember(leadsById.get(row.lead_id)) : null,
    sender: briefUser(sendersById.get(row.sender_id)),
  }));

  return successResponse(communications, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/communications
 * Create a new communication
 */
export const POST = withPermission('create', 'communication', async (request, context) => {
  const data = await parseBody(request, createCommunicationSchema);

  // Validate that at least one recipient is specified
  if (!data.memberId && !data.leadId && !data.recipientPhone && !data.recipientEmail) {
    throw new Error('At least one recipient must be specified');
  }

  // Get recipient contact info if member or lead is specified
  let recipientPhone = data.recipientPhone;
  let recipientEmail = data.recipientEmail;

  if (data.memberId && !recipientPhone && !recipientEmail) {
    const rows = await query<{ phone: string | null; email: string | null }>(
      `SELECT phone, email FROM member WHERE id = $1`,
      [data.memberId]
    );
    const member = rows[0];
    recipientPhone = member?.phone || undefined;
    recipientEmail = member?.email || undefined;
  }

  if (data.leadId && !recipientPhone && !recipientEmail) {
    const rows = await query<{ phone: string | null; email: string | null }>(
      `SELECT phone, email FROM lead WHERE id = $1`,
      [data.leadId]
    );
    const lead = rows[0];
    recipientPhone = lead?.phone || undefined;
    recipientEmail = lead?.email || undefined;
  }

  const id = randomUUID();
  const rows = await query<CommunicationRow>(
    `INSERT INTO communication (
       id, tenant_id, type, subject, message, member_id, lead_id,
       recipient_phone, recipient_email, sender_id, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      id,
      context.tenantId,
      data.type,
      data.subject ?? null,
      data.message,
      data.memberId ?? null,
      data.leadId ?? null,
      recipientPhone ?? null,
      recipientEmail ?? null,
      context.user.id,
      CommunicationStatus.PENDING,
    ]
  );

  const communicationRow = rows[0];

  const [membersById, leadsById, sendersById] = await Promise.all([
    fetchMembersById(communicationRow.member_id ? [communicationRow.member_id] : []),
    fetchLeadsById(communicationRow.lead_id ? [communicationRow.lead_id] : []),
    fetchUsersById([communicationRow.sender_id]),
  ]);

  const communication = {
    ...mapCommunicationRow(communicationRow),
    member: communicationRow.member_id
      ? (() => {
          const m = membersById.get(communicationRow.member_id!);
          return m ? { id: m.id, firstName: m.first_name, lastName: m.last_name } : null;
        })()
      : null,
    lead: communicationRow.lead_id
      ? (() => {
          const l = leadsById.get(communicationRow.lead_id!);
          return l ? { id: l.id, firstName: l.first_name, lastName: l.last_name } : null;
        })()
      : null,
    sender: briefUser(sendersById.get(communicationRow.sender_id)),
  };

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_COMMUNICATION',
    'Communication',
    communication.id,
    null,
    data
  );

  return createdResponse(communication);
});
