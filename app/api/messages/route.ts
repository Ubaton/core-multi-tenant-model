/**
 * ════════════════════════════════════════════════════════════════════════════
 * INTERNAL MESSAGES API - LIST & CREATE
 * GET  /api/messages - List internal messages
 * POST /api/messages - Create a new internal message
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { 
  successResponse, 
  createdResponse,
  errorResponse,
  handleError,
  parseSearchParams,
  calculatePagination,
  createPaginationMeta,
  logAudit,
} from '@/lib/api';
import { z } from 'zod';
import { UserRole, MessagePriority, MessageStatus } from '@/lib/generated/prisma';

// Validation schemas
const messageFilterSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  status: z.nativeEnum(MessageStatus).optional(),
  priority: z.nativeEnum(MessagePriority).optional(),
  tenantId: z.string().optional(), // For super admin to filter by tenant
  type: z.enum(['inbox', 'sent', 'all']).default('inbox'),
});

const createMessageSchema = z.object({
  subject: z.string().min(1, 'Subject is required').max(200),
  message: z.string().min(1, 'Message is required').max(5000),
  priority: z.nativeEnum(MessagePriority).default(MessagePriority.NORMAL),
  receiverId: z.string().cuid().optional(), // Specific user, or null for Super Admin team
  parentId: z.string().cuid().optional(), // For replies
});

/**
 * GET /api/messages
 * List internal messages - works for both tenants and super admin
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const { searchParams } = new URL(request.url);
    const filters = parseSearchParams(searchParams, messageFilterSchema);
    const { page, pageSize, sortBy, sortOrder, status, priority, tenantId, type } = filters;

    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

    // Build where clause based on user role and filter type
    let where: Record<string, unknown> = {};

    if (isSuperAdmin) {
      // Super admin sees messages sent to them OR all unassigned messages from tenants
      if (type === 'inbox') {
        where = {
          OR: [
            { receiverId: user.id },
            { receiverId: null, tenantId: { not: null } }, // Messages from tenants to "Super Admin"
          ],
        };
      } else if (type === 'sent') {
        where = { senderId: user.id };
      } else {
        where = {
          OR: [
            { senderId: user.id },
            { receiverId: user.id },
            { receiverId: null, tenantId: { not: null } },
          ],
        };
      }

      // Filter by tenant if specified
      if (tenantId) {
        where.tenantId = tenantId;
      }
    } else {
      // Tenant users see their own messages + messages from super admin
      if (type === 'inbox') {
        where = {
          OR: [
            { receiverId: user.id },
            // Messages from super admin to their tenant
            { 
              tenantId: user.tenantId,
              sender: { role: UserRole.SUPER_ADMIN },
              receiverId: null,
            },
          ],
        };
      } else if (type === 'sent') {
        where = { senderId: user.id };
      } else {
        where = {
          OR: [
            { senderId: user.id },
            { receiverId: user.id },
            { 
              tenantId: user.tenantId,
              sender: { role: UserRole.SUPER_ADMIN },
              receiverId: null,
            },
          ],
        };
      }
    }

    // Apply additional filters
    if (status) where.status = status;
    if (priority) where.priority = priority;

    // Only show root messages (not replies) in list view
    where.parentId = null;

    const { skip, take } = calculatePagination(page, pageSize);

    const [messages, totalCount] = await Promise.all([
      prisma.internalMessage.findMany({
        where,
        skip,
        take,
        orderBy: { [sortBy || 'createdAt']: sortOrder },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              role: true,
            },
          },
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          _count: {
            select: {
              replies: true,
            },
          },
        },
      }),
      prisma.internalMessage.count({ where }),
    ]);

    return successResponse(messages, createPaginationMeta(page, pageSize, totalCount));
  } catch (error) {
    return handleError(error);
  }
}

/**
 * POST /api/messages
 * Create a new internal message
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const body = await request.json();
    const data = createMessageSchema.parse(body);

    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

    // Validate receiver if specified
    if (data.receiverId) {
      const receiver = await prisma.user.findUnique({
        where: { id: data.receiverId },
        select: { id: true, role: true, tenantId: true },
      });

      if (!receiver) {
        return errorResponse('NOT_FOUND', 'Receiver not found', 404);
      }

      // Non-super admin can only message super admin or users in their tenant
      if (!isSuperAdmin) {
        if (receiver.role !== UserRole.SUPER_ADMIN && receiver.tenantId !== user.tenantId) {
          return errorResponse('FORBIDDEN', 'Cannot message users outside your organization', 403);
        }
      }
    }

    // Validate parent message for replies
    if (data.parentId) {
      const parentMessage = await prisma.internalMessage.findUnique({
        where: { id: data.parentId },
        select: { id: true, senderId: true, receiverId: true, tenantId: true },
      });

      if (!parentMessage) {
        return errorResponse('NOT_FOUND', 'Parent message not found', 404);
      }
    }

    const message = await prisma.internalMessage.create({
      data: {
        senderId: user.id,
        receiverId: data.receiverId || null,
        tenantId: user.tenantId || null,
        subject: data.subject,
        message: data.message,
        priority: data.priority,
        parentId: data.parentId || null,
        status: MessageStatus.UNREAD,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    // Log audit
    await logAudit(
      user.id,
      user.tenantId,
      'CREATE_MESSAGE',
      'InternalMessage',
      message.id,
      null,
      data
    );

    return createdResponse(message);
  } catch (error) {
    return handleError(error);
  }
}
