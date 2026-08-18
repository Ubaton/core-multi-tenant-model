/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTER API - Create new tenant and admin user
 * POST /api/auth/register
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { handleError, successResponse, createdResponse } from '@/lib/api';

const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  tenant: z.object({
    name: z.string().min(2, 'Church name must be at least 2 characters'),
    slug: z.string()
      .min(2, 'Slug must be at least 2 characters')
      .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  }),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = registerSchema.parse(body);

    // Check if email already exists
    const existingUserRows = await query<{ id: string }>(
      `SELECT id FROM "user" WHERE email = $1`,
      [data.email]
    );

    if (existingUserRows[0]) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'EMAIL_EXISTS',
            message: 'An account with this email already exists',
          },
        },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingTenantRows = await query<{ id: string }>(
      `SELECT id FROM tenant WHERE slug = $1`,
      [data.tenant.slug]
    );

    if (existingTenantRows[0]) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'SLUG_EXISTS',
            message: 'This church URL is already taken. Please choose a different one.',
          },
        },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create tenant and admin user in a transaction
    const result = await withTransaction(async (client) => {
      // Create tenant
      const tenantId = randomUUID();
      const tenantRows = await client.query(
        `INSERT INTO tenant (id, name, slug, is_active, is_hq)
         VALUES ($1, $2, $3, TRUE, FALSE)
         RETURNING id, name, slug`,
        [tenantId, data.tenant.name, data.tenant.slug]
      );
      const tenant = tenantRows.rows[0];

      // Create admin user
      const userId = randomUUID();
      const userRows = await client.query(
        `INSERT INTO "user" (id, email, password_hash, first_name, last_name, role, tenant_id, is_active)
         VALUES ($1, $2, $3, $4, $5, 'CHURCH_ADMIN', $6, TRUE)
         RETURNING id, email, first_name, last_name`,
        [userId, data.email, hashedPassword, data.firstName, data.lastName, tenantId]
      );
      const user = userRows.rows[0];

      return {
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
        },
      };
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Registration successful. Please sign in.',
          tenant: {
            id: result.tenant.id,
            name: result.tenant.name,
            slug: result.tenant.slug,
          },
          user: {
            id: result.user.id,
            email: result.user.email,
            firstName: result.user.firstName,
            lastName: result.user.lastName,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleError(error);
  }
}
