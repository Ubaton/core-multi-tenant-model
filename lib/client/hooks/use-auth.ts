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
import type { LoginInput, RegisterInput } from '@/lib/validations';

// Query keys
export const authKeys = {
  all: ['auth'] as const,
  me: () => [...authKeys.all, 'me'] as const,
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

