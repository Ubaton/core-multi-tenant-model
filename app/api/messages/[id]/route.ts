/**
 * ════════════════════════════════════════════════════════════════════════════
 * INTERNAL MESSAGE DETAIL API
 * GET    /api/messages/:id - Get message details with replies
 * PATCH  /api/messages/:id - Update message (mark read, archive, etc.)
 * DELETE /api/messages/:id - Delete message
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  handleError,
  logAudit,
} from '@/lib/api';
import { z } from 'zod';
import { UserRole, MessageStatus } from '@/lib/generated/prisma';

const updateMessageSchema = z.object({
  status: z.nativeEnum(MessageStatus).optional(),
  readAt: z.literal(true).optional(), // Mark as read (set readAt to now)
  archivedAt: z.literal(true).optional(), // Archive (set archivedAt to now)
});

type RouteContext = { params: Promise<{ id: string }> };

/**
 * GET /api/messages/:id
 * Get message details with all replies in thread
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const message = await prisma.internalMessage.findUnique({
      where: { id },
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
        parent: {
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
          },
        },
        replies: {
          orderBy: { createdAt: 'asc' },
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
          },
        },
      },
    });

    if (!message) {
      return errorResponse('NOT_FOUND', 'Message not found', 404);
    }

    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

    // Check access permissions
    const hasAccess =
      message.senderId === user.id ||
      message.receiverId === user.id ||
      (isSuperAdmin && (message.receiverId === null || message.tenantId)) ||
      (!isSuperAdmin && message.tenantId === user.tenantId);

    if (!hasAccess) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Auto-mark as read if user is the receiver
    if (
      message.status === MessageStatus.UNREAD &&
      (message.receiverId === user.id ||
        (isSuperAdmin && message.receiverId === null && message.tenantId))
    ) {
      await prisma.internalMessage.update({
        where: { id },
        data: {
          status: MessageStatus.READ,
          readAt: new Date(),
        },
      });
      
      // Update the returned message
      message.status = MessageStatus.READ;
      message.readAt = new Date();
    }

    return successResponse(message);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * PATCH /api/messages/:id
 * Update message status
 */
export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const body = await request.json();
    const data = updateMessageSchema.parse(body);

    const message = await prisma.internalMessage.findUnique({
      where: { id },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        tenantId: true,
        status: true,
      },
    });

    if (!message) {
      return errorResponse('NOT_FOUND', 'Message not found', 404);
    }

    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

    // Check access permissions
    const hasAccess =
      message.senderId === user.id ||
      message.receiverId === user.id ||
      (isSuperAdmin && (message.receiverId === null || message.tenantId)) ||
      (!isSuperAdmin && message.tenantId === user.tenantId);

    if (!hasAccess) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (data.status) {
      updateData.status = data.status;
    }
    
    if (data.readAt) {
      updateData.status = MessageStatus.READ;
      updateData.readAt = new Date();
    }
    
    if (data.archivedAt) {
      updateData.status = MessageStatus.ARCHIVED;
      updateData.archivedAt = new Date();
    }

    const updatedMessage = await prisma.internalMessage.update({
      where: { id },
      data: updateData,
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

    await logAudit(
      user.id,
      user.tenantId,
      'UPDATE_MESSAGE',
      'InternalMessage',
      id,
      message,
      updateData
    );

    return successResponse(updatedMessage);
  } catch (error) {
    return handleError(error);
  }
}

/**
 * DELETE /api/messages/:id
 * Delete a message (only sender can delete)
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const user = await getCurrentUser();
    
    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Authentication required', 401);
    }

    const message = await prisma.internalMessage.findUnique({
      where: { id },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        tenantId: true,
      },
    });

    if (!message) {
      return errorResponse('NOT_FOUND', 'Message not found', 404);
    }

    // Only sender or super admin can delete
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    if (message.senderId !== user.id && !isSuperAdmin) {
      return errorResponse('FORBIDDEN', 'Only the sender can delete this message', 403);
    }

    // Delete all replies first, then the message
    await prisma.internalMessage.deleteMany({
      where: { parentId: id },
    });

    await prisma.internalMessage.delete({
      where: { id },
    });

    await logAudit(
      user.id,
      user.tenantId,
      'DELETE_MESSAGE',
      'InternalMessage',
      id,
      message,
      null
    );

    return successResponse({ deleted: true });
  } catch (error) {
    return handleError(error);
  }
}
