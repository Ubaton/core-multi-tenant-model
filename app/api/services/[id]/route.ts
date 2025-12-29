/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICES API - GET, UPDATE, DELETE BY ID
 * GET    /api/services/[id] - Get a service by ID
 * PATCH  /api/services/[id] - Update a service
 * DELETE /api/services/[id] - Delete a service
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withPermission, 
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateServiceSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/services/[id]
 * Get a service by ID
 */
export const GET = withPermission('read', 'service', async (request, context, routeContext) => {
  const { id } = await (routeContext as RouteContext).params;

  const service = await prisma.service.findFirst({
    where: {
      id,
      tenantId: context.tenantId,
    },
    include: {
      offerings: {
        select: {
          id: true,
          amount: true,
          type: true,
          giverName: true,
          member: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      _count: {
        select: {
          offerings: true,
        },
      },
    },
  });

  if (!service) {
    return errorResponse('NOT_FOUND', 'Service not found', 404);
  }

  return successResponse(service);
});

/**
 * PATCH /api/services/[id]
 * Update a service
 */
export const PATCH = withPermission('update', 'service', async (request, context, routeContext) => {
  const { id } = await (routeContext as RouteContext).params;
  const data = await parseBody(request, updateServiceSchema);

  const existing = await prisma.service.findFirst({
    where: {
      id,
      tenantId: context.tenantId,
    },
  });

  if (!existing) {
    return errorResponse('NOT_FOUND', 'Service not found', 404);
  }

  const service = await prisma.service.update({
    where: { id },
    data,
    include: {
      _count: {
        select: {
          offerings: true,
        },
      },
    },
  });

  await logAudit(
    context.user.id,
    context.tenantId,
    'UPDATE_SERVICE',
    'Service',
    service.id,
    existing,
    service,
    request
  );

  return successResponse(service);
});

/**
 * DELETE /api/services/[id]
 * Delete a service
 */
export const DELETE = withPermission('delete', 'service', async (request, context, routeContext) => {
  const { id } = await (routeContext as RouteContext).params;

  const existing = await prisma.service.findFirst({
    where: {
      id,
      tenantId: context.tenantId,
    },
    include: {
      _count: {
        select: {
          offerings: true,
        },
      },
    },
  });

  if (!existing) {
    return errorResponse('NOT_FOUND', 'Service not found', 404);
  }

  // Check if service has associated offerings
  if (existing._count.offerings > 0) {
    return errorResponse(
      'CANNOT_DELETE',
      'Cannot delete service with associated offerings. Please remove or reassign the offerings first.',
      400
    );
  }

  await prisma.service.delete({
    where: { id },
  });

  await logAudit(
    context.user.id,
    context.tenantId,
    'DELETE_SERVICE',
    'Service',
    id,
    existing,
    null,
    request
  );

  return successResponse({ message: 'Service deleted successfully' });
});
