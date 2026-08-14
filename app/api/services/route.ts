/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICES API - LIST & CREATE
 * GET  /api/services - List services (tenant-scoped)
 * POST /api/services - Create a new service
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
import { createServiceSchema, searchSchema } from '@/lib/validations';
import { z } from 'zod';

// Service filter schema
const serviceFilterSchema = searchSchema.extend({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  upcoming: z.coerce.boolean().optional(),
});

const SORT_COLUMN_MAP: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  serviceDate: 'service_date',
  name: 'name',
  attendanceCount: 'attendance_count',
};

interface ServiceRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  service_date: Date;
  start_time: string | null;
  end_time: string | null;
  attendance_count: number | null;
  created_at: Date;
  updated_at: Date;
}

function mapServiceRow(row: ServiceRow) {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    name: row.name,
    description: row.description,
    serviceDate: row.service_date,
    startTime: row.start_time,
    endTime: row.end_time,
    attendanceCount: row.attendance_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function fetchOfferingCounts(serviceIds: string[]) {
  if (serviceIds.length === 0) return new Map<string, number>();
  const rows = await query<{ service_id: string; count: string }>(
    `SELECT service_id, COUNT(*) AS count FROM offering WHERE service_id = ANY($1::text[]) GROUP BY service_id`,
    [serviceIds]
  );
  return new Map(rows.map((r) => [r.service_id, Number(r.count)]));
}

/**
 * GET /api/services
 * List services with filtering
 */
export const GET = withPermission('list', 'service', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, serviceFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, from, to, upcoming } = filters;

  const now = new Date();

  const conditions: string[] = ['tenant_id = $1'];
  const params: unknown[] = [context.tenantId];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
  }

  if (from) {
    params.push(from);
    conditions.push(`service_date >= $${params.length}`);
  }

  if (to) {
    params.push(to);
    conditions.push(`service_date <= $${params.length}`);
  }

  if (upcoming === true) {
    params.push(now);
    conditions.push(`service_date >= $${params.length}`);
  }

  if (upcoming === false) {
    params.push(now);
    conditions.push(`service_date < $${params.length}`);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORT_COLUMN_MAP[sortBy || 'serviceDate'] || 'service_date';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];

  const [rows, countRows, statsRows, upcomingCountRows] = await Promise.all([
    query<ServiceRow>(
      `SELECT * FROM service
       ${whereClause}
       ORDER BY ${sortColumn} ${sortDirection}
       LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(`SELECT COUNT(*) AS count FROM service ${whereClause}`, params),
    // Get service statistics (tenant-wide, not filtered by search/date filters)
    query<{ count: string; sum: string | null; avg: string | null }>(
      `SELECT COUNT(*) AS count, SUM(attendance_count) AS sum, AVG(attendance_count) AS avg
       FROM service WHERE tenant_id = $1`,
      [context.tenantId]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM service WHERE tenant_id = $1 AND service_date >= $2`,
      [context.tenantId, now]
    ),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);
  const serviceIds = rows.map((r) => r.id);
  const offeringCounts = await fetchOfferingCounts(serviceIds);

  const services = rows.map((row) => ({
    ...mapServiceRow(row),
    _count: {
      offerings: offeringCounts.get(row.id) ?? 0,
    },
  }));

  const stats = statsRows[0];
  const total = Number(stats?.count ?? 0);
  const upcomingCount = Number(upcomingCountRows[0]?.count ?? 0);
  const totalAttendance = stats?.sum != null ? Number(stats.sum) : 0;
  const averageAttendance = stats?.avg != null ? Math.round(Number(stats.avg)) : 0;

  return successResponse(
    {
      services,
      summary: {
        total,
        upcomingCount,
        pastCount: total - upcomingCount,
        totalAttendance,
        averageAttendance,
      },
    },
    createPaginationMeta(page, pageSize, totalCount)
  );
});

/**
 * POST /api/services
 * Create a new service
 */
export const POST = withPermission('create', 'service', async (request, context) => {
  const data = await parseBody(request, createServiceSchema);

  const id = randomUUID();
  const rows = await query<ServiceRow>(
    `INSERT INTO service (
       id, tenant_id, name, description, service_date, start_time, end_time, attendance_count
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      id,
      context.tenantId,
      data.name,
      data.description ?? null,
      data.serviceDate,
      data.startTime ?? null,
      data.endTime ?? null,
      data.attendanceCount ?? null,
    ]
  );

  const serviceRow = rows[0];
  const service = {
    ...mapServiceRow(serviceRow),
    _count: {
      offerings: 0,
    },
  };

  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_SERVICE',
    'Service',
    service.id,
    null,
    service,
    request
  );

  return createdResponse(service);
});
