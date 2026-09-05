/**
 * ════════════════════════════════════════════════════════════════════════════
 * EMAIL DELIVERY
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Minimal transactional email sender with two interchangeable transports.
 *
 * Delivery is attempted in this order:
 *   1. The Resend HTTP API, whenever RESEND_API_KEY is set. Preferred because
 *      serverless hosts (Vercel among them) block outbound SMTP, so trying
 *      SMTP first would burn its connection timeout on every single send.
 *   2. SMTP, using the credentials a Super Admin saved in system_settings.
 *      Works when the app is self-hosted, and lets the platform be pointed at
 *      the church's own mailbox without a redeploy.
 *   3. Neither configured - the message is logged to the server console so the
 *      reset flow stays usable in development.
 *
 * Sending never throws. Callers must not leak delivery failures to
 * unauthenticated users, so failures are logged and reported through the
 * returned `delivered` flag instead.
 *
 * Environment:
 *   RESEND_API_KEY  Resend key. When absent, only SMTP is tried.
 *   EMAIL_FROM      From address, e.g. "Name <noreply@yourdomain>". Required
 *                   whenever RESEND_API_KEY is set; its domain must be
 *                   verified at resend.com/domains.
 *   EMAIL_REPLY_TO  Optional. Where replies go when the From address is a
 *                   noreply@ that nobody reads.
 *   APP_URL         Public base URL used to build links (falls back to the
 *                   request origin). Set this in production - behind a proxy
 *                   the request origin can be an internal hostname.
 */

import nodemailer, { type Transporter } from 'nodemailer';
import { Resend } from 'resend';
import { query } from '@/lib/db';

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
  /**
   * Resend de-duplicates sends sharing a key for 24 hours. Shaped
   * `<event-type>/<entity-id>`. Lets a retry after a timeout be safe rather
   * than delivering the same message twice.
   */
  idempotencyKey?: string;
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

/**
 * Resend's client is cheap to construct but holds config, so build it once.
 * Created lazily: the key is read at send time, not at module load.
 */
let resendClient: { key: string; client: Resend } | null = null;

function getResendClient(apiKey: string): Resend {
  if (resendClient?.key !== apiKey) {
    resendClient = { key: apiKey, client: new Resend(apiKey) };
  }
  return resendClient.client;
}

async function sendViaResend(
  input: SendEmailInput
): Promise<SendEmailResult & { error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { delivered: false, error: 'RESEND_API_KEY is not set.' };
  }

  // No test-address fallback: onboarding@resend.dev only delivers to the
  // account owner, so defaulting to it would silently drop mail to everyone
  // else. Better to fail loudly with an actionable reason.
  const from = process.env.EMAIL_FROM;
  if (!from) {
    return {
      delivered: false,
      error:
        'EMAIL_FROM is not set. Set it to a verified sender, e.g. ' +
        '"Unity Fellowship Church <noreply@unityfellowshipchurch.org.za>".',
    };
  }

  try {
    // The SDK reports failures on `error` rather than throwing; try/catch here
    // is only for network-level faults.
    const { data, error } = await getResendClient(apiKey).emails.send({
      from,
      to: [input.to],
      subject: input.subject,
      html: input.html,
      text: input.text,
      ...(process.env.EMAIL_REPLY_TO ? { replyTo: process.env.EMAIL_REPLY_TO } : {}),
      ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
    });

    if (error) {
      console.error('[email] Resend rejected message:', error);
      return { delivered: false, error: describeResendError(error, from) };
    }

    console.info(`[email] Sent via Resend (id: ${data?.id ?? 'unknown'})`);
    return { delivered: true };
  } catch (error) {
    console.error('[email] Failed to reach Resend:', error);
    return {
      delivered: false,
      error: `Could not reach the Resend API: ${
        error instanceof Error ? error.message : String(error)
      }`,
    };
  }
}

/**
 * Turn a Resend rejection into something an administrator can act on. The SDK
 * error is aimed at developers, not at whoever is filling in settings.
 */
function describeResendError(
  error: { name?: string; message?: string },
  from: string
): string {
  const name = error.name ?? '';
  const message = error.message ?? '';

  if (name === 'restricted_api_key') {
    return 'This Resend API key is restricted and cannot send. Create a key with sending permission.';
  }
  if (name === 'invalid_access' || message.includes('API key is invalid')) {
    return 'Resend rejected the API key. Check RESEND_API_KEY in the deployment environment.';
  }
  if (name === 'rate_limit_exceeded') {
    return 'Resend rate limit reached. Wait a moment and try again.';
  }
  if (message.includes('not verified') || message.includes('domain')) {
    return `Resend will not send from ${from}: the domain is not verified. Add the DNS records Resend lists at resend.com/domains, then retry.`;
  }
  if (name === 'validation_error' || name === 'missing_required_field') {
    return `Resend rejected the message: ${message}`;
  }
  return `Resend error (${name || 'unknown'}): ${message}`;
}

