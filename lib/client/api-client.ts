/**
 * ════════════════════════════════════════════════════════════════════════════
 * API CLIENT
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Centralized API client with tenant-aware request interceptors.
 * Handles authentication, error handling, and request/response transformations.
 */

import type { ApiResponse, PaginationParams } from '@/lib/types';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Storage keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TENANT_ID_KEY = 'tenant_id';

// ════════════════════════════════════════════════════════════════════════════
// TOKEN MANAGEMENT
// ════════════════════════════════════════════════════════════════════════════

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function getTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TENANT_ID_KEY);
}

export function setTenantId(tenantId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TENANT_ID_KEY, tenantId);
}

// ════════════════════════════════════════════════════════════════════════════
// REQUEST/RESPONSE HELPERS
// ════════════════════════════════════════════════════════════════════════════

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
  skipAuth?: boolean;
}

/**
 * Build URL with query parameters
 */
function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined>): string {
  const url = new URL(`${API_BASE_URL}${endpoint}`, window.location.origin);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    });
  }
  
  return url.toString();
}

/**
 * Build headers with authentication and tenant context
 */
function buildHeaders(options?: RequestOptions): Headers {
  const headers = new Headers(options?.headers);
  
  if (!headers.has('Content-Type') && !(options?.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  
  // Add auth token if not skipped
  if (!options?.skipAuth) {
    const token = getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
  }
  
  // Add tenant context for Super Admin
  const tenantId = getTenantId();
  if (tenantId) {
    headers.set('x-tenant-id', tenantId);
  }
  
  return headers;
}

/**
 * Handle API response
 */
async function handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
  // Handle 204 No Content
  if (response.status === 204) {
    return { success: true };
  }

  const data = await response.json();
  
  // Handle errors
  if (!response.ok) {
    // Handle 401 - attempt token refresh
    if (response.status === 401 && !response.url.includes('/auth/refresh')) {
      const refreshed = await attemptTokenRefresh();
      if (!refreshed) {
        clearTokens();
        window.location.href = '/login';
      }
    }
    
    throw new ApiError(
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.message || 'An error occurred',
      response.status,
      data.error?.details
    );
  }
  
  return data as ApiResponse<T>;
}

/**
 * Attempt to refresh the access token
 */
async function attemptTokenRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    if (data.success && data.data) {
      setAccessToken(data.data.accessToken);
      setRefreshToken(data.data.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ════════════════════════════════════════════════════════════════════════════
// API CLIENT METHODS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Make a GET request
 */
export async function get<T>(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, params);
  const response = await fetch(url, {
    ...options,
    method: 'GET',
    headers: buildHeaders(options),
  });
  return handleResponse<T>(response);
}

/**
 * Make a POST request
 */
export async function post<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  const response = await fetch(url, {
    ...options,
    method: 'POST',
    headers: buildHeaders(options),
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
  return handleResponse<T>(response);
}

/**
 * Make a PATCH request
 */
export async function patch<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  const response = await fetch(url, {
    ...options,
    method: 'PATCH',
    headers: buildHeaders(options),
    body: JSON.stringify(data),
  });
  return handleResponse<T>(response);
}

/**
 * Make a PUT request
 */
export async function put<T, D = unknown>(
  endpoint: string,
  data?: D,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  const response = await fetch(url, {
    ...options,
    method: 'PUT',
    headers: buildHeaders(options),
    body: JSON.stringify(data),
  });
  return handleResponse<T>(response);
}

/**
 * Make a DELETE request
 */
export async function del<T>(
  endpoint: string,
  options?: RequestOptions
): Promise<ApiResponse<T>> {
  const url = buildUrl(endpoint, options?.params);
  const response = await fetch(url, {
    ...options,
    method: 'DELETE',
    headers: buildHeaders(options),
  });
  return handleResponse<T>(response);
}

// ════════════════════════════════════════════════════════════════════════════
// ERROR CLASS
// ════════════════════════════════════════════════════════════════════════════

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ════════════════════════════════════════════════════════════════════════════
// UTILITY TYPES
// ════════════════════════════════════════════════════════════════════════════

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    page: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export type QueryParams = PaginationParams & Record<string, string | number | boolean | undefined>;
