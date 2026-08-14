/**
 * ════════════════════════════════════════════════════════════════════════════
 * TENANT RESOLUTION & CONTEXT
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Handles tenant identification from subdomains, headers, and request context.
 * Ensures proper tenant isolation for all database operations.
 */

import { headers } from 'next/headers';
import { query } from './db';
import { getCurrentUser } from './auth';
import type { Tenant } from './types/db';

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
      const tenant = await findActiveTenant('id', headerTenantId);

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
    const tenant = await findActiveTenant('id', user.tenantId);

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
    const tenant = await findActiveTenant('slug', slug);

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
  const rows = await query<{ role: string; tenant_id: string | null }>(
    `SELECT role, "tenantId" AS tenant_id FROM "User" WHERE id = $1`,
    [userId]
  );
  const user = rows[0];

  if (!user) {
    return false;
  }

  // Super Admin can access any tenant
  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  // Other users can only access their own tenant
  return user.tenant_id === targetTenantId;
}

/**
 * Get all tenants accessible by a user
 * For Super Admin: all active tenants
 * For others: only their assigned tenant
 */
export async function getAccessibleTenants(
  userId: string
): Promise<Pick<Tenant, 'id' | 'name' | 'slug'>[]> {
  const rows = await query<{ role: string; tenant_id: string | null }>(
    `SELECT role, "tenantId" AS tenant_id FROM "User" WHERE id = $1`,
    [userId]
  );
  const user = rows[0];

  if (!user) {
    return [];
  }

  if (user.role === 'SUPER_ADMIN') {
    return query<Pick<Tenant, 'id' | 'name' | 'slug'>>(
      `SELECT id, name, slug FROM "Tenant" WHERE "isActive" = true ORDER BY name ASC`
    );
  }

  if (user.tenant_id) {
    const tenant = await findActiveTenant('id', user.tenant_id);
    return tenant ? [{ id: tenant.id, name: tenant.name, slug: tenant.slug }] : [];
  }

  return [];
}

// ════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ════════════════════════════════════════════════════════════════════════════

async function findActiveTenant(column: 'id' | 'slug', value: string): Promise<Tenant | null> {
  const rows = await query<{
    id: string; name: string; slug: string; description: string | null;
    logo: string | null; website: string | null; email: string | null;
    phone: string | null; address: string | null; city: string | null;
    state: string | null; postal_code: string | null; country: string;
    timezone: string; is_active: boolean; is_hq: boolean; parent_id: string | null;
    created_at: Date; updated_at: Date;
  }>(
    `SELECT id, name, slug, description, logo, website, email, phone, address, city, state,
            "postalCode" AS postal_code, country, timezone, "isActive" AS is_active, "isHQ" AS is_hq,
            "parentId" AS parent_id, "createdAt" AS created_at, "updatedAt" AS updated_at
     FROM "Tenant" WHERE "${column === 'id' ? 'id' : 'slug'}" = $1 AND "isActive" = true`,
    [value]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    logo: row.logo,
    website: row.website,
    email: row.email,
    phone: row.phone,
    address: row.address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    country: row.country,
    timezone: row.timezone,
    isActive: row.is_active,
    isHQ: row.is_hq,
    parentId: row.parent_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
