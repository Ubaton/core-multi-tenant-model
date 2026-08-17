/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH HOOKS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * TanStack Query hooks for authentication operations.
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import {
  get,
  post,
  patch,
  setAccessToken,
  setRefreshToken,
  clearTokens,
  setTenantId,
} from '../api-client';
import type {
  LoginInput,
  RegisterInput,
  ForgotPasswordInput,
  ResetPasswordInput,
} from '@/lib/validations';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
  resetToken: (token: string | null) => [...authKeys.all, 'reset-token', token] as const,
};

// Types
interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string | null;
  role: string;
  tenantId: string | null;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    logo?: string;
  } | null;
}

interface UpdateProfileInput {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
}

interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

interface ForgotPasswordResponse {
  message: string;
  emailConfigured: boolean;
  /** Development-only fallback when no mail provider is configured */
  resetUrl?: string;
}

interface LoginResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Get current authenticated user
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me(),
    queryFn: async () => {
      const response = await get<AuthUser>('/api/auth/me');
      return response.data!;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Login mutation
 */
export function useLogin() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (credentials: LoginInput) => {
      const response = await post<LoginResponse>('/api/auth/login', credentials, {
        skipAuth: true,
      });
      return response.data!;
    },
    onSuccess: (data) => {
      // Store tokens
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      
      // Store tenant ID for Super Admin context
      if (data.user.tenantId) {
        setTenantId(data.user.tenantId);
      }

      // Update cache
      queryClient.setQueryData(authKeys.me(), data.user);

      // Redirect based on role
      if (data.user.role === 'SUPER_ADMIN') {
        router.push('/super-admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    },
  });
}

/**
 * Logout mutation
 */
export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async () => {
      await post('/api/auth/logout');
    },
    onSettled: () => {
      // Clear tokens and cache regardless of success
      clearTokens();
      queryClient.clear();
      router.push('/login');
    },
  });
}

/**
 * Register mutation
 */
export function useRegister() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: async (data: RegisterInput) => {
      const response = await post<LoginResponse>('/api/auth/register', data, {
        skipAuth: true,
      });
      return response.data!;
    },
    onSuccess: (data) => {
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      if (data.user.tenantId) {
        setTenantId(data.user.tenantId);
      }
      queryClient.setQueryData(authKeys.me(), data.user);
      router.push('/dashboard');
    },
  });
}

/**
 * Update current user's profile
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateProfileInput) => {
      const response = await patch<AuthUser>('/api/auth/me', data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(authKeys.me(), data);
    },
  });
}

/**
 * Change password mutation
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: ChangePasswordInput) => {
      const response = await post<{ message: string }>('/api/auth/change-password', data);
      return response.data!;
    },
  });
}

/**
 * Request a password reset link.
 *
 * The response is deliberately the same for known and unknown addresses.
 * `resetUrl` is only present in development when no mail provider is set up.
 */
export function useForgotPassword() {
  return useMutation({
    mutationFn: async (data: ForgotPasswordInput) => {
      const response = await post<ForgotPasswordResponse>(
        '/api/auth/forgot-password',
        data,
        { skipAuth: true }
      );
      return response.data!;
    },
  });
}

/**
 * Check whether a reset token is still valid before rendering the form
 */
export function useValidateResetToken(token: string | null) {
  return useQuery({
    queryKey: authKeys.resetToken(token),
    queryFn: async () => {
      const response = await get<{ valid: boolean; expiresAt: string }>(
        '/api/auth/reset-password',
        { token: token! },
        { skipAuth: true }
      );
      return response.data!;
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });
}

/**
 * Redeem a reset token and set a new password
 */
export function useResetPassword() {
  return useMutation({
    mutationFn: async (data: ResetPasswordInput) => {
      const response = await post<{ message: string }>('/api/auth/reset-password', data, {
        skipAuth: true,
      });
      return response.data!;
    },
  });
}

