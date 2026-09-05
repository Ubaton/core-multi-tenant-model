/**
 * ════════════════════════════════════════════════════════════════════════════
 * SYSTEM SETTINGS API - TEST SMTP CONNECTION
 * POST /api/settings/test-email - Verify mail delivery (Super Admin only)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Sends a short test message to the signed-in Super Admin over whichever
 * transport a real password reset would use - Resend when RESEND_API_KEY is
 * set, otherwise the saved SMTP settings. Uses stored configuration rather
 * than the form's unsaved values, so a pass proves the real thing.
 *
 * A failed test is a 200 with ok: false, not an error status - the failure is
 * the answer the admin asked for, not a fault in the request.
 */

import { withSuperAdmin, successResponse } from '@/lib/api';
import { testEmailDelivery } from '@/lib/email';

// Nodemailer opens a real TCP socket, which the Edge runtime cannot do.
export const runtime = 'nodejs';

export const POST = withSuperAdmin(async (_request, { user }) => {
  const result = await testEmailDelivery(user.email);

  return successResponse({
    ...result,
    sentTo: result.ok ? user.email : undefined,
  });
});
