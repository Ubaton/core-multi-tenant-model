/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT PROFILE API - GET & UPDATE OWN TENANT
 * GET   /api/tenant/profile - Get current user's tenant details
 * PATCH /api/tenant/profile - Update current user's tenant details
 * ════════════════════════════════════════════════════════════════════════════
 *
 * This endpoint allows authenticated tenant users to access and update their
 * own organization's profile information.
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
import {
  withAuth,
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateTenantSchema } from '@/lib/validations';
import type { Tenant } from '@/lib/types/db';

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
 * GET /api/tenant/profile
 * Get the current user's tenant (organization) details
 */
const TENANT_SELECT_ALIASED = `
  SELECT
    id, name, slug, description, logo, website, email, phone, address, city, state,
    postal_code,
    country, timezone,
    is_active,
    is_hq,
    parent_id,
    created_at,
    updated_at
  FROM tenant
`;

export const GET = withAuth(async (request, { user, tenantId }) => {
  const tenantRows = await query<TenantRow>(
    `${TENANT_SELECT_ALIASED} WHERE id = $1 AND deleted_at IS NULL`,
    [tenantId]
  );
  const tenantRow = tenantRows[0];

  if (!tenantRow) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [parentRows, branchRows, userCount, memberCount, leadCount, offeringCount, prayerRequestCount, offeringTotalRows, thisMonthTotalRows, thisMonthCountRows] = await Promise.all([
    tenantRow.parent_id
      ? query<{ id: string; name: string; slug: string }>(
          `SELECT id, name, slug FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
          [tenantRow.parent_id]
        )
      : Promise.resolve([]),
    query<{ id: string; name: string; slug: string; is_active: boolean }>(
      `SELECT id, name, slug, is_active FROM tenant WHERE parent_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    ),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM "user" WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM member WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM lead WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM offering WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM prayer_request WHERE tenant_id = $1`, [tenantId]),
    query<{ total: string | null }>(`SELECT SUM(amount) as total FROM offering WHERE tenant_id = $1`, [tenantId]),
    query<{ total: string | null }>(
      `SELECT SUM(amount) as total FROM offering WHERE tenant_id = $1 AND given_at >= $2`,
      [tenantId, startOfMonth]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM offering WHERE tenant_id = $1 AND given_at >= $2`,
      [tenantId, startOfMonth]
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
 * PATCH /api/tenant/profile
 * Update the current user's tenant (organization) details
 * Requires CHURCH_ADMIN role or specific permissions
 */
export const PATCH = withAuth(async (request, { user, tenantId }) => {
  // Only allow admin users to update tenant info
  const allowedRoles = ['SUPER_ADMIN', 'CHURCH_ADMIN', 'PASTOR', 'ADMIN'];
  if (!allowedRoles.includes(user.role)) {
    return errorResponse('FORBIDDEN', 'You do not have permission to update organization settings', 403);
  }

  const data = await parseBody(request, updateTenantSchema);

  // Get current tenant for audit
  const currentRows = await query<TenantRow>(
    `SELECT * FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
    [tenantId]
  );
  const currentRow = currentRows[0];

  if (!currentRow) {
    return errorResponse('NOT_FOUND', 'Tenant not found', 404);
  }
  const currentTenant = mapTenant(currentRow);

  // Update the tenant
  const columnMap: Record<string, string> = {
    name: 'name',
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
    // Note: isActive is not allowed to be changed by tenant users
  };

  const setClauses: string[] = [];
  const values: unknown[] = [];

  if (data.name) {
    values.push(data.name);
    setClauses.push(`name = $${values.length}`);
  }
  if (data.description !== undefined) {
    values.push(data.description);
    setClauses.push(`description = $${values.length}`);
  }
  if (data.logo !== undefined) {
    values.push(data.logo);
    setClauses.push(`logo = $${values.length}`);
  }
  if (data.website !== undefined) {
    values.push(data.website);
    setClauses.push(`website = $${values.length}`);
  }
  if (data.email !== undefined) {
    values.push(data.email);
    setClauses.push(`email = $${values.length}`);
  }
  if (data.phone !== undefined) {
    values.push(data.phone);
    setClauses.push(`phone = $${values.length}`);
  }
  if (data.address !== undefined) {
    values.push(data.address);
    setClauses.push(`address = $${values.length}`);
  }
  if (data.city !== undefined) {
    values.push(data.city);
    setClauses.push(`city = $${values.length}`);
  }
  if (data.state !== undefined) {
    values.push(data.state);
    setClauses.push(`state = $${values.length}`);
  }
  if (data.postalCode !== undefined) {
    values.push(data.postalCode);
    setClauses.push(`postal_code = $${values.length}`);
  }
  if (data.country) {
    values.push(data.country);
    setClauses.push(`country = $${values.length}`);
  }
  if (data.timezone) {
    values.push(data.timezone);
    setClauses.push(`timezone = $${values.length}`);
  }

  let tenantRow = currentRow;
  if (setClauses.length > 0) {
    values.push(tenantId);
    const updateRes = await query<TenantRow>(
      `UPDATE tenant SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $${values.length} RETURNING *`,
      values
    );
    tenantRow = updateRes[0];
  }

  const [parentRows, branchRows, userCount, memberCount, leadCount, offeringCount, prayerRequestCount] = await Promise.all([
    tenantRow.parent_id
      ? query<{ id: string; name: string; slug: string }>(
          `SELECT id, name, slug FROM tenant WHERE id = $1 AND deleted_at IS NULL`,
          [tenantRow.parent_id]
        )
      : Promise.resolve([]),
    query<{ id: string; name: string; slug: string; is_active: boolean }>(
      `SELECT id, name, slug, is_active FROM tenant WHERE parent_id = $1 AND deleted_at IS NULL`,
      [tenantId]
    ),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM "user" WHERE tenant_id = $1 AND deleted_at IS NULL`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM member WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM lead WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM offering WHERE tenant_id = $1`, [tenantId]),
    query<{ count: string }>(`SELECT COUNT(*) as count FROM prayer_request WHERE tenant_id = $1`, [tenantId]),
  ]);

  const updatedTenant = {
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

  // Log audit
  await logAudit(
    user.id,
    tenantId,
    'UPDATE_TENANT',
    'Tenant',
    tenantId,
    currentTenant,
    updatedTenant,
    request
  );

  return successResponse(updatedTenant);
});
