/**
 * ════════════════════════════════════════════════════════════════════════════
 * API TYPES
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Standardized API request and response types.
 */

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: PaginationMeta;
}

/**
 * API Error structure
 */
export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  stack?: string; // Only in development
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  pageSize: number;
  total: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated request params
 */
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Search/filter params
 */
export interface SearchParams extends PaginationParams {
  search?: string;
  filters?: Record<string, unknown>;
}

/**
 * Tenant-scoped request context
 */
export interface TenantRequestContext {
  tenantId: string;
  userId: string;
  role: string;
}

/**
 * Date range filter
 */
export interface DateRangeFilter {
  from?: string | Date;
  to?: string | Date;
}

/**
 * Bulk operation result
 */
export interface BulkOperationResult {
  success: number;
  failed: number;
  errors: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * Statistics summary (for dashboards)
 */
export interface StatsSummary {
  label: string;
  value: number;
  change?: number; // Percentage change from previous period
  trend?: 'up' | 'down' | 'neutral';
}
