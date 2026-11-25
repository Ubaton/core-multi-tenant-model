import QRCode from 'qrcode';
import { z } from 'zod';
import { query } from '@/lib/db';
import { escapeHtml, sendEmail } from '@/lib/email';
import { getChurchOpeningCheckInUrl } from './attendance';
import { REGISTRATION_FIELDS, type RegistrationData } from './fields';

const FROM = 'Unity Fellowship Church <noreply@unityfellowshipchurch.org.za>';
const EVENT_INBOX = 'TheVillage@unityfellowshipchurch.org.za';
const EVENT_NAME = 'Village of the Lord Church Opening';
const OFFICIAL_ADMIN_URL = 'https://admin.unityfellowshipchurch.org.za';

export function isChurchOpeningEmailTenant(tenantSlug: string): boolean {
  return tenantSlug === (process.env.CHURCH_OPENING_EMAIL_TENANT_SLUG || 'unity-fellowship-church');
}

interface RegistrationEmailDetails {
  tenantId: string;
  registrationId: string;
  code: string;
  data: RegistrationData;
}

interface ReceiptRegistration {
  id: string;
  names: string;
  surname: string;
  email: string;
  registration_code: string;
  receipt_sent_at: Date | null;
  receipt_send_started_at: Date;
}

function receiptHtml(name: string, code: string, instruction: string, qrContentId?: string): string {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Registration confirmation</title></head>
<body style="margin:0;padding:0;background-color:#eef0f7;color:#1c2450;font-family:Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#eef0f7;">
    <tr><td align="center" style="padding:24px 12px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background-color:#ffffff;border:1px solid #dce1ee;border-radius:16px;">
        <tr><td style="padding:14px 24px 12px;border-bottom:3px solid #ba873b;">
          <img src="${OFFICIAL_ADMIN_URL}/UFC-Logo.png" width="80" height="80" alt="Unity Fellowship Church" style="display:block;border:0;">
        </td></tr>
        <tr><td style="padding:22px 24px 18px;">
          <p style="margin:0 0 8px;color:#414a72;font-size:14px;line-height:20px;font-weight:bold;">Registration confirmed</p>
          <h1 style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;line-height:32px;color:#1c2450;">${EVENT_NAME}</h1>
          <p style="margin:0 0 10px;font-size:16px;line-height:25px;">Hi ${escapeHtml(name)}, thank you for registering!</p>
          <p style="margin:0;font-size:16px;line-height:25px;">${instruction}</p>
        </td></tr>
        <tr><td style="padding:0 24px 28px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border:1px solid #dce1ee;background-color:#f2f4fa;border-radius:12px;">
            <tr><td align="center" style="padding:18px 8px;">
              <p style="margin:0 0 6px;color:#414a72;font-size:14px;line-height:20px;">Registration code</p>
              <p style="margin:0;font-family:'Courier New',monospace;font-size:19px;line-height:26px;font-weight:bold;color:#1c2450;">${escapeHtml(code)}</p>
              ${qrContentId ? `<img src="cid:${qrContentId}" width="208" height="208" alt="Gate check-in QR code" style="display:block;max-width:100%;height:auto;margin:14px auto 0;background-color:#ffffff;border:0;">` : ''}
            </td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendReceipt(registration: ReceiptRegistration, email: string) {
  const { id, registration_code: code, receipt_sent_at: previousSend } = registration;
  const name = `${registration.names} ${registration.surname}`;
  const contentId = `${id}@unityfellowshipchurch.org.za`;
  const qr = await QRCode.toBuffer(
    getChurchOpeningCheckInUrl(code, OFFICIAL_ADMIN_URL),
    { width: 256, margin: 4, errorCorrectionLevel: 'M' }
  ).catch(() => {
    console.warn('[church-opening] Could not generate the email QR code.');
    return null;
  });
  const instruction = qr
    ? 'Show this email at the gate. The ushers can scan your QR code or enter your registration code.'
    : 'Show this email and registration code to the ushers at the gate so they can check you in.';

  return sendEmail({
    from: FROM,
    to: email,
    subject: `Your registration for the ${EVENT_NAME}`,
    text: `Hi ${name},\n\nThank you for registering for the ${EVENT_NAME}.\n\n${instruction}\n\nRegistration code: ${code}`,
    html: receiptHtml(name, code, instruction, qr ? contentId : undefined),
    attachments: qr ? [{
      filename: 'church-opening-check-in.png',
      content: qr,
      contentType: 'image/png',
      contentId,
    }] : undefined,
    privateContent: true,
    idempotencyKey: `church-opening-branded-receipt/${id}/${previousSend?.getTime() ?? 'first'}`,
  });
}

export type ReceiptSendOutcome = 'sent' | 'skipped' | 'failed';

export async function sendChurchOpeningReceipt(
  tenantId: string,
  registrationId: string,
  resend = false,
): Promise<ReceiptSendOutcome> {
  // Claim the row before sending without holding a database connection during
  // transport I/O. The lease expires if the process exits mid-send.
  const [registration] = await query<ReceiptRegistration>(
    `UPDATE church_opening_registration
     SET receipt_send_started_at = CURRENT_TIMESTAMP
     WHERE id = $1 AND tenant_id = $2
       AND NULLIF(btrim(email), '') IS NOT NULL
       AND (receipt_send_started_at IS NULL OR receipt_send_started_at < CURRENT_TIMESTAMP - INTERVAL '2 minutes')
       AND (receipt_sent_at IS NULL OR ($3 AND receipt_sent_at < CURRENT_TIMESTAMP - INTERVAL '1 minute'))
     RETURNING id, names, surname, email, registration_code, receipt_sent_at, receipt_send_started_at`,
    [registrationId, tenantId, resend]
  );
  if (!registration) return 'skipped';

  let sent = false;
  try {
    const email = z.email().safeParse(registration.email.trim());
    if (email.success) {
      sent = (await sendReceipt(registration, email.data)).delivered;
    }
  } finally {
    await query(
      `UPDATE church_opening_registration
       SET receipt_sent_at = CASE WHEN $4 THEN CURRENT_TIMESTAMP ELSE receipt_sent_at END,
           receipt_send_started_at = NULL
       WHERE id = $1 AND tenant_id = $2 AND receipt_send_started_at = $3`,
      [registrationId, tenantId, registration.receipt_send_started_at, sent]
    );
  }
  return sent ? 'sent' : 'failed';
}

async function sendFormCopy({ registrationId, code, data }: RegistrationEmailDetails) {
  const submitted = REGISTRATION_FIELDS.flatMap(({ key, label }) =>
    data[key] ? [{ label, value: data[key] }] : []
  );

  return sendEmail({
    from: FROM,
    to: EVENT_INBOX,
    subject: `New ${EVENT_NAME} registration`,
    text: `Registration code: ${code}\n\n${submitted.map(({ label, value }) => `${label}: ${value}`).join('\n')}`,
    html: `<h1>New church opening registration</h1>
      <p><strong>Registration code: ${escapeHtml(code)}</strong></p>
      <dl>${submitted.map(({ label, value }) =>
        `<dt><strong>${escapeHtml(label)}</strong></dt><dd>${escapeHtml(value)}</dd>`
      ).join('')}</dl>`,
    privateContent: true,
    idempotencyKey: `church-opening-form-copy/${registrationId}`,
  });
}

export async function sendChurchOpeningRegistrationEmails(details: RegistrationEmailDetails): Promise<boolean> {
  const [receipt, copy] = await Promise.allSettled([
    sendChurchOpeningReceipt(details.tenantId, details.registrationId),
    sendFormCopy(details),
  ]);
  if (copy.status === 'rejected' || !copy.value.delivered) {
    console.warn('[church-opening] Event inbox copy could not be sent for registration', details.registrationId);
  }
  if (receipt.status === 'rejected' || receipt.value !== 'sent') {
    console.warn('[church-opening] Attendee receipt could not be sent for registration', details.registrationId);
    return false;
  }
  return true;
}
