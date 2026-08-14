/**
 * ════════════════════════════════════════════════════════════════════════════
 * OFFERINGS API - LIST & CREATE
 * GET  /api/offerings - List offerings (tenant-scoped)
 * POST /api/offerings - Record an offering
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
import { createOfferingSchema, offeringFilterSchema } from '@/lib/validations';

const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  givenAt: 'given_at',
  amount: 'amount',
  type: 'type',
};

interface OfferingRow {
  id: string;
  tenant_id: string;
  member_id: string | null;
  giver_name: string | null;
  giver_phone: string | null;
  type: string;
  amount: string; // NUMERIC comes back as string from pg
  currency: string;
  description: string | null;
  service_id: string | null;
  payment_method: string | null;
  reference: string | null;
  given_at: Date;
  recorded_by: string | null;
  created_at: Date;
  updated_at: Date;
}

function mapOfferingRow(row: OfferingRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    memberId: row.member_id,
    giverName: row.giver_name,
    giverPhone: row.giver_phone,
    type: row.type,
    amount: row.amount,
    currency: row.currency,
    description: row.description,
    serviceId: row.service_id,
    paymentMethod: row.payment_method,
    reference: row.reference,
    givenAt: row.given_at,
    recordedBy: row.recorded_by,
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

interface ServiceBrief {
  id: string;
  name: string;
  service_date: Date;
}

async function fetchServicesById(ids: string[]) {
  if (ids.length === 0) return new Map<string, ServiceBrief>();
  const rows = await query<ServiceBrief>(
    `SELECT id, name, service_date FROM service WHERE id = ANY($1::text[])`,
    [ids]
  );
  return new Map(rows.map((r) => [r.id, r]));
}

function briefMember(m?: MemberBrief) {
  if (!m) return null;
  return { id: m.id, firstName: m.first_name, lastName: m.last_name };
}

/**
 * GET /api/offerings
 * List offerings with filtering
 */
export const GET = withPermission('list', 'offering', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, offeringFilterSchema);
  const {
    page, pageSize, search, sortBy, sortOrder,
    type, memberId, serviceId, minAmount, maxAmount, from, to
  } = filters;

  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [context.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(giver_name ILIKE $${idx} OR description ILIKE $${idx} OR reference ILIKE $${idx})`);
  }

  if (type) {
    params.push(type);
    conditions.push(`type = $${params.length}`);
  }

  if (memberId) {
    params.push(memberId);
    conditions.push(`member_id = $${params.length}`);
  }

  if (serviceId) {
    params.push(serviceId);
    conditions.push(`service_id = $${params.length}`);
  }

  if (minAmount !== undefined) {
    params.push(minAmount);
    conditions.push(`amount >= $${params.length}`);
  }

  if (maxAmount !== undefined) {
    params.push(maxAmount);
    conditions.push(`amount <= $${params.length}`);
  }

  if (from) {
    params.push(from);
    conditions.push(`given_at >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    conditions.push(`given_at <= $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORT_COLUMN_MAP[sortBy || 'givenAt'] || 'given_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];

  const [rows, countRows, aggregateRows] = await Promise.all([
    query<OfferingRow>(
      `SELECT * FROM offering
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM offering ${whereClause}`, params),
    query<{ sum: string | null; avg: string | null; count: string }>(
      `SELECT SUM(amount) AS sum, AVG(amount) AS avg, COUNT(*) AS count FROM offering ${whereClause}`,
      params
    ),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);

  const memberIds = [...new Set(rows.map((r) => r.member_id).filter((v): v is string => !!v))];
  const serviceIds = [...new Set(rows.map((r) => r.service_id).filter((v): v is string => !!v))];

  const [membersById, servicesById] = await Promise.all([
    fetchMembersById(memberIds),
    fetchServicesById(serviceIds),
  ]);

  const offerings = rows.map((row) => ({
    ...mapOfferingRow(row),
    member: row.member_id ? briefMember(membersById.get(row.member_id)) : null,
    service: row.service_id
      ? (() => {
          const s = servicesById.get(row.service_id!);
          return s ? { id: s.id, name: s.name, serviceDate: s.service_date } : null;
        })()
      : null,
  }));

  const aggregate = aggregateRows[0];

  return successResponse(
    {
      offerings,
      summary: {
        totalAmount: aggregate?.sum ?? '0',
        averageAmount: aggregate?.avg ?? '0',
        count: Number(aggregate?.count ?? 0),
      },
    },
    createPaginationMeta(page, pageSize, totalCount)
  );
});

/**
 * POST /api/offerings
 * Record a new offering
 */
export const POST = withPermission('create', 'offering', async (request, context) => {
  const data = await parseBody(request, createOfferingSchema);

  const id = randomUUID();
  const rows = await query<OfferingRow>(
    `INSERT INTO offering (
       id, tenant_id, member_id, giver_name, giver_phone, type, amount, currency,
       description, service_id, payment_method, reference, given_at, recorded_by
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, COALESCE($13, NOW()), $14)
     RETURNING *`,
    [
      id,
      context.tenantId,
      data.memberId ?? null,
      data.giverName ?? null,
      data.giverPhone ?? null,
      data.type,
      data.amount,
      data.currency ?? 'ZAR',
      data.description ?? null,
      data.serviceId ?? null,
      data.paymentMethod ?? null,
      data.reference ?? null,
      data.givenAt ?? null,
      context.user.id,
    ]
  );

  const offeringRow = rows[0];

  const [membersById, servicesById] = await Promise.all([
    fetchMembersById(offeringRow.member_id ? [offeringRow.member_id] : []),
    fetchServicesById(offeringRow.service_id ? [offeringRow.service_id] : []),
  ]);

  const offering = {
    ...mapOfferingRow(offeringRow),
    member: offeringRow.member_id ? briefMember(membersById.get(offeringRow.member_id)) : null,
    service: offeringRow.service_id
      ? (() => {
          const s = servicesById.get(offeringRow.service_id!);
          return s ? { id: s.id, name: s.name } : null;
        })()
      : null,
  };

  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_OFFERING',
    'Offering',
    offering.id,
    null,
    offering,
    request
  );

  return createdResponse(offering);
});
