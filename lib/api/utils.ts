/**
 * ════════════════════════════════════════════════════════════════════════════
 * API UTILITIES
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Standardized API response helpers, error handling, and route handler utilities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodError, ZodSchema } from 'zod';
import { prisma } from '../db';
import { getCurrentUser, AuthenticationError, AuthorizationError } from '../auth';
import { requireTenantContext, TenantResolutionError, type TenantContext } from '../tenant';
import { hasPermission, PermissionDeniedError, type Action, type Resource } from '../permissions';
import type { ApiResponse, ApiError, PaginationMeta, AuthUser } from '../types';
import { UserRole } from '../generated/prisma';

// ════════════════════════════════════════════════════════════════════════════
// RESPONSE HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Create a successful API response
 */
export function successResponse<T>(
  data: T,
  meta?: PaginationMeta,
  status: number = 200
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    { success: true, data, meta },
    { status }
  );
}

/**
 * Create a created (201) response
 */
export function createdResponse<T>(data: T): NextResponse<ApiResponse<T>> {
  return successResponse(data, undefined, 201);
}

/**
 * Create a no-content (204) response
 */
export function noContentResponse(): NextResponse {
  return new NextResponse(null, { status: 204 });
}

/**
 * Create an error API response
 */
export function errorResponse(
  code: string,
  message: string,
  status: number = 400,
  details?: Record<string, string[]>
): NextResponse<ApiResponse> {
  const error: ApiError = {
    code,
    message,
    details,
  };

  if (process.env.NODE_ENV === 'development') {
    error.stack = new Error().stack;
  }

  return NextResponse.json(
    { success: false, error },
    { status }
  );
}

/**
 * Handle common errors and return appropriate responses
 */
export function handleError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  // Zod validation errors
  if (error instanceof ZodError) {
    const details: Record<string, string[]> = {};
    error.issues.forEach((issue) => {
      const path = issue.path.join('.');
      if (!details[path]) {
        details[path] = [];
      }
      details[path].push(issue.message);
    });

    return errorResponse(
      'VALIDATION_ERROR',
      'Validation failed',
      400,
      details
    );
  }

  // Authentication errors
  if (error instanceof AuthenticationError) {
    return errorResponse('UNAUTHENTICATED', error.message, 401);
  }

  // Authorization errors
  if (error instanceof AuthorizationError) {
    return errorResponse('UNAUTHORIZED', error.message, 403);
  }

  // Permission errors
  if (error instanceof PermissionDeniedError) {
    return errorResponse('FORBIDDEN', error.message, 403);
  }

  // Tenant resolution errors
  if (error instanceof TenantResolutionError) {
    return errorResponse('TENANT_NOT_FOUND', error.message, 404);
  }

  // Prisma known errors
  if (error && typeof error === 'object' && 'code' in error) {
    const prismaError = error as { code: string; meta?: { target?: string | string[]; modelName?: string } };
    
    switch (prismaError.code) {
      case 'P2002': // Unique constraint violation
        const target = prismaError.meta?.target;
        // target can be string[] or string (constraint name)
        const fieldsArray = Array.isArray(target) ? target : [];
        const targetStr = typeof target === 'string' ? target : fieldsArray.join(' ');
        
        // Check if phone is involved in the constraint (case-insensitive, handles quoted names)
        if (targetStr.toLowerCase().includes('phone')) {
          return errorResponse(
            'DUPLICATE_PHONE',
            'A member with this phone number already exists',
            409
          );
        }
        // Check if email is involved
        if (targetStr.toLowerCase().includes('email')) {
          return errorResponse(
            'DUPLICATE_EMAIL',
            'A record with this email address already exists',
            409
          );
        }
        // Check if membershipId is involved
        if (targetStr.toLowerCase().includes('membershipid')) {
          return errorResponse(
            'DUPLICATE_MEMBERSHIP_ID',
            'A member with this membership ID already exists',
            409
          );
        }
        // Check if slug is involved (for tenants)
        if (targetStr.toLowerCase().includes('slug')) {
          return errorResponse(
            'DUPLICATE_SLUG',
            'A tenant with this slug already exists',
            409
          );
        }
        
        // Generic unique constraint message
        const fieldNames = fieldsArray.length > 0 
          ? fieldsArray.filter(f => f.toLowerCase() !== 'tenantid').join(', ') 
          : 'field';
        return errorResponse(
          'DUPLICATE_ENTRY',
          `A record with this ${fieldNames || 'value'} already exists`,
          409
        );
      case 'P2025': // Record not found
        return errorResponse('NOT_FOUND', 'Record not found', 404);
      case 'P2003': // Foreign key constraint
        return errorResponse('INVALID_REFERENCE', 'Referenced record not found', 400);
    }
  }

  // Generic error
  const message = error instanceof Error ? error.message : 'An unexpected error occurred';
  return errorResponse('INTERNAL_ERROR', message, 500);
}

