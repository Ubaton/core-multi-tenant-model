/**
 * ════════════════════════════════════════════════════════════════════════════
 * EMAIL DELIVERY
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Minimal transactional email sender with two interchangeable transports.
 *
 * Delivery is attempted in this order:
 *   1. SMTP, using the credentials a Super Admin saved in system_settings.
 *      This is the primary path - it lets the platform be pointed at the
 *      church's own mailbox without a redeploy.
 *   2. The Resend HTTP API, when RESEND_API_KEY is set. Useful on hosts that
 *      block outbound SMTP.
 *   3. Neither configured - the message is logged to the server console so the
 *      reset flow stays usable in development.
 *
 * Sending never throws. Callers must not leak delivery failures to
 * unauthenticated users, so failures are logged and reported through the
 * returned `delivered` flag instead.
 *
 * Environment:
 *   RESEND_API_KEY  Fallback provider key. When absent, only SMTP is tried.
 *   EMAIL_FROM      From address used by the Resend fallback.
 *   APP_URL         Public base URL used to build links (falls back to the
 *                   request origin). Set this in production - behind a proxy
 *                   the request origin can be an internal hostname.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { query } from '@/lib/db';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  /** True when the message was handed to a transport. False when only logged. */
  delivered: boolean;
}

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  secure: boolean;
  fromEmail: string;
  fromName: string | null;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const SETTINGS_ID = 'system_settings';

// ════════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════

interface SmtpSettingsRow {
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_pass: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  smtp_secure: boolean | null;
}

/**
 * Read SMTP credentials from system settings. Returns null when the settings
 * row is missing or incomplete - a half-filled form is not a usable transport.
 */
async function loadSmtpConfig(): Promise<SmtpConfig | null> {
  let row: SmtpSettingsRow | undefined;

  try {
    const rows = await query<SmtpSettingsRow>(
      `SELECT smtp_host, smtp_port, smtp_user, smtp_pass,
              smtp_from_email, smtp_from_name, smtp_secure
       FROM system_settings
       WHERE id = $1`,
      [SETTINGS_ID]
    );
    row = rows[0];
  } catch (error) {
    console.error('[email] Could not read SMTP settings:', error);
    return null;
  }

  if (!row?.smtp_host || !row.smtp_user || !row.smtp_pass) {
    return null;
  }

  const port = row.smtp_port ?? 587;

  return {
    host: row.smtp_host,
    port,
    user: row.smtp_user,
    pass: row.smtp_pass,
    // Implicit TLS on 465; STARTTLS is negotiated on every other port.
    secure: row.smtp_secure ?? port === 465,
    fromEmail: row.smtp_from_email ?? row.smtp_user,
    fromName: row.smtp_from_name,
  };
}

/**
 * True when some transport can actually deliver mail. Async because the SMTP
 * credentials live in the database, not the environment.
 */
export async function isEmailConfigured(): Promise<boolean> {
  if (process.env.RESEND_API_KEY) {
    return true;
  }
  return (await loadSmtpConfig()) !== null;
}

/**
 * Resolve the public base URL for links in emails.
 * Prefers APP_URL, then the request origin, then the dev default.
 */
export function resolveAppUrl(requestUrl?: string): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/+$/, '');
  }

  if (requestUrl) {
    try {
      return new URL(requestUrl).origin;
    } catch {
      // fall through to default
    }
  }

  return 'http://localhost:4020';
}

// ════════════════════════════════════════════════════════════════════════════
// TRANSPORTS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Transporters pool TCP connections, so reuse one across requests. Keyed on the
 * settings that define it, so saving new credentials builds a fresh transport
 * rather than silently sending through the old one.
 */
let cachedTransport: { key: string; transporter: Transporter } | null = null;

function getTransporter(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}:${config.secure}:${config.pass}`;

  if (cachedTransport?.key === key) {
    return cachedTransport.transporter;
  }

  cachedTransport?.transporter.close();

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.user, pass: config.pass },
    // Serverless invocations are short-lived; fail fast rather than hanging the
    // request when the host silently drops the connection.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  cachedTransport = { key, transporter };
  return transporter;
}

async function sendViaSmtp(
  input: SendEmailInput,
  config: SmtpConfig
): Promise<SendEmailResult> {
  const from = config.fromName
    ? `${config.fromName} <${config.fromEmail}>`
    : config.fromEmail;

  try {
    await getTransporter(config).sendMail({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    });
    return { delivered: true };
  } catch (error) {
    console.error(
      `[email] SMTP delivery failed via ${config.host}:${config.port} -`,
      error
    );
    // A failed transport is usually a bad credential or a dropped socket; drop
    // it so the next attempt reconnects instead of reusing a dead pool.
    cachedTransport?.transporter.close();
    cachedTransport = null;
    return { delivered: false };
  }
}

async function sendViaResend(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { delivered: false };
  }

  const from = process.env.EMAIL_FROM ?? 'ChurchHub <onboarding@resend.dev>';

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error(`[email] Provider rejected message (${response.status}): ${detail}`);
      return { delivered: false };
    }

    return { delivered: true };
  } catch (error) {
    console.error('[email] Failed to send message:', error);
    return { delivered: false };
  }
}

/**
 * Send an email over the first transport that works. Resolves with
 * delivered: false rather than throwing when none is configured or all fail.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const smtpConfig = await loadSmtpConfig();

  if (smtpConfig) {
    const result = await sendViaSmtp(input, smtpConfig);
    if (result.delivered) {
      return result;
    }
    console.warn('[email] SMTP failed; falling back to the HTTP provider.');
  }

  if (process.env.RESEND_API_KEY) {
    return sendViaResend(input);
  }

  console.info(
    `[email] No working transport - message not sent.\n` +
      `  To:      ${input.to}\n` +
      `  Subject: ${input.subject}\n` +
      `  Body:\n${input.text}`
  );
  return { delivered: false };
}

// ════════════════════════════════════════════════════════════════════════════
// TEMPLATES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Send the password reset link. `expiryMinutes` is stated in the body so the
 * recipient knows how long they have.
 */
export async function sendPasswordResetEmail(options: {
  to: string;
  firstName: string;
  resetUrl: string;
  expiryMinutes: number;
}): Promise<SendEmailResult> {
  const { to, firstName, resetUrl, expiryMinutes } = options;

  const text =
    `Hi ${firstName},\n\n` +
    `We received a request to reset your ChurchHub password.\n\n` +
    `Reset your password: ${resetUrl}\n\n` +
    `This link expires in ${expiryMinutes} minutes and can only be used once.\n` +
    `If you did not request a password reset you can safely ignore this email - ` +
    `your password will stay the same.\n`;

  const html = `
    <div style="font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #111827;">
      <h1 style="font-size: 20px; margin: 0 0 16px;">Reset your password</h1>
      <p style="margin: 0 0 16px;">Hi ${escapeHtml(firstName)},</p>
      <p style="margin: 0 0 16px;">We received a request to reset your ChurchHub password.</p>
      <p style="margin: 0 0 24px;">
        <a href="${escapeHtml(resetUrl)}"
           style="display: inline-block; background: #4f46e5; color: #ffffff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600;">
          Reset password
        </a>
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #4b5563;">
        This link expires in ${expiryMinutes} minutes and can only be used once.
      </p>
      <p style="margin: 0; font-size: 14px; color: #4b5563;">
        If you did not request a password reset you can safely ignore this email. Your password will stay the same.
      </p>
    </div>
  `;

  return sendEmail({
    to,
    subject: 'Reset your ChurchHub password',
    html,
    text,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
