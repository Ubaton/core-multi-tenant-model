/**
 * ════════════════════════════════════════════════════════════════════════════
 * INTERNAL MESSAGES API - LIST & CREATE
 * GET  /api/messages - List internal messages
 * POST /api/messages - Create a new internal message
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { query } from '@/lib/db';
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
import { randomUUID } from 'crypto';
import { UserRole, MessagePriority, MessageStatus } from '@/lib/types/db';

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
  receiverId: z.string().optional(), // Specific user, or null for Super Admin team
  parentId: z.string().optional(), // For replies
  tenantId: z.string().optional(), // For Super Admin to send to specific tenant
});

// Allowed columns for sorting (whitelist to avoid SQL injection via sortBy)
const SORTABLE_COLUMNS: Record<string, string> = {
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  priority: 'priority',
  status: 'status',
  subject: 'subject',
};

const senderReceiverSelect = `
  s.id AS "senderId_id", s.first_name AS "senderId_firstName", s.last_name AS "senderId_lastName",
  s.email AS "senderId_email", s.role AS "senderId_role",
  r.id AS "receiverId_id", r.first_name AS "receiverId_firstName", r.last_name AS "receiverId_lastName",
  r.email AS "receiverId_email", r.role AS "receiverId_role",
  t.id AS "tenantId_id", t.name AS "tenantId_name", t.slug AS "tenantId_slug"
`;

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  tenant_id: string | null;
  subject: string;
  message: string;
  priority: MessagePriority;
  status: MessageStatus;
  parent_id: string | null;
  read_at: Date | null;
  archived_at: Date | null;
  created_at: Date;
  updated_at: Date;
  senderId_id: string;
  senderId_firstName: string;
  senderId_lastName: string;
  senderId_email: string;
  senderId_role: UserRole;
  receiverId_id: string | null;
  receiverId_firstName: string | null;
  receiverId_lastName: string | null;
  receiverId_email: string | null;
  receiverId_role: UserRole | null;
  tenantId_id: string | null;
  tenantId_name: string | null;
  tenantId_slug: string | null;
  reply_count: string;
}

function mapMessageRow(row: MessageRow) {
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
    sender: {
      id: row.senderId_id,
      firstName: row.senderId_firstName,
      lastName: row.senderId_lastName,
      email: row.senderId_email,
      role: row.senderId_role,
    },
    receiver: row.receiverId_id
      ? {
          id: row.receiverId_id,
          firstName: row.receiverId_firstName,
          lastName: row.receiverId_lastName,
          email: row.receiverId_email,
          role: row.receiverId_role,
        }
      : null,
    tenant: row.tenantId_id
      ? {
          id: row.tenantId_id,
          name: row.tenantId_name,
          slug: row.tenantId_slug,
        }
      : null,
    _count: {
      replies: Number(row.reply_count),
    },
  };
}

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

    // Build WHERE clause + params based on user role and filter type
    const conditions: string[] = [];
    const params: unknown[] = [];
    let paramIndex = 1;

    function addParam(value: unknown): string {
      params.push(value);
      return `$${paramIndex++}`;
    }

    if (isSuperAdmin) {
      if (type === 'inbox') {
        const p1 = addParam(user.id);
        conditions.push(`(m.receiver_id = ${p1} OR (m.receiver_id IS NULL AND m.tenant_id IS NOT NULL))`);
      } else if (type === 'sent') {
        const p1 = addParam(user.id);
        conditions.push(`m.sender_id = ${p1}`);
      } else {
        const p1 = addParam(user.id);
        const p2 = addParam(user.id);
        conditions.push(`(m.sender_id = ${p1} OR m.receiver_id = ${p2} OR (m.receiver_id IS NULL AND m.tenant_id IS NOT NULL))`);
      }

      if (tenantId) {
        const p = addParam(tenantId);
        conditions.push(`m.tenant_id = ${p}`);
      }
    } else {
      if (type === 'inbox') {
        const p1 = addParam(user.id);
        const p2 = addParam(user.tenantId);
        conditions.push(
          `(m.receiver_id = ${p1} OR (m.tenant_id = ${p2} AND s.role = 'SUPER_ADMIN' AND m.receiver_id IS NULL))`
        );
      } else if (type === 'sent') {
        const p1 = addParam(user.id);
        conditions.push(`m.sender_id = ${p1}`);
      } else {
        const p1 = addParam(user.id);
        const p2 = addParam(user.id);
        const p3 = addParam(user.tenantId);
        conditions.push(
          `(m.sender_id = ${p1} OR m.receiver_id = ${p2} OR (m.tenant_id = ${p3} AND s.role = 'SUPER_ADMIN' AND m.receiver_id IS NULL))`
        );
      }
    }

    if (status) {
      const p = addParam(status);
      conditions.push(`m.status = ${p}`);
    }
    if (priority) {
      const p = addParam(priority);
      conditions.push(`m.priority = ${p}`);
    }

    // Only show root messages (not replies) in list view
    conditions.push('m.parent_id IS NULL');

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const { skip, take } = calculatePagination(page, pageSize);

    const sortColumn = SORTABLE_COLUMNS[sortBy || 'createdAt'] || 'created_at';
    const sortDir = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const limitParam = addParam(take);
    const offsetParam = addParam(skip);

    const listSql = `
      SELECT m.*, ${senderReceiverSelect},
        (SELECT COUNT(*) FROM internal_message rep WHERE rep.parent_id = m.id) AS reply_count
      FROM internal_message m
      JOIN "user" s ON s.id = m.sender_id
      LEFT JOIN "user" r ON r.id = m.receiver_id
      LEFT JOIN tenant t ON t.id = m.tenant_id
      ${whereClause}
      ORDER BY m.${sortColumn} ${sortDir}
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;

    const countSql = `
      SELECT COUNT(*) AS count
      FROM internal_message m
      JOIN "user" s ON s.id = m.sender_id
      ${whereClause}
    `;

    const [rows, countRows] = await Promise.all([
      query<MessageRow>(listSql, params),
      query<{ count: string }>(countSql, params.slice(0, params.length - 2)),
    ]);

    const messages = rows.map(mapMessageRow);
    const totalCount = Number(countRows[0]?.count ?? 0);

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
      const receiverRows = await query<{ id: string; role: UserRole; tenant_id: string | null }>(
        `SELECT id, role, tenant_id FROM "user" WHERE id = $1`,
        [data.receiverId]
      );
      const receiver = receiverRows[0];

      if (!receiver) {
        return errorResponse('NOT_FOUND', 'Receiver not found', 404);
      }

      // Non-super admin can only message super admin or users in their tenant
      if (!isSuperAdmin) {
        if (receiver.role !== UserRole.SUPER_ADMIN && receiver.tenant_id !== user.tenantId) {
          return errorResponse('FORBIDDEN', 'Cannot message users outside your organization', 403);
        }
      }
    }

    // Validate parent message for replies
    if (data.parentId) {
      const parentRows = await query<{ id: string }>(
        `SELECT id FROM internal_message WHERE id = $1`,
        [data.parentId]
      );
      if (!parentRows[0]) {
        return errorResponse('NOT_FOUND', 'Parent message not found', 404);
      }
    }

    // Determine the tenant ID for the message
    // Super Admin can specify a tenant, otherwise use user's tenant
    let messageTenantId: string | null = user.tenantId || null;
    if (isSuperAdmin && data.tenantId) {
      const tenantRows = await query<{ id: string }>(
        `SELECT id FROM tenant WHERE id = $1`,
        [data.tenantId]
      );
      if (!tenantRows[0]) {
        return errorResponse('NOT_FOUND', 'Tenant not found', 404);
      }
      messageTenantId = data.tenantId;
    }

    const id = randomUUID();

    const insertRows = await query<MessageRow>(
      `INSERT INTO internal_message
         (id, sender_id, receiver_id, tenant_id, subject, message, priority, status, parent_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id,
        user.id,
        data.receiverId || null,
        messageTenantId,
        data.subject,
        data.message,
        data.priority,
        MessageStatus.UNREAD,
        data.parentId || null,
      ]
    );

    const created = insertRows[0];

    // Fetch sender/receiver/tenant info for response shape
    const detailRows = await query<MessageRow>(
      `SELECT m.*, ${senderReceiverSelect},
         (SELECT COUNT(*) FROM internal_message rep WHERE rep.parent_id = m.id) AS reply_count
       FROM internal_message m
       JOIN "user" s ON s.id = m.sender_id
       LEFT JOIN "user" r ON r.id = m.receiver_id
       LEFT JOIN tenant t ON t.id = m.tenant_id
       WHERE m.id = $1`,
      [created.id]
    );

    const message = mapMessageRow(detailRows[0]);
    // POST create response in Prisma didn't include _count; drop it to match original shape
    const { _count, ...messageWithoutCount } = message;

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

    return createdResponse(messageWithoutCount);
  } catch (error) {
    return handleError(error);
  }
}
