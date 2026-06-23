/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM SETTINGS API - GET & UPDATE
 * GET  /api/settings - Get system settings (Super Admin only)
 * PUT  /api/settings - Update system settings (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { 
  withSuperAdmin, 
  successResponse, 
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateSystemSettingsSchema } from '@/lib/validations';

const SETTINGS_ID = 'system_settings';

/**
 * GET /api/settings
 * Get current system settings
 */
export const GET = withSuperAdmin(async (request, { user }) => {
  // Get or create default settings
  let settings = await prisma.systemSettings.findUnique({
    where: { id: SETTINGS_ID },
    cacheStrategy: { ttl: 300, swr: 60 },
  });

  if (!settings) {
    // Create default settings if they don't exist
    settings = await prisma.systemSettings.create({
      data: { id: SETTINGS_ID },
    });
  }

  // Don't expose the SMTP password
  const { smtpPass, ...safeSettings } = settings;

  return successResponse({
    ...safeSettings,
    hasSmtpPassword: !!smtpPass,
  });
});

/**
 * PUT /api/settings
 * Update system settings
 */
export const PUT = withSuperAdmin(async (request, { user }) => {
  const data = await parseBody(request, updateSystemSettingsSchema);

  // Get current settings for audit log
  const currentSettings = await prisma.systemSettings.findUnique({
    where: { id: SETTINGS_ID },
  });

  // If smtpPass is empty string, keep the existing password
  const updateData = { ...data };
  if (updateData.smtpPass === '' || updateData.smtpPass === undefined) {
    delete updateData.smtpPass;
  }

  // Upsert settings (create if not exists, update if exists)
  const settings = await prisma.systemSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { 
      id: SETTINGS_ID,
      ...updateData,
    },
    update: updateData,
  });

  // Log audit
  await logAudit(
    user.id,
    null, // Global settings, no tenant
    'UPDATE_SYSTEM_SETTINGS',
    'SystemSettings',
    SETTINGS_ID,
    currentSettings ? { ...currentSettings, smtpPass: '[REDACTED]' } : null,
    { ...settings, smtpPass: '[REDACTED]' },
    request
  );

  // Don't expose the SMTP password
  const { smtpPass, ...safeSettings } = settings;

  return successResponse({
    ...safeSettings,
    hasSmtpPassword: !!smtpPass,
  });
});