/**
 * Send an email over the first transport that works. Resolves with
 * delivered: false rather than throwing when none is configured or all fail.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend(input);
    if (result.delivered) {
      return { delivered: true };
    }
    console.warn('[email] Resend failed; trying SMTP if it is configured.');
  }

  const smtpConfig = await loadSmtpConfig();
  if (smtpConfig) {
    const result = await sendViaSmtp(input, smtpConfig);
    if (result.delivered) {
      return result;
    }
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
// DIAGNOSTICS
// ════════════════════════════════════════════════════════════════════════════

export interface SmtpTestResult {
  ok: boolean;
  /** Human-readable outcome, safe to show a Super Admin. */
  message: string;
  /** Which transport was exercised, so the admin knows what was proven. */
  transport: 'resend' | 'smtp' | 'none';
  /** Which host was dialled, so the admin can spot a typo. */
  host?: string;
  port?: number;
}

/**
 * Translate a nodemailer/socket failure into something an administrator can
 * act on. The raw errors name a syscall, not the mistake that caused it.
 */
function describeSmtpError(error: unknown, config: SmtpConfig): string {
  const code = (error as { code?: string; responseCode?: number })?.code;
  const responseCode = (error as { responseCode?: number })?.responseCode;
  const raw = error instanceof Error ? error.message : String(error);

  if (code === 'EAUTH' || responseCode === 535) {
    return `The server rejected the username or password for ${config.user}.`;
  }
  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
    const hint =
      config.secure && config.port !== 465
        ? ` Port ${config.port} usually expects TLS/SSL to be off (STARTTLS).`
        : !config.secure && config.port === 465
          ? ' Port 465 requires TLS/SSL to be on.'
          : '';
    return `Could not connect to ${config.host} on port ${config.port}.${hint}`;
  }
  if (code === 'EDNS' || code === 'ENOTFOUND') {
    return `The host ${config.host} could not be found. Check it for a typo.`;
  }
  return `The mail server reported: ${raw}`;
}

/**
 * Open a connection with the saved credentials and authenticate, without
 * sending anything. When `sendTo` is given, also deliver a short test message
 * so the admin gets end-to-end proof rather than just a successful handshake.
 */
/**
 * Exercise the transport that a real password reset would use, and send a test
 * message so the admin gets end-to-end proof rather than a bare handshake.
 *
 * Deliberately mirrors sendEmail's precedence: testing SMTP while production
 * actually sends over Resend would be a green light for the wrong thing.
 */
export async function testEmailDelivery(sendTo: string): Promise<SmtpTestResult> {
  if (process.env.RESEND_API_KEY) {
    const result = await sendViaResend({
      to: sendTo,
      subject: 'ChurchHub email test',
      text:
        'This is a test message from ChurchHub, sent through Resend.\n\n' +
        'If you received it, password reset emails will work.\n',
      html:
        '<p>This is a test message from ChurchHub, sent through Resend.</p>' +
        '<p>If you received it, password reset emails will work.</p>',
    });

    if (!result.delivered) {
      return {
        ok: false,
        transport: 'resend',
        message: result.error ?? 'Resend could not deliver the test message.',
      };
    }

    return {
      ok: true,
      transport: 'resend',
      message: `Test email sent to ${sendTo} via Resend. Check the inbox, and the spam folder.`,
    };
  }

  const config = await loadSmtpConfig();

  if (!config) {
    return {
      ok: false,
      transport: 'none',
      message:
        'No email transport is configured. Set RESEND_API_KEY in the environment, ' +
        'or fill in the SMTP host, username and password above and save.',
    };
  }

  const where = { host: config.host, port: config.port };

  try {
    await getTransporter(config).verify();
  } catch (error) {
    console.error('[email] SMTP verification failed:', error);
    cachedTransport?.transporter.close();
    cachedTransport = null;
    return {
      ok: false,
      transport: 'smtp',
      message: describeSmtpError(error, config),
      ...where,
    };
  }

  const result = await sendViaSmtp(
    {
      to: sendTo,
      subject: 'ChurchHub SMTP test',
      text:
        'This is a test message from ChurchHub.\n\n' +
        `Sent through ${config.host}:${config.port} as ${config.user}.\n` +
        'If you received it, password reset emails will work.\n',
      html:
        `<p>This is a test message from ChurchHub.</p>` +
        `<p>Sent through ${escapeHtml(config.host)}:${config.port} as ${escapeHtml(config.user)}.</p>` +
        `<p>If you received it, password reset emails will work.</p>`,
    },
    config
  );

  if (!result.delivered) {
    return {
      ok: false,
      transport: 'smtp',
      message:
        `Signed in to ${config.host}, but the test message was rejected. ` +
        `The From address (${config.fromEmail}) usually has to match the mailbox you authenticate as.`,
      ...where,
    };
  }

  return {
    ok: true,
    transport: 'smtp',
    message: `Test email sent to ${sendTo}. Check the inbox, and the spam folder.`,
    ...where,
  };
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

  // One key per reset token: a retried send after a timeout cannot deliver two
  // copies of the same link. Keys expire after 24h, well past the 60m expiry.
  const tokenId = resetUrl.split('token=')[1]?.slice(0, 32) ?? '';

  return sendEmail({
    to,
    subject: 'Reset your ChurchHub password',
    html,
    text,
    idempotencyKey: tokenId ? `password-reset/${tokenId}` : undefined,
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
