import QRCode from 'qrcode';
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
  registrationId: string;
  code: string;
  data: RegistrationData;
}

async function sendReceipt({ registrationId, code, data }: RegistrationEmailDetails) {
  const name = `${data.names} ${data.surname}`;
  const contentId = `${registrationId}@unityfellowshipchurch.org.za`;
  const qr = await QRCode.toBuffer(
    getChurchOpeningCheckInUrl(code, OFFICIAL_ADMIN_URL),
    { width: 256, margin: 4, errorCorrectionLevel: 'M' }
  ).catch(() => {
    console.warn('[church-opening] Could not generate the email QR code.');
    return null;
  });
  const instruction = qr
    ? 'Show this email to the ushers at the gate. They can scan the QR code or enter your registration code to check you in.'
    : 'Show this email and registration code to the ushers at the gate so they can check you in.';

  return sendEmail({
    from: FROM,
    to: data.emailAddress,
    subject: `Your registration for the ${EVENT_NAME}`,
    text: `Hi ${name},\n\nThank you for registering for the ${EVENT_NAME}.\n\n${instruction}\n\nRegistration code: ${code}`,
    html: `<h1>Thank you for registering!</h1>
      <p>Hi ${escapeHtml(name)},</p>
      <p>You’re registered for the ${EVENT_NAME}.</p>
      <p>${instruction}</p>
      <p><strong>Registration code: ${escapeHtml(code)}</strong></p>
      ${qr ? `<img src="cid:${contentId}" width="256" height="256" alt="Check-in QR code. Your registration code is listed above." />` : ''}`,
    attachments: qr ? [{
      filename: 'church-opening-check-in.png',
      content: qr,
      contentType: 'image/png',
      contentId,
    }] : undefined,
    privateContent: true,
    idempotencyKey: `church-opening-receipt/${registrationId}`,
  });
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
  const [receipt, copy] = await Promise.allSettled([sendReceipt(details), sendFormCopy(details)]);
  if (copy.status === 'rejected' || !copy.value.delivered) {
    console.warn('[church-opening] Event inbox copy could not be sent for registration', details.registrationId);
  }
  if (receipt.status === 'rejected' || !receipt.value.delivered) {
    console.warn('[church-opening] Attendee receipt could not be sent for registration', details.registrationId);
    return false;
  }
  return true;
}
