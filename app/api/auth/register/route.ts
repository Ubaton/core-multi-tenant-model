/**
 * ════════════════════════════════════════════════════════════════════════════
 * REGISTER API - Create new tenant and admin user
 * POST /api/auth/register
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
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
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
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
    const existingTenant = await prisma.tenant.findUnique({
      where: { slug: data.tenant.slug },
    });

    if (existingTenant) {
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
    const result = await prisma.$transaction(async (tx) => {
      // Create tenant
      const tenant = await tx.tenant.create({
        data: {
          name: data.tenant.name,
          slug: data.tenant.slug,
          isActive: true,
          isHQ: false,
        },
      });

      // Create admin user
      const user = await tx.user.create({
        data: {
          email: data.email,
          passwordHash: hashedPassword,
          firstName: data.firstName,
          lastName: data.lastName,
          role: 'CHURCH_ADMIN',
          tenantId: tenant.id,
          isActive: true,
        },
      });

      return { tenant, user };
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
