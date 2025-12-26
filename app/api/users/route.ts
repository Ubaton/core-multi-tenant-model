/**
 * ════════════════════════════════════════════════════════════════════════════
 * USERS API - LIST & CREATE
 * GET  /api/users - List all users (Super Admin only)
 * POST /api/users - Create a new user (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
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

/**
 * GET /api/users
 * List all users with pagination and search
 */
export const GET = withSuperAdmin(async (request, { user }) => {
  const { searchParams } = new URL(request.url);
  const { page, pageSize, search, sortBy, sortOrder } = parseSearchParams(
    searchParams,
    searchSchema
  );

  const role = searchParams.get('role') || undefined;
  const tenantId = searchParams.get('tenantId') || undefined;
  const isActive = searchParams.get('isActive');

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { email: { contains: search, mode: 'insensitive' as const } },
      { firstName: { contains: search, mode: 'insensitive' as const } },
      { lastName: { contains: search, mode: 'insensitive' as const } },
    ];
  }

  if (role) {
    where.role = role;
  }

  if (tenantId) {
    where.tenantId = tenantId;
  }

  if (isActive !== null && isActive !== undefined) {
    where.isActive = isActive === 'true';
  }

  const { skip, take } = calculatePagination(page, pageSize);

  const [users, totalCount] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'createdAt']: sortOrder || 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        role: true,
        isActive: true,
        emailVerified: true,
        lastLoginAt: true,
        tenantId: true,
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return successResponse(
    users,
    createPaginationMeta(totalCount, page, pageSize)
  );
});

/**
 * POST /api/users
 * Create a new user
 */
export const POST = withSuperAdmin(async (request, { user }) => {
  const body = await parseBody(request, createUserSchema);

  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (existingUser) {
    return errorResponse('Email already exists', 'CONFLICT', 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(body.password, 12);

  const newUser = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      role: body.role,
      tenantId: body.tenantId,
      isActive: body.isActive,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      isActive: true,
      tenantId: true,
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      createdAt: true,
    },
  });

  await logAudit(
    user.id,
    user.tenantId,
    'CREATE',
    'User',
    newUser.id,
    { email: newUser.email, role: newUser.role }
  );

  return createdResponse(newUser);
});
