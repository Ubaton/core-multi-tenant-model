/**
 * ════════════════════════════════════════════════════════════════════════════
 * PRAYER REQUESTS API - SINGLE REQUEST OPERATIONS
 * GET    /api/prayer-requests/[id] - Get prayer request details
 * PATCH  /api/prayer-requests/[id] - Update prayer request
 * DELETE /api/prayer-requests/[id] - Delete prayer request
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { PrayerRequestStatus } from '@/lib/generated/prisma';
import { 
  withPermission, 
  successResponse,
  errorResponse,
  noContentResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updatePrayerRequestSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

/**
 * GET /api/prayer-requests/[id]
 */
export const GET = withPermission<RouteParams>('read', 'prayer_request', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const prayerRequest = await prisma.prayerRequest.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!prayerRequest) {
    return errorResponse('NOT_FOUND', 'Prayer request not found', 404);
  }

  return successResponse(prayerRequest);
});

/**
 * PATCH /api/prayer-requests/[id]
 */
export const PATCH = withPermission<RouteParams>('update', 'prayer_request', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const data = await parseBody(request, updatePrayerRequestSchema);

  const existingRequest = await prisma.prayerRequest.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
  });

  if (!existingRequest) {
    return errorResponse('NOT_FOUND', 'Prayer request not found', 404);
  }

  // Track when prayer is marked as answered
  const answeredUpdate = data.status === PrayerRequestStatus.ANSWERED && 
    existingRequest.status !== PrayerRequestStatus.ANSWERED
    ? { answeredAt: new Date() }
    : {};

  const prayerRequest = await prisma.prayerRequest.update({
    where: { id },
    data: {
      ...data,
      ...answeredUpdate,
    },
    include: {
      member: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  await logAudit(
    context.user.id,
    context.tenantId,
    'UPDATE_PRAYER_REQUEST',
    'PrayerRequest',
    prayerRequest.id,
    existingRequest,
    prayerRequest,
    request
  );

  return successResponse(prayerRequest);
});

/**
 * DELETE /api/prayer-requests/[id]
 */
export const DELETE = withPermission<RouteParams>('delete', 'prayer_request', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);

  const existingRequest = await prisma.prayerRequest.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
  });

  if (!existingRequest) {
    return errorResponse('NOT_FOUND', 'Prayer request not found', 404);
  }

  await prisma.prayerRequest.delete({
    where: { id },
  });

  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_PRAYER_REQUEST',
    'PrayerRequest',
    id,
    existingRequest,
    null,
    request
  );

  return noContentResponse();
});
