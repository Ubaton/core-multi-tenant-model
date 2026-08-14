/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICES API - GET, UPDATE, DELETE BY ID
 * GET    /api/services/[id] - Get a service by ID
 * PATCH  /api/services/[id] - Update a service
 * DELETE /api/services/[id] - Delete a service
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  withPermission,
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateServiceSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

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

interface OfferingBrief {
  id: string;
  amount: string;
  type: string;
  giver_name: string | null;
  member_id: string | null;
}

async function fetchOfferings(serviceId: string) {
  const rows = await query<OfferingBrief>(
    `SELECT id, amount, type, giver_name, member_id FROM offering WHERE service_id = $1`,
    [serviceId]
  );

  const memberIds = [...new Set(rows.map((r) => r.member_id).filter((v): v is string => !!v))];
  let membersById = new Map<string, { id: string; first_name: string; last_name: string }>();
  if (memberIds.length > 0) {
    const memberRows = await query<{ id: string; first_name: string; last_name: string }>(
      `SELECT id, first_name, last_name FROM member WHERE id = ANY($1::text[])`,
      [memberIds]
    );
    membersById = new Map(memberRows.map((m) => [m.id, m]));
  }

  return rows.map((row) => ({
    id: row.id,
    amount: row.amount,
    type: row.type,
    giverName: row.giver_name,
    member: row.member_id
      ? (() => {
          const m = membersById.get(row.member_id!);
          return m ? { id: m.id, firstName: m.first_name, lastName: m.last_name } : null;
        })()
      : null,
  }));
}

async function fetchOfferingCount(serviceId: string): Promise<number> {
  const rows = await query<{ count: string }>(
    `SELECT COUNT(*) AS count FROM offering WHERE service_id = $1`,
    [serviceId]
  );
  return Number(rows[0]?.count ?? 0);
}

/**
 * GET /api/services/[id]
 * Get a service by ID
 */
export const GET = withPermission('read', 'service', async (request, context, routeContext) => {
  const { id } = await (routeContext as RouteContext).params;

  const rows = await query<ServiceRow>(
    `SELECT * FROM service WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const row = rows[0];

  if (!row) {
    return errorResponse('NOT_FOUND', 'Service not found', 404);
  }

  const [offerings, offeringCount] = await Promise.all([
    fetchOfferings(row.id),
    fetchOfferingCount(row.id),
  ]);

  const service = {
    ...mapServiceRow(row),
    offerings,
    _count: {
      offerings: offeringCount,
    },
  };

  return successResponse(service);
});

/**
 * PATCH /api/services/[id]
 * Update a service
 */
export const PATCH = withPermission('update', 'service', async (request, context, routeContext) => {
  const { id } = await (routeContext as RouteContext).params;
  const data = await parseBody(request, updateServiceSchema);

  const existingRows = await query<ServiceRow>(
    `SELECT * FROM service WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existing = existingRows[0];

  if (!existing) {
    return errorResponse('NOT_FOUND', 'Service not found', 404);
  }

  const setClauses: string[] = [];
  const params: unknown[] = [];

  function addSet(column: string, value: unknown) {
    params.push(value);
    setClauses.push(`${column} = $${params.length}`);
  }

  if (data.name !== undefined) addSet('name', data.name);
  if (data.description !== undefined) addSet('description', data.description);
  if (data.serviceDate !== undefined) addSet('service_date', data.serviceDate);
  if (data.startTime !== undefined) addSet('start_time', data.startTime);
  if (data.endTime !== undefined) addSet('end_time', data.endTime);
  if (data.attendanceCount !== undefined) addSet('attendance_count', data.attendanceCount);

  setClauses.push(`updated_at = NOW()`);

  params.push(id);
  const rows = await query<ServiceRow>(
    `UPDATE service SET ${setClauses.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );
  const serviceRow = rows[0];
  const offeringCount = await fetchOfferingCount(serviceRow.id);

  const service = {
    ...mapServiceRow(serviceRow),
    _count: {
      offerings: offeringCount,
    },
  };

  await logAudit(
    context.user.id,
    context.tenantId,
    'UPDATE_SERVICE',
    'Service',
    service.id,
    mapServiceRow(existing),
    service,
    request
  );

  return successResponse(service);
});

/**
 * DELETE /api/services/[id]
 * Delete a service
 */
export const DELETE = withPermission('delete', 'service', async (request, context, routeContext) => {
  const { id } = await (routeContext as RouteContext).params;

  const existingRows = await query<ServiceRow>(
    `SELECT * FROM service WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const existing = existingRows[0];

  if (!existing) {
    return errorResponse('NOT_FOUND', 'Service not found', 404);
  }

  const offeringCount = await fetchOfferingCount(id);

  // Check if service has associated offerings
  if (offeringCount > 0) {
    return errorResponse(
      'CANNOT_DELETE',
      'Cannot delete service with associated offerings. Please remove or reassign the offerings first.',
      400
    );
  }

  await query(`DELETE FROM service WHERE id = $1`, [id]);

  const existingWithCount = {
    ...mapServiceRow(existing),
    _count: { offerings: offeringCount },
  };

  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_SERVICE',
    'Service',
    id,
    existingWithCount,
    null,
    request
  );

  return successResponse({ message: 'Service deleted successfully' });
});
