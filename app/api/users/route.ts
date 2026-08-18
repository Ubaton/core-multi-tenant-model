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
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  email: 'email',
  firstName: 'first_name',
  lastName: 'last_name',
  role: 'role',
  lastLoginAt: 'last_login_at',
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
    conditions.push(`(u.email ILIKE $${idx} OR u.first_name ILIKE $${idx} OR u.last_name ILIKE $${idx})`);
  }

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  if (tenantId) {
    params.push(tenantId);
    conditions.push(`u.tenant_id = $${params.length}`);
  }

  if (isActive !== null && isActive !== undefined) {
    params.push(isActive === 'true');
    conditions.push(`u.is_active = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const { skip, take } = calculatePagination(page, pageSize);
  const sortColumn = SORTABLE_COLUMNS[sortBy || 'createdAt'] || 'created_at';
  const sortDirection = sortOrder === 'asc' ? 'ASC' : 'DESC';

  const dataParams = [...params, take, skip];
  const limitIdx = dataParams.length - 1;
  const offsetIdx = dataParams.length;

  const [users, countRows] = await Promise.all([
    query<UserRow>(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.avatar, u.role,
              u.is_active, u.email_verified, u.last_login_at, u.tenant_id,
              u.created_at, u.updated_at,
              t.name AS tenant_name, t.slug AS tenant_slug
       FROM "user" u
       LEFT JOIN tenant t ON t.id = u.tenant_id
       ${whereClause}
       ORDER BY u.${sortColumn} ${sortDirection}
       LIMIT $${limitIdx} OFFSET $${dataParams.length}`,
      dataParams
    ),
    query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM "user" u ${whereClause}`,
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
    `SELECT id FROM "user" WHERE email = $1`,
    [body.email]
  );

  if (existing.length > 0) {
    return errorResponse('Email already exists', 'CONFLICT', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(body.password, 12);
  const id = randomUUID();

  const rows = await query<UserRow>(
    `INSERT INTO "user" (id, email, password_hash, first_name, last_name, phone, role, tenant_id, is_active)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, email, first_name, last_name, phone, avatar, role, is_active, email_verified, last_login_at, tenant_id, created_at, updated_at`,
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
      `SELECT id, name, slug FROM tenant WHERE id = $1`,
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
