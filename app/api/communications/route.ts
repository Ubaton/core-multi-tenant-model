/**
 * ════════════════════════════════════════════════════════════════════════════
 * COMMUNICATIONS API - LIST & CREATE
 * GET  /api/communications - List communications (tenant-scoped)
 * POST /api/communications - Create a new communication
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
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
import { z } from 'zod';
import { CommunicationType, CommunicationStatus } from '@/lib/generated/prisma';

// Validation schemas
const communicationFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  type: z.nativeEnum(CommunicationType).optional(),
  status: z.nativeEnum(CommunicationStatus).optional(),
  memberId: z.string().optional(),
  leadId: z.string().optional(),
});

const createCommunicationSchema = z.object({
  type: z.nativeEnum(CommunicationType),
  subject: z.string().max(500).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  memberId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  recipientPhone: z.string().max(20).optional(),
  recipientEmail: z.string().email().optional(),
});

/**
 * GET /api/communications
 * List communications with filtering and pagination
 */
export const GET = withPermission('list', 'communication', async (request, context) => {
  const { searchParams } = new URL(request.url);
  const filters = parseSearchParams(searchParams, communicationFilterSchema);
  const { page, pageSize, search, sortBy, sortOrder, type, status, memberId, leadId } = filters;

  const where = {
    tenantId: context.tenantId,
    ...(search && {
      OR: [
        { subject: { contains: search, mode: 'insensitive' as const } },
        { message: { contains: search, mode: 'insensitive' as const } },
        { recipientPhone: { contains: search, mode: 'insensitive' as const } },
        { recipientEmail: { contains: search, mode: 'insensitive' as const } },
      ],
    }),
    ...(type && { type }),
    ...(status && { status }),
    ...(memberId && { memberId }),
    ...(leadId && { leadId }),
  };

  const { skip, take } = calculatePagination(page, pageSize);

  const [communications, totalCount] = await Promise.all([
    prisma.communication.findMany({
      where,
      skip,
      take,
      orderBy: { [sortBy || 'createdAt']: sortOrder },
      include: {
        member: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.communication.count({ where }),
  ]);

  return successResponse(communications, createPaginationMeta(page, pageSize, totalCount));
});

/**
 * POST /api/communications
 * Create a new communication
 */
export const POST = withPermission('create', 'communication', async (request, context) => {
  const data = await parseBody(request, createCommunicationSchema);

  // Validate that at least one recipient is specified
  if (!data.memberId && !data.leadId && !data.recipientPhone && !data.recipientEmail) {
    throw new Error('At least one recipient must be specified');
  }

  // Get recipient contact info if member or lead is specified
  let recipientPhone = data.recipientPhone;
  let recipientEmail = data.recipientEmail;

  if (data.memberId && !recipientPhone && !recipientEmail) {
    const member = await prisma.member.findUnique({
      where: { id: data.memberId },
      select: { phone: true, email: true },
    });
    recipientPhone = member?.phone || undefined;
    recipientEmail = member?.email || undefined;
  }

  if (data.leadId && !recipientPhone && !recipientEmail) {
    const lead = await prisma.lead.findUnique({
      where: { id: data.leadId },
      select: { phone: true, email: true },
    });
    recipientPhone = lead?.phone || undefined;
    recipientEmail = lead?.email || undefined;
  }

  const communication = await prisma.communication.create({
    data: {
      ...data,
      tenantId: context.tenantId,
      senderId: context.user.id,
      recipientPhone,
      recipientEmail,
      status: CommunicationStatus.PENDING,
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      lead: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'CREATE_COMMUNICATION',
    'Communication',
    communication.id,
    null,
    data
  );

  return createdResponse(communication);
});
