/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM SETTINGS API - TEST SMTP CONNECTION
 * POST /api/settings/test-email - Verify mail delivery (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Dials the saved SMTP host, authenticates, and sends a short test message to
 * the signed-in Super Admin. Uses the stored settings rather than the form's
 * unsaved values, so a passing test proves the configuration the password
 * reset flow will actually use.
 *
 * A failed test is a 200 with ok: false, not an error status - the failure is
 * the answer the admin asked for, not a fault in the request.
 */

import { withSuperAdmin, successResponse } from '@/lib/api';
import { testSmtpConnection } from '@/lib/email';

// Nodemailer opens a real TCP socket, which the Edge runtime cannot do.
export const runtime = 'nodejs';

export const POST = withSuperAdmin(async (_request, { user }) => {
  const result = await testSmtpConnection(user.email);

  return successResponse({
    ...result,
    sentTo: result.ok ? user.email : undefined,
  });
});
