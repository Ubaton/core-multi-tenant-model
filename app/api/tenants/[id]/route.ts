/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANTS API - SINGLE TENANT OPERATIONS
 * GET    /api/tenants/[id] - Get tenant details
 * PATCH  /api/tenants/[id] - Update tenant
 * DELETE /api/tenants/[id] - Delete tenant (soft delete)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  errorResponse,
  noContentResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateTenantSchema, idParamSchema } from '@/lib/validations';
import type { Tenant } from '@/lib/types/db';

type RouteParams = { id: string };

type TenantRow = {
  id: string; name: string; slug: string; description: string | null;
  logo: string | null; website: string | null; email: string | null;
  phone: string | null; address: string | null; city: string | null;
  state: string | null; postal_code: string | null; country: string;
  timezone: string; is_active: boolean; is_hq: boolean; parent_id: string | null;
  created_at: Date; updated_at: Date;
};

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logo: row.logo,
    website: row.website,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    timezone: row.timezone,
    isActive: row.is_active,
    isHQ: row.is_hq,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/tenants/[id]
 * Get tenant details
 */
export const GET = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);

  const tenantRows = await query<TenantRow>(
    `SELECT * FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const tenantRow = tenantRows[0];

  if (!tenantRow) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  const [parentRows, branchRows, userCount, memberCount, leadCount, offeringCount, prayerRequestCount, offeringTotalRows, now] = await Promise.all([
    tenantRow.parent_id
      ? query<{ id: string; name: string; slug: string }>(
          `SELECT id, name, slug FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
          [tenantRow.parent_id]
        )
      : Promise.resolve([]),
    query<{ id: string; name: string; slug: string; is_active: boolean }>(
      `SELECT id, name, slug, is_active FROM tenant WHERE parent_id = $1 AND deleted_at IS NULL`,
      [id]
    ),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM "user" WHERE tenant_id = $1 AND deleted_at IS NULL`, [id]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM member WHERE tenant_id = $1`, [id]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM lead WHERE tenant_id = $1`, [id]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM offering WHERE tenant_id = $1`, [id]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM prayer_request WHERE tenant_id = $1`, [id]),
    query<{ total: string | null }>(`SELECT SUM(amount) as total FROM offering WHERE tenant_id = $1`, [id]),
    Promise.resolve(new Date()),
  ]);

  // Get this month's offerings
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [thisMonthTotalRows, thisMonthCountRows] = await Promise.all([
    query<{ total: string | null }>(
      `SELECT SUM(amount) as total FROM offering WHERE tenant_id = $1 AND given_at >= $2`,
      [id, startOfMonth]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM offering WHERE tenant_id = $1 AND given_at >= $2`,
      [id, startOfMonth]
    ),
  ]);

  const tenant = {
    ...mapTenant(tenantRow),
    parent: parentRows[0] ?? null,
    branches: branchRows.map((b) => ({ id: b.id, name: b.name, slug: b.slug, isActive: b.is_active })),
    _count: {
      users: parseInt(userCount[0]?.count ?? '0', 10),
      members: parseInt(memberCount[0]?.count ?? '0', 10),
      leads: parseInt(leadCount[0]?.count ?? '0', 10),
      offerings: parseInt(offeringCount[0]?.count ?? '0', 10),
      prayerRequests: parseInt(prayerRequestCount[0]?.count ?? '0', 10),
    },
  };

  return successResponse({
    ...tenant,
    totalOfferings: offeringTotalRows[0]?.total?.toString() ?? '0',
    thisMonthOfferings: {
      total: thisMonthTotalRows[0]?.total?.toString() ?? '0',
      count: parseInt(thisMonthCountRows[0]?.count ?? '0', 10),
    },
  });
});

/**
 * PATCH /api/tenants/[id]
 * Update tenant
 */
export const PATCH = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updateTenantSchema);

  // Get current tenant for audit
  const existingRows = await query<TenantRow>(
    `SELECT * FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const existingRow = existingRows[0];

  if (!existingRow) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }
  const existingTenant = mapTenant(existingRow);

  const updateData: Record<string, unknown> = { ...data };
  if (data.slug !== undefined) {
    updateData.slug = data.slug.toLowerCase();
  }

  const columnMap: Record<string, string> = {
    name: 'name',
    slug: 'slug',
    description: 'description',
    logo: 'logo',
    website: 'website',
    email: 'email',
    phone: 'phone',
    address: 'address',
    city: 'city',
    state: 'state',
    postalCode: 'postal_code',
    country: 'country',
    timezone: 'timezone',
    isHQ: 'is_hq',
    parentId: 'parent_id',
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];
  for (const [key, value] of Object.entries(updateData)) {
    if (key === 'adminUser' || key === 'additionalUsers') continue;
    const column = columnMap[key];
    if (!column) continue;
    values.push(value);
    setClauses.push(`${column} = $${values.length}`);
  }

  let tenantRow = existingRow;
  if (setClauses.length > 0) {
    values.push(id);
    const updateRes = await query<TenantRow>(
      `UPDATE tenant SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    tenantRow = updateRes[0];
  }

  const parentRows = tenantRow.parent_id
    ? await query<{ id: string; name: string; slug: string }>(
        `SELECT id, name, slug FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
        [tenantRow.parent_id]
      )
    : [];

  const tenant = { ...mapTenant(tenantRow), parent: parentRows[0] ?? null };

  // Log audit
  await logAudit(
    user.id,
    null,
    'UPDATE_TENANT',
    'Tenant',
    tenant.id,
    existingTenant,
    tenant,
    request
  );

  return successResponse(tenant);
});

/**
 * DELETE /api/tenants/[id]
 * Soft delete a tenant - the row is retained so the audit trail stays
 * resolvable, but it is hidden from every listing. Users belonging to the
 * tenant are soft deleted alongside it, otherwise they would be left
 * pointing at a tenant nobody can see.
 */
export const DELETE = withSuperAdmin<RouteParams>(async (request, { user }, params) => {
  const { id } = idParamSchema.parse(params);

  const existingRows = await query<TenantRow>(
    `SELECT * FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
    [id]
  );
  const existingRow = existingRows[0];

  if (!existingRow) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }
  const existingTenant = mapTenant(existingRow);

  // Deleting the tenant the acting Super Admin belongs to would lock them out.
  if (user.tenantId === id) {
    return errorResponse('BAD_REQUEST', 'Cannot delete your own tenant', 400);
  }

  const deletedUserIds = await withTransaction(async (client) => {
    await client.query(
      `UPDATE tenant
       SET deleted_at = NOW(), deleted_by = $2, is_active = false, updated_at = NOW()
       WHERE id = $1`,
      [id, user.id]
    );

    const result = await client.query<{ id: string }>(
      `UPDATE "user"
       SET deleted_at = NOW(), deleted_by = $2, is_active = false, updated_at = NOW()
       WHERE tenant_id = $1 AND deleted_at IS NULL
       RETURNING id`,
      [id, user.id]
    );

    return result.rows.map((row) => row.id);
  });

  // Log audit
  await logAudit(
    user.id,
    null,
    'DELETE_TENANT',
    'Tenant',
    id,
    existingTenant,
    {
      deletedAt: new Date().toISOString(),
      deletedBy: user.id,
      isActive: false,
      cascadedUserIds: deletedUserIds,
    },
    request
  );

  return noContentResponse();
});
