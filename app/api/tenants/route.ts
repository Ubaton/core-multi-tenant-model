/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANTS API - LIST & CREATE
 * GET  /api/tenants - List all tenants (Super Admin only)
 * POST /api/tenants - Create a new tenant (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import {
  withSuperAdmin,
  successResponse,
  createdResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
  errorResponse,
} from '@/lib/api';
import { createTenantSchema, searchSchema } from '@/lib/validations';
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

const SORT_COLUMN_MAP: Record<string, string> = {
  name: 'name',
  slug: 'slug',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  isActive: 'is_active',
};

/**
 * GET /api/tenants
 * List all tenants with pagination and search
 */
export const GET = withSuperAdmin(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, search, sortBy, sortOrder } = parseSearchParams(
    searchParams,
    searchSchema
  );

  const { skip, take } = calculatePagination(page, pageSize);

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(
      `(name ILIKE $${idx} OR slug ILIKE $${idx} OR email ILIKE $${idx} OR city ILIKE $${idx})`
    );
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderColumn = SORT_COLUMN_MAP[sortBy || 'createdAt'] ?? 'created_at';
  const orderDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const limitIdx = params.length + 1;
  const offsetIdx = params.length + 2;

  const [tenantRows, countRows] = await Promise.all([
    query<TenantRow>(
      `SELECT * FROM tenant ${whereClause}
       ORDER BY ${orderColumn} ${orderDirection}
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      [...params, take, skip]
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) as count FROM tenant ${whereClause}`,
      params
    ),
  ]);

  const totalCount = parseInt(countRows[0]?.count ?? '0', 10);
  const tenants = tenantRows.map(mapTenant);
  const tenantIds = tenants.map((t) => t.id);

  // Get _count aggregates (users, members, branches, offerings) and parent info per tenant
  const [userCounts, memberCounts, branchCounts, offeringCounts, offeringSums, parents] = tenantIds.length
    ? await Promise.all([
        query<{ tenant_id: string; count: string }>(
          `SELECT tenant_id, COUNT(*) as count FROM "user" WHERE tenant_id = ANY($1) GROUP BY tenant_id`,
          [tenantIds]
        ),
        query<{ tenant_id: string; count: string }>(
          `SELECT tenant_id, COUNT(*) as count FROM member WHERE tenant_id = ANY($1) GROUP BY tenant_id`,
          [tenantIds]
        ),
        query<{ parent_id: string; count: string }>(
          `SELECT parent_id, COUNT(*) as count FROM tenant WHERE parent_id = ANY($1) GROUP BY parent_id`,
          [tenantIds]
        ),
        query<{ tenant_id: string; count: string }>(
          `SELECT tenant_id, COUNT(*) as count FROM offering WHERE tenant_id = ANY($1) GROUP BY tenant_id`,
          [tenantIds]
        ),
        query<{ tenant_id: string; total: string | null }>(
          `SELECT tenant_id, SUM(amount) as total FROM offering WHERE tenant_id = ANY($1) GROUP BY tenant_id`,
          [tenantIds]
        ),
        query<{ id: string; name: string; slug: string }>(
          `SELECT id, name, slug FROM tenant WHERE id = ANY($1)`,
          [tenants.map((t) => t.parentId).filter((id): id is string => !!id)]
        ),
      ])
    : [[], [], [], [], [], []];

  const userCountMap = new Map(userCounts.map((r) => [r.tenant_id, parseInt(r.count, 10)]));
  const memberCountMap = new Map(memberCounts.map((r) => [r.tenant_id, parseInt(r.count, 10)]));
  const branchCountMap = new Map(branchCounts.map((r) => [r.parent_id, parseInt(r.count, 10)]));
  const offeringCountMap = new Map(offeringCounts.map((r) => [r.tenant_id, parseInt(r.count, 10)]));
  const offeringTotalMap = new Map(offeringSums.map((r) => [r.tenant_id, r.total?.toString() ?? '0']));
  const parentMap = new Map(parents.map((p) => [p.id, p]));

  const tenantsWithOfferings = tenants.map((tenant) => ({
    ...tenant,
    parent: tenant.parentId ? parentMap.get(tenant.parentId) ?? null : null,
    _count: {
      users: userCountMap.get(tenant.id) ?? 0,
      members: memberCountMap.get(tenant.id) ?? 0,
      branches: branchCountMap.get(tenant.id) ?? 0,
      offerings: offeringCountMap.get(tenant.id) ?? 0,
    },
    totalOfferings: offeringTotalMap.get(tenant.id) ?? '0',
  }));

  return successResponse(tenantsWithOfferings, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/tenants
 * Create a new tenant with optional admin user account
 */
export const POST = withSuperAdmin(async (request, { user }) => {
  const data = await parseBody(request, createTenantSchema);

  // Extract user data from tenant data
  const { adminUser, additionalUsers, ...tenantData } = data;

  // Collect all users to be created for duplicate-email checks
  const allUsersToCreate = [
    ...(adminUser ? [{ ...adminUser, role: 'CHURCH_ADMIN' as const }] : []),
    ...(additionalUsers ?? []),
  ];

  // Check for duplicate emails within the submitted payload
  const submittedEmails = allUsersToCreate.map((u) => u.email.toLowerCase());
  const uniqueEmails = new Set(submittedEmails);
  if (submittedEmails.length !== uniqueEmails.size) {
    return errorResponse(
      'DUPLICATE_EMAIL',
      'Duplicate email addresses found in the user list',
      400
    );
  }

  // Check that none of these emails already exist in the DB
  for (const userEntry of allUsersToCreate) {
    const existingUserRows = await query<{ id: string }>(
      `SELECT id FROM "user" WHERE email = $1`,
      [userEntry.email]
    );
    if (existingUserRows.length > 0) {
      return errorResponse(
        'EMAIL_EXISTS',
        `A user account with email "${userEntry.email}" already exists`,
        400
      );
    }
  }

  // Check if slug already exists
  const existingTenantRows = await query<{ id: string }>(
    `SELECT id FROM tenant WHERE slug = $1`,
    [tenantData.slug.toLowerCase()]
  );

  if (existingTenantRows.length > 0) {
    return errorResponse(
      'SLUG_EXISTS',
      'A tenant with this slug already exists',
      400
    );
  }

  // Create tenant and all users in a single transaction
  const result = await withTransaction(async (client) => {
    // Create tenant
    const tenantId = randomUUID();
    const slug = tenantData.slug.toLowerCase();
    const tenantRes = await client.query<TenantRow>(
      `INSERT INTO tenant (id, name, slug, description, logo, website, email, phone, address, city, state, postal_code, country, timezone, is_active, is_hq, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true, $15, $16)
       RETURNING *`,
      [
        tenantId,
        tenantData.name,
        slug,
        tenantData.description ?? null,
        tenantData.logo ?? null,
        tenantData.website ?? null,
        tenantData.email ?? null,
        tenantData.phone ?? null,
        tenantData.address ?? null,
        tenantData.city ?? null,
        tenantData.state ?? null,
        tenantData.postalCode ?? null,
        tenantData.country,
        tenantData.timezone,
        tenantData.isHQ ?? false,
        tenantData.parentId ?? null,
      ]
    );
    const tenantRow = tenantRes.rows[0];
    let parent: { id: string; name: string; slug: string } | null = null;
    if (tenantRow.parent_id) {
      const parentRes = await client.query<{ id: string; name: string; slug: string }>(
        `SELECT id, name, slug FROM tenant WHERE id = $1`,
        [tenantRow.parent_id]
      );
      parent = parentRes.rows[0] ?? null;
    }
    const tenant = { ...mapTenant(tenantRow), parent };

    // Create all users (admin + additional) with their respective roles
    const createdUsers: Array<{
      id: string;
      email: string;
      firstName: string;
      lastName: string;
      role: string;
    }> = [];

    for (const userEntry of allUsersToCreate) {
      const hashedPassword = await hashPassword(userEntry.password);
      const userId = randomUUID();
      const userRes = await client.query<{
        id: string; email: string; first_name: string; last_name: string; role: string;
      }>(
        `INSERT INTO "user" (id, email, password_hash, first_name, last_name, phone, role, tenant_id, is_active, must_change_password)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, true)
         RETURNING id, email, first_name, last_name, role`,
        [
          userId,
          userEntry.email,
          hashedPassword,
          userEntry.firstName,
          userEntry.lastName,
          userEntry.phone ?? null,
          userEntry.role,
          tenant.id,
        ]
      );
      const createdRow = userRes.rows[0];
      createdUsers.push({
        id: createdRow.id,
        email: createdRow.email,
        firstName: createdRow.first_name,
        lastName: createdRow.last_name,
        role: createdRow.role,
      });
    }

    return { tenant, createdUsers };
  });

  // Log audit
  await logAudit(
    user.id,
    null,
    'CREATE_TENANT',
    'Tenant',
    result.tenant.id,
    null,
    {
      tenant: result.tenant,
      usersCreated: result.createdUsers.map((u) => ({ id: u.id, email: u.email, role: u.role })),
    },
    request
  );

  // Build a map of email -> plain-text password for the response (shown once)
  const passwordMap: Record<string, string> = {};
  for (const userEntry of allUsersToCreate) {
    passwordMap[userEntry.email] = userEntry.password;
  }

  return createdResponse({
    tenant: result.tenant,
    // Keep backward-compat: adminUser is the first CHURCH_ADMIN created
    adminUser: result.createdUsers.find((u) => u.role === 'CHURCH_ADMIN') ?? null,
    createdUsers: result.createdUsers,
    // Passwords shown once so Super Admin can share them with users
    generatedPasswords: passwordMap,
  });
});
