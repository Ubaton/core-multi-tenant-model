/**
 * ════════════════════════════════════════════════════════════════════════════
 * USERS API - LIST & CREATE
 * GET  /api/users - List all users (Super Admin only)
 * POST /api/users - Create a new user (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { query } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  createdResponse,
  errorResponse,
  parseBody,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
} from '@/lib/api';
import { searchSchema } from '@/lib/validations';
import { z } from 'zod';

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  phone: z.string().optional(),
  role: z.enum(['SUPER_ADMIN', 'CHURCH_ADMIN', 'STAFF', 'CALL_CENTER', 'SUBSCRIBER', 'MEMBER']),
  tenantId: z.string().optional(),
  isActive: z.boolean().default(true),
});

const SORTABLE_COLUMNS: Record<string, string> = {
  createdAt: '"createdAt"',
  updatedAt: '"updatedAt"',
  email: 'email',
  firstName: '"firstName"',
  lastName: '"lastName"',
  role: 'role',
  lastLoginAt: '"lastLoginAt"',
};

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  is_active: boolean;
  email_verified: boolean;
  last_login_at: Date | null;
  tenant_id: string | null;
  created_at: Date;
  updated_at: Date;
  tenant_name: string | null;
  tenant_slug: string | null;
}

function mapUserRow(row: UserRow) {
  return {
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    avatar: row.avatar,
    role: row.role,
    isActive: row.is_active,
    emailVerified: row.email_verified,
    lastLoginAt: row.last_login_at,
    tenantId: row.tenant_id,
    tenant: row.tenant_id
      ? { id: row.tenant_id, name: row.tenant_name, slug: row.tenant_slug }
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * GET /api/users
 * List all users with pagination and search
 */
export const GET = withSuperAdmin(async (request) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, search, sortBy, sortOrder } = parseSearchParams(
    searchParams,
    searchSchema
  );

  const role = searchParams.get('role') || undefined;
  const tenantId = searchParams.get('tenantId') || undefined;
  const isActive = searchParams.get('isActive');

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (search) {
    params.push(`%${search}%`);
    const idx = params.length;
    conditions.push(`(u.email ILIKE $${idx} OR u."firstName" ILIKE $${idx} OR u."lastName" ILIKE $${idx})`);
  }

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  if (tenantId) {
    params.push(tenantId);
    conditions.push(`u."tenantId" = $${params.length}`);
  }

  if (isActive !== null && isActive !== undefined) {
    params.push(isActive === 'true');
    conditions.push(`u."isActive" = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORTABLE_COLUMNS[sortBy || 'createdAt'] || '"createdAt"';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];
  const limitIdx = dataParams.length - 1;
  const offsetIdx = dataParams.length;

  const [users, countRows] = await Promise.all([
    query<UserRow>(
      `SELECT u.id, u.email, u."firstName" AS first_name, u."lastName" AS last_name, u.phone, u.avatar, u.role,
              u."isActive" AS is_active, u."emailVerified" AS email_verified, u."lastLoginAt" AS last_login_at, u."tenantId" AS tenant_id,
              u."createdAt" AS created_at, u."updatedAt" AS updated_at,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM "User" u
       LEFT JOIN "Tenant" t ON t.id = u."tenantId"
       ${whereClause}
       ORDER BY u.${sortColumn} ${sortDirection}
       LIMIT $${limitIdx} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM "User" u ${whereClause}`,
      params
    ),
  ]);

  const totalCount = Number(countRows[0]?.count ?? 0);

  return successResponse(
    users.map(mapUserRow),
    createPaginationMeta(page, pageSize, totalCount)
  );
});

/**
 * POST /api/users
 * Create a new user
 */
export const POST = withSuperAdmin(async (request, { user }) => {
  const body = await parseBody(request, createUserSchema);

  // Check if email already exists
  const existing = await query<{ id: string }>(
    `SELECT id FROM "User" WHERE email = $1`,
    [body.email]
  );

  if (existing.length > 0) {
    return errorResponse('Email already exists', 'CONFLICT', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(body.password, 12);
  const id = randomUUID();

  const rows = await query<UserRow>(
    `INSERT INTO "User" (id, email, "passwordHash", "firstName", "lastName", phone, role, "tenantId", "isActive")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, email, "firstName" AS first_name, "lastName" AS last_name, phone, avatar, role, "isActive" AS is_active, "emailVerified" AS email_verified, "lastLoginAt" AS last_login_at, "tenantId" AS tenant_id, "createdAt" AS created_at, "updatedAt" AS updated_at`,
    [
      id,
      body.email,
      passwordHash,
      body.firstName,
      body.lastName,
      body.phone ?? null,
      body.role,
      body.tenantId ?? null,
      body.isActive,
    ]
  );

  let tenant: { id: string; name: string; slug: string } | null = null;
  if (rows[0].tenant_id) {
    const tenantRows = await query<{ id: string; name: string; slug: string }>(
      `SELECT id, name, slug FROM "Tenant" WHERE id = $1`,
      [rows[0].tenant_id]
    );
    tenant = tenantRows[0] ?? null;
  }

  const newUser = {
    id: rows[0].id,
    email: rows[0].email,
    firstName: rows[0].first_name,
    lastName: rows[0].last_name,
    phone: rows[0].phone,
    role: rows[0].role,
    isActive: rows[0].is_active,
    tenantId: rows[0].tenant_id,
    tenant,
    createdAt: rows[0].created_at,
  };

  await logAudit(
    user.id,
    user.tenantId,
    'CREATE',
    'User',
    newUser.id,
    undefined,
    { email: newUser.email, role: newUser.role }
  );

  return createdResponse(newUser);
});