// ════════════════════════════════════════════════════════════════════════════
// REQUEST PARSING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Parse and validate request body
 */
export async function parseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<T> {
  const body = await request.json();
  return schema.parse(body);
}

/**
 * Parse URL search params with validation
 */
export function parseSearchParams<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): T {
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return schema.parse(params);
}

/**
 * Parse route params
 */
export function parseParams<T>(
  params: Record<string, string>,
  schema: ZodSchema<T>
): T {
  return schema.parse(params);
}

// ════════════════════════════════════════════════════════════════════════════
// PAGINATION UTILITIES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Calculate pagination values
 */
export function calculatePagination(page: number, pageSize: number) {
  const skip = (page - 1) * pageSize;
  const take = pageSize;
  return { skip, take };
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta(
  page: number,
  pageSize: number,
  totalCount: number
): PaginationMeta {
  const totalPages = Math.ceil(totalCount / pageSize);
  return {
    page,
    limit: pageSize,
    pageSize,
    total: totalCount,
    totalCount,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
    hasPreviousPage: page > 1,
  };
}

// ════════════════════════════════════════════════════════════════════════════
// ROUTE HANDLER CONTEXT
// ════════════════════════════════════════════════════════════════════════════

export interface RouteContext {
  user: AuthUser;
  tenant: TenantContext;
  tenantId: string;
}

export interface PublicRouteContext {
  user: AuthUser | null;
  tenant: TenantContext | null;
}

/**
 * Create an authenticated route handler with tenant context
 */
export function withAuth<T extends object = object>(
  handler: (
    request: NextRequest,
    context: RouteContext,
    params: T
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<T> }
  ): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return errorResponse('UNAUTHENTICATED', 'Authentication required', 401);
      }

      const tenant = await requireTenantContext();
      
      // For non-Super Admin, ensure they can only access their tenant
      if (user.role !== UserRole.SUPER_ADMIN && tenant.tenantId !== user.tenantId) {
        return errorResponse('FORBIDDEN', 'Access denied to this tenant', 403);
      }

      const resolvedParams = await params;
      return await handler(request, { user, tenant, tenantId: tenant.tenantId! }, resolvedParams);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Create an authenticated route handler that requires specific permission
 */
export function withPermission<T extends object = object>(
  action: Action,
  resource: Resource,
  handler: (
    request: NextRequest,
    context: RouteContext,
    params: T
  ) => Promise<NextResponse>
) {
  return withAuth<T>(async (request, context, params) => {
    if (!hasPermission(context.user, action, resource)) {
      throw new PermissionDeniedError(`Permission denied: ${action}:${resource}`);
    }
    return handler(request, context, params);
  });
}

/**
 * Create a Super Admin only route handler
 */
export function withSuperAdmin<T extends object = object>(
  handler: (
    request: NextRequest,
    context: { user: AuthUser },
    params: T
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<T> }
  ): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        return errorResponse('UNAUTHENTICATED', 'Authentication required', 401);
      }

      if (user.role !== UserRole.SUPER_ADMIN) {
        return errorResponse('FORBIDDEN', 'Super Admin access required', 403);
      }

      const resolvedParams = await params;
      return await handler(request, { user }, resolvedParams);
    } catch (error) {
      return handleError(error);
    }
  };
}

/**
 * Create a public route handler (no auth required, but can still have tenant context)
 */
export function withPublic<T extends object = object>(
  handler: (
    request: NextRequest,
    context: PublicRouteContext,
    params: T
  ) => Promise<NextResponse>
) {
  return async (
    request: NextRequest,
    { params }: { params: Promise<T> }
  ): Promise<NextResponse> => {
    try {
      const user = await getCurrentUser();
      let tenant: TenantContext | null = null;
      
      try {
        tenant = await requireTenantContext();
      } catch {
        // Tenant context is optional for public routes
      }

      const resolvedParams = await params;
      return await handler(request, { user, tenant }, resolvedParams);
    } catch (error) {
      return handleError(error);
    }
  };
}

// ════════════════════════════════════════════════════════════════════════════
// AUDIT LOGGING
// ════════════════════════════════════════════════════════════════════════════

/**
 * Log an audit event
 */
export async function logAudit(
  userId: string,
  tenantId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  oldData?: object | null,
  newData?: object | null,
  request?: NextRequest
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        tenantId,
        action,
        entityType,
        entityId,
        oldData: oldData ?? undefined,
        newData: newData ?? undefined,
        ipAddress: request?.headers.get('x-forwarded-for') ?? 
                   request?.headers.get('x-real-ip') ?? 
                   undefined,
        userAgent: request?.headers.get('user-agent') ?? undefined,
      },
    });
  } catch (error) {
    // Log but don't fail the main operation
    console.error('Failed to create audit log:', error);
  }
}
