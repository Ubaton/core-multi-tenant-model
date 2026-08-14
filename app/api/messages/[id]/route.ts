/**
 * ════════════════════════════════════════════════════════════════════════════
 * INTERNAL MESSAGE DETAIL API
 * GET    /api/messages/:id - Get message details with replies
 * PATCH  /api/messages/:id - Update message (mark read, archive, etc.)
 * DELETE /api/messages/:id - Delete message
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query, withTransaction } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import {
  successResponse,
  errorResponse,
  handleError,
  logAudit,
} from '@/lib/api';
import { z } from 'zod';
import { UserRole, MessageStatus } from '@/lib/types/db';

const updateMessageSchema = z.object({
  status: z.nativeEnum(MessageStatus).optional(),
  readAt: z.literal(true).optional(), // Mark as read (set readAt to now)
  archivedAt: z.literal(true).optional(), // Archive (set archivedAt to now)
});

type RouteContext = { params: Promise<{ id: string }> };

const userSelect = `id, first_name AS "firstName", last_name AS "lastName", email, role`;

interface UserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
}

interface MessageDbRow {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  tenant_id: string | null;
  subject: string;
  message: string;
  priority: string;
  status: MessageStatus;
  parent_id: string | null;
  read_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

function mapBaseMessage(row: MessageDbRow) {
  return {
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    tenantId: row.tenant_id,
    subject: row.subject,
    message: row.message,
    priority: row.priority,
    status: row.status,
    parentId: row.parent_id,
    readAt: row.read_at,
    archivedAt: row.archived_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getUserSummary(userId: string | null): Promise<UserSummary | null> {
  if (!userId) return null;
  const rows = await query<UserSummary>(`SELECT ${userSelect} FROM "user" WHERE id = $1`, [userId]);
  return rows[0] ?? null;
}

async function getTenantSummary(tenantId: string | null) {
  if (!tenantId) return null;
  const rows = await query<{ id: string; name: string; slug: string }>(
    `SELECT id, name, slug FROM tenant WHERE id = $1`,
    [tenantId]
  );
  return rows[0] ?? null;
}

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

    const messageRows = await query<MessageDbRow>(
      `SELECT * FROM internal_message WHERE id = $1`,
      [id]
    );
    const messageRow = messageRows[0];

    if (!messageRow) {
      return errorResponse('NOT_FOUND', 'Message not found', 404);
    }

    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

    // Check access permissions
    const hasAccess =
      messageRow.sender_id === user.id ||
      messageRow.receiver_id === user.id ||
      (isSuperAdmin && (messageRow.receiver_id === null || messageRow.tenant_id)) ||
      (!isSuperAdmin && messageRow.tenant_id === user.tenantId);

    if (!hasAccess) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Auto-mark as read if user is the receiver
    let effectiveStatus = messageRow.status;
    let effectiveReadAt = messageRow.read_at;
    if (
      messageRow.status === MessageStatus.UNREAD &&
      (messageRow.receiver_id === user.id ||
        (isSuperAdmin && messageRow.receiver_id === null && messageRow.tenant_id))
    ) {
      const now = new Date();
      await query(
        `UPDATE internal_message SET status = $1, read_at = $2, updated_at = NOW() WHERE id = $3`,
        [MessageStatus.READ, now, id]
      );
      effectiveStatus = MessageStatus.READ;
      effectiveReadAt = now;
    }

    // Build parent (with its sender)
    let parent = null;
    if (messageRow.parent_id) {
      const parentRows = await query<MessageDbRow>(
        `SELECT * FROM internal_message WHERE id = $1`,
        [messageRow.parent_id]
      );
      const parentRow = parentRows[0];
      if (parentRow) {
        const parentSender = await getUserSummary(parentRow.sender_id);
        parent = {
          ...mapBaseMessage(parentRow),
          sender: parentSender,
        };
      }
    }

    // Build replies (with sender + receiver), ordered by createdAt asc
    const replyRows = await query<MessageDbRow>(
      `SELECT * FROM internal_message WHERE parent_id = $1 ORDER BY created_at ASC`,
      [id]
    );
    const replies = await Promise.all(
      replyRows.map(async (r) => ({
        ...mapBaseMessage(r),
        sender: await getUserSummary(r.sender_id),
        receiver: await getUserSummary(r.receiver_id),
      }))
    );

    const sender = await getUserSummary(messageRow.sender_id);
    const receiver = await getUserSummary(messageRow.receiver_id);
    const tenant = await getTenantSummary(messageRow.tenant_id);

    const message = {
      ...mapBaseMessage(messageRow),
      status: effectiveStatus,
      readAt: effectiveReadAt,
      sender,
      receiver,
      tenant,
      parent,
      replies,
    };

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

    const messageRows = await query<{
      id: string;
      sender_id: string;
      receiver_id: string | null;
      tenant_id: string | null;
      status: MessageStatus;
    }>(
      `SELECT id, sender_id, receiver_id, tenant_id, status FROM internal_message WHERE id = $1`,
      [id]
    );
    const message = messageRows[0];

    if (!message) {
      return errorResponse('NOT_FOUND', 'Message not found', 404);
    }

    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

    // Check access permissions
    const hasAccess =
      message.sender_id === user.id ||
      message.receiver_id === user.id ||
      (isSuperAdmin && (message.receiver_id === null || message.tenant_id)) ||
      (!isSuperAdmin && message.tenant_id === user.tenantId);

    if (!hasAccess) {
      return errorResponse('FORBIDDEN', 'Access denied', 403);
    }

    // Build update data
    const setClauses: string[] = [];
    const params: unknown[] = [];
    let idx = 1;
    const updateData: Record<string, unknown> = {};

    if (data.status) {
      setClauses.push(`status = $${idx++}`);
      params.push(data.status);
      updateData.status = data.status;
    }

    if (data.readAt) {
      setClauses.push(`status = $${idx++}`);
      params.push(MessageStatus.READ);
      setClauses.push(`read_at = $${idx++}`);
      params.push(new Date());
      updateData.status = MessageStatus.READ;
      updateData.readAt = new Date();
    }

    if (data.archivedAt) {
      setClauses.push(`status = $${idx++}`);
      params.push(MessageStatus.ARCHIVED);
      setClauses.push(`archived_at = $${idx++}`);
      params.push(new Date());
      updateData.status = MessageStatus.ARCHIVED;
      updateData.archivedAt = new Date();
    }

    setClauses.push(`updated_at = NOW()`);

    params.push(id);
    const updatedRows = await query<MessageDbRow>(
      `UPDATE internal_message SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    const updatedRow = updatedRows[0];

    const sender = await getUserSummary(updatedRow.sender_id);
    const receiver = await getUserSummary(updatedRow.receiver_id);
    const tenant = await getTenantSummary(updatedRow.tenant_id);

    const updatedMessage = {
      ...mapBaseMessage(updatedRow),
      sender,
      receiver,
      tenant,
    };

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

    const messageRows = await query<{
      id: string;
      sender_id: string;
      receiver_id: string | null;
      tenant_id: string | null;
    }>(
      `SELECT id, sender_id, receiver_id, tenant_id FROM internal_message WHERE id = $1`,
      [id]
    );
    const message = messageRows[0];

    if (!message) {
      return errorResponse('NOT_FOUND', 'Message not found', 404);
    }

    // Only sender or super admin can delete
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;
    if (message.sender_id !== user.id && !isSuperAdmin) {
      return errorResponse('FORBIDDEN', 'Only the sender can delete this message', 403);
    }

    // Delete all replies first, then the message (atomic)
    await withTransaction(async (client) => {
      await client.query(`DELETE FROM internal_message WHERE parent_id = $1`, [id]);
      await client.query(`DELETE FROM internal_message WHERE id = $1`, [id]);
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
