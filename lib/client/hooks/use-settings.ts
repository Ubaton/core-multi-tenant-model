/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM SETTINGS HOOKS (Super Admin)
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, post, put } from '../api-client';
import type { UpdateSystemSettingsInput } from '@/lib/validations';

// Query keys
export const settingsKeys = {
  all: ['settings'] as const,
  detail: () => [...settingsKeys.all, 'detail'] as const,
};

export interface SystemSettings {
  id: string;
  // General Settings
  platformName: string;
  platformDescription: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultTimezone: string;
  // Email/SMTP Settings
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean;
  hasSmtpPassword: boolean;
  // Notification Settings
  notifyNewTenant: boolean;
  notifySystemErrors: boolean;
  notifyDailySummary: boolean;
  notifySecurityAlerts: boolean;
  // Security Settings
  sessionTimeoutMins: number;
  maxLoginAttempts: number;
  lockoutDurationMins: number;
  passwordMinLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  require2FA: boolean;
  // Timestamps
  createdAt: string;
  updatedAt: string;
}

/**
 * Hook to fetch system settings
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: async () => {
      const response = await get<SystemSettings>('/api/settings');
      return response.data!;
    },
  });
}

export interface SmtpTestResult {
  ok: boolean;
  message: string;
  host?: string;
  port?: number;
  sentTo?: string;
}

/**
 * Hook to test the saved SMTP settings by sending a message to the signed-in
 * Super Admin. Tests the stored configuration, so save before testing.
 */
export function useTestEmail() {
  return useMutation({
    mutationFn: async () => {
      const response = await post<SmtpTestResult>('/api/settings/test-email', {});
      return response.data!;
    },
  });
}

/**
 * Hook to update system settings
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateSystemSettingsInput) => {
      const response = await put<SystemSettings>('/api/settings', data);
      return response.data!;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.detail(), data);
    },
  });
}
