/**
 * ════════════════════════════════════════════════════════════════════════════
 * EMAIL DELIVERY
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Minimal, dependency-free transactional email sender.
 *
 * Delivery uses the Resend HTTP API when RESEND_API_KEY is set. When it is not
 * configured the message is logged to the server console instead, so the reset
 * flow remains usable in development and in environments without a mail
 * provider. Sending never throws - callers must not leak delivery failures to
 * unauthenticated users.
 *
 * Environment:
 *   RESEND_API_KEY  API key. When absent, emails are logged, not sent.
 *   EMAIL_FROM      From address, e.g. "ChurchHub <noreply@example.com>".
 *   APP_URL         Public base URL used to build links (falls back to the
 *                   request origin).
 */

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface SendEmailResult {
  /** True when the message was handed to a provider. False when only logged. */
  delivered: boolean;
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails';

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
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

/**
 * Send an email. Resolves with delivered: false rather than throwing when no
 * provider is configured or the provider rejects the request.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'ChurchHub <onboarding@resend.dev>';

  if (!apiKey) {
    console.info(
      `[email] RESEND_API_KEY not configured - message not sent.\n` +
        `  To:      ${input.to}\n` +
        `  Subject: ${input.subject}\n` +
        `  Body:\n${input.text}`
    );
    return { delivered: false };
  }

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
