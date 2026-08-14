/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM SETTINGS API - GET & UPDATE
 * GET  /api/settings - Get system settings (Super Admin only)
 * PUT  /api/settings - Update system settings (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 */

import { query } from '@/lib/db';
import {
  withSuperAdmin,
  successResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { updateSystemSettingsSchema } from '@/lib/validations';

const SETTINGS_ID = 'system_settings';

interface SystemSettingsRow {
  id: string;
  platform_name: string;
  platform_description: string | null;
  support_email: string | null;
  support_phone: string | null;
  default_timezone: string;
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_secure: boolean;
  notify_new_tenant: boolean;
  notify_system_errors: boolean;
  notify_daily_summary: boolean;
  notify_security_alerts: boolean;
  session_timeout_mins: number;
  max_login_attempts: number;
  lockout_duration_mins: number;
  password_min_length: number;
  require_uppercase: boolean;
  require_number: boolean;
  require_special_char: boolean;
  require_2fa: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapSettingsRow(row: SystemSettingsRow) {
  return {
    id: row.id,
    platformName: row.platform_name,
    platformDescription: row.platform_description,
    supportEmail: row.support_email,
    supportPhone: row.support_phone,
    defaultTimezone: row.default_timezone,
    smtpHost: row.smtp_host,
    smtpPort: row.smtp_port,
    smtpUser: row.smtp_user,
    smtpPass: row.smtp_pass,
    smtpFromEmail: row.smtp_from_email,
    smtpFromName: row.smtp_from_name,
    smtpSecure: row.smtp_secure,
    notifyNewTenant: row.notify_new_tenant,
    notifySystemErrors: row.notify_system_errors,
    notifyDailySummary: row.notify_daily_summary,
    notifySecurityAlerts: row.notify_security_alerts,
    sessionTimeoutMins: row.session_timeout_mins,
    maxLoginAttempts: row.max_login_attempts,
    lockoutDurationMins: row.lockout_duration_mins,
    passwordMinLength: row.password_min_length,
    requireUppercase: row.require_uppercase,
    requireNumber: row.require_number,
    requireSpecialChar: row.require_special_char,
    require2FA: row.require_2fa,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// Maps camelCase input field name -> snake_case column name
const COLUMN_MAP: Record<string, string> = {
  platformName: 'platform_name',
  platformDescription: 'platform_description',
  supportEmail: 'support_email',
  supportPhone: 'support_phone',
  defaultTimezone: 'default_timezone',
  smtpHost: 'smtp_host',
  smtpPort: 'smtp_port',
  smtpUser: 'smtp_user',
  smtpPass: 'smtp_pass',
  smtpFromEmail: 'smtp_from_email',
  smtpFromName: 'smtp_from_name',
  smtpSecure: 'smtp_secure',
  notifyNewTenant: 'notify_new_tenant',
  notifySystemErrors: 'notify_system_errors',
  notifyDailySummary: 'notify_daily_summary',
  notifySecurityAlerts: 'notify_security_alerts',
  sessionTimeoutMins: 'session_timeout_mins',
  maxLoginAttempts: 'max_login_attempts',
  lockoutDurationMins: 'lockout_duration_mins',
  passwordMinLength: 'password_min_length',
  requireUppercase: 'require_uppercase',
  requireNumber: 'require_number',
  requireSpecialChar: 'require_special_char',
  require2FA: 'require_2fa',
};

async function getSettings(): Promise<SystemSettingsRow | null> {
  const rows = await query<SystemSettingsRow>(
    `SELECT * FROM system_settings WHERE id = $1`,
    [SETTINGS_ID]
  );
  return rows[0] ?? null;
}

async function createDefaultSettings(): Promise<SystemSettingsRow> {
  const rows = await query<SystemSettingsRow>(
    `INSERT INTO system_settings (id) VALUES ($1) RETURNING *`,
    [SETTINGS_ID]
  );
  return rows[0];
}

/**
 * GET /api/settings
 * Get current system settings
 */
export const GET = withSuperAdmin(async () => {
  // Get or create default settings
  let settingsRow = await getSettings();

  if (!settingsRow) {
    // Create default settings if they don't exist
    settingsRow = await createDefaultSettings();
  }

  const settings = mapSettingsRow(settingsRow);

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
  const currentSettingsRow = await getSettings();

  // If smtpPass is empty string, keep the existing password
  const updateData: Record<string, unknown> = { ...data };
  if (updateData.smtpPass === '' || updateData.smtpPass === undefined) {
    delete updateData.smtpPass;
  }

  // Upsert settings (create if not exists, update if exists)
  const columns: string[] = ['id'];
  const values: unknown[] = [SETTINGS_ID];
  const updateAssignments: string[] = [];

  for (const [key, value] of Object.entries(updateData)) {
    const column = COLUMN_MAP[key];
    if (!column) continue;
    columns.push(column);
    values.push(value);
  }

  const insertPlaceholders = columns.map((_, i) => `$${i + 1}`);
  // Build ON CONFLICT update assignments (skip id)
  for (let i = 1; i < columns.length; i++) {
    updateAssignments.push(`${columns[i]} = EXCLUDED.${columns[i]}`);
  }
  updateAssignments.push('updated_at = NOW()');

  const upsertSql = `
    INSERT INTO system_settings (${columns.join(', ')})
    VALUES (${insertPlaceholders.join(', ')})
    ON CONFLICT (id) DO UPDATE SET ${updateAssignments.join(', ')}
    RETURNING *
  `;

  const upsertedRows = await query<SystemSettingsRow>(upsertSql, values);
  const settingsRow = upsertedRows[0];
  const settings = mapSettingsRow(settingsRow);

  // Log audit
  await logAudit(
    user.id,
    null, // Global settings, no tenant
    'UPDATE_SYSTEM_SETTINGS',
    'SystemSettings',
    SETTINGS_ID,
    currentSettingsRow ? { ...mapSettingsRow(currentSettingsRow), smtpPass: '[REDACTED]' } : null,
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
