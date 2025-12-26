/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT RESOLUTION & CONTEXT
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Handles tenant identification from subdomains, headers, and request context.
 * Ensures proper tenant isolation for all database operations.
 */

import { headers } from 'next/headers';
import { prisma } from './db';
import { getCurrentUser } from './auth';
import type { Tenant, UserRole } from './generated/prisma';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

// Header name for explicit tenant override (Super Admin only)
const TENANT_HEADER = 'x-tenant-id';

// Subdomains that are reserved and not tenant identifiers
const RESERVED_SUBDOMAINS = ['www', 'api', 'admin', 'app', 'dashboard', 'super'];

// ════════════════════════════════════════════════════════════════════════════
// TENANT RESOLUTION
// ════════════════════════════════════════════════════════════════════════════

/**
 * Extract tenant slug from subdomain
 * Example: "grace-chapel.churchhq.com" -> "grace-chapel"
 */
export async function getTenantSlugFromHost(): Promise<string | null> {
  const headersList = await headers();
  const host = headersList.get('host');
  
  if (!host) {
    return null;
  }

  // Handle localhost development
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    // In development, use header for tenant identification
    return headersList.get(TENANT_HEADER);
  }

  // Extract subdomain from host
  const parts = host.split('.');
  
  // Expect format: subdomain.domain.tld (minimum 3 parts)
  if (parts.length < 3) {
    return null;
  }

  const subdomain = parts[0].toLowerCase();
  
  // Check if subdomain is reserved
  if (RESERVED_SUBDOMAINS.includes(subdomain)) {
    return null;
  }

  return subdomain;
}

/**
 * Get tenant ID from explicit header (for Super Admin operations)
 */
export async function getTenantIdFromHeader(): Promise<string | null> {
  const headersList = await headers();
  return headersList.get(TENANT_HEADER);
}

/**
 * Resolve the current tenant context
 * 
 * Resolution order:
 * 1. For SUPER_ADMIN: Can use x-tenant-id header to switch tenants
 * 2. For other users: Must match their assigned tenantId
 * 3. From subdomain: Fallback for public access
 */
export async function resolveTenantContext(): Promise<TenantContext | null> {
  const user = await getCurrentUser();
  
  // Super Admin with explicit tenant header
  if (user?.role === 'SUPER_ADMIN') {
    const headerTenantId = await getTenantIdFromHeader();
    
    if (headerTenantId) {
      const tenant = await prisma.tenant.findUnique({
        where: { id: headerTenantId, isActive: true },
      });
      
      if (tenant) {
        return {
          tenant,
          tenantId: tenant.id,
          resolvedFrom: 'header',
          isSuperAdminContext: true,
        };
      }
    }
    
    // Super Admin without specific tenant - global context
    return {
      tenant: null,
      tenantId: null,
      resolvedFrom: 'super_admin',
      isSuperAdminContext: true,
    };
  }

  // Regular user - use their assigned tenant
  if (user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId, isActive: true },
    });
    
    if (tenant) {
      return {
        tenant,
        tenantId: tenant.id,
        resolvedFrom: 'user',
        isSuperAdminContext: false,
      };
    }
    
    // User's tenant not found or inactive - this is an error state
    return null;
  }

  // Unauthenticated or no tenant assigned - try subdomain
  const slug = await getTenantSlugFromHost();
  
  if (slug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug, isActive: true },
    });
    
    if (tenant) {
      return {
        tenant,
        tenantId: tenant.id,
        resolvedFrom: 'subdomain',
        isSuperAdminContext: false,
      };
    }
  }

  return null;
}

/**
 * Require a valid tenant context - throws if not available
 */
export async function requireTenantContext(): Promise<TenantContext> {
  const context = await resolveTenantContext();
  
  if (!context) {
    throw new TenantResolutionError('Unable to resolve tenant context');
  }
  
  // For regular operations, we need an actual tenant
  if (!context.isSuperAdminContext && !context.tenant) {
    throw new TenantResolutionError('Tenant not found or inactive');
  }

  return context;
}

/**
 * Get a tenant-scoped Prisma filter
 * Automatically adds tenantId filter for non-SUPER_ADMIN contexts
 */
export function getTenantFilter(tenantId: string | null, allowGlobal: boolean = false): { tenantId: string } | object {
  if (tenantId) {
    return { tenantId };
  }
  
  if (allowGlobal) {
    return {}; // No filter - Super Admin accessing all data
  }
  
  throw new TenantResolutionError('Tenant context required for this operation');
}

/**
 * Verify that a user can access a specific tenant
 */
export async function canAccessTenant(
  userId: string,
  targetTenantId: string
): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true },
  });

  if (!user) {
    return false;
  }

  // Super Admin can access any tenant
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Other users can only access their own tenant
  return user.tenantId === targetTenantId;
}

/**
 * Get all tenants accessible by a user
 * For Super Admin: all active tenants
 * For others: only their assigned tenant
 */
export async function getAccessibleTenants(
  userId: string
): Promise<Pick<Tenant, 'id' | 'name' | 'slug'>[]> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true, tenantId: true },
  });

  if (!user) {
    return [];
  }

  if (user.role === 'SUPER_ADMIN') {
    return prisma.tenant.findMany({
      where: { isActive: true },
      select: { id: true, name: true, slug: true },
      orderBy: { name: 'asc' },
    });
  }

  if (user.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId, isActive: true },
      select: { id: true, name: true, slug: true },
    });
    return tenant ? [tenant] : [];
  }

  return [];
}

// ════════════════════════════════════════════════════════════════════════════
// TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface TenantContext {
  tenant: Tenant | null;
  tenantId: string | null;
  resolvedFrom: 'header' | 'user' | 'subdomain' | 'super_admin';
  isSuperAdminContext: boolean;
}

// ════════════════════════════════════════════════════════════════════════════
// ERRORS
// ════════════════════════════════════════════════════════════════════════════

export class TenantResolutionError extends Error {
  constructor(message: string = 'Unable to resolve tenant') {
    super(message);
    this.name = 'TenantResolutionError';
  }
}
