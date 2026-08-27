/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - FORGOT PASSWORD
 * POST /api/auth/forgot-password
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Issues a single-use password reset token and emails the reset link.
 *
 * The response is intentionally identical whether or not the email belongs to
 * an account, so this endpoint cannot be used to enumerate users.
 */

import { NextRequest } from 'next/server';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { query } from '@/lib/db';
import { successResponse, handleError, parseBody } from '@/lib/api';
import { forgotPasswordSchema } from '@/lib/validations';
import { isEmailConfigured, resolveAppUrl, sendPasswordResetEmail } from '@/lib/email';

/** How long a reset link stays valid. */
const TOKEN_EXPIRY_MINUTES = 60;

/** Same message regardless of whether the account exists. */
const GENERIC_MESSAGE =
  'If an account exists for that email address, a password reset link has been sent.';

interface UserRow {
  id: string;
  email: string;
  first_name: string;
  is_active: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await parseBody(request, forgotPasswordSchema);
    const normalizedEmail = email.toLowerCase();

    const rows = await query<UserRow>(
      `SELECT id, email, first_name, is_active
       FROM "user"
       WHERE email = $1 AND deleted_at IS NULL`,
      [normalizedEmail]
    );
    const user = rows[0];

    // Disabled accounts get the same silent treatment as unknown addresses.
    if (!user || !user.is_active) {
      return successResponse({ message: GENERIC_MESSAGE, emailConfigured: isEmailConfigured() });
    }

    // Invalidate any outstanding tokens so only the newest link works.
    await query(
      `UPDATE password_reset_token
       SET used_at = NOW()
       WHERE user_id = $1 AND used_at IS NULL`,
      [user.id]
    );

    const token = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY_MINUTES * 60 * 1000);

    await query(
      `INSERT INTO password_reset_token (id, user_id, token_hash, expires_at)
       VALUES ($1, $2, $3, $4)`,
      [randomUUID(), user.id, tokenHash, expiresAt]
    );

    // The recovery UI is a single page; the token selects the reset stage.
    const resetUrl = `${resolveAppUrl(request.url)}/forgot-password?token=${token}`;

    const { delivered } = await sendPasswordResetEmail({
      to: user.email,
      firstName: user.first_name,
      resetUrl,
      expiryMinutes: TOKEN_EXPIRY_MINUTES,
    });

    // Without a mail provider the link would be unreachable, so surface it in
    // development only. Never in production, and never once mail is configured.
    const exposeLink =
      !delivered && !isEmailConfigured() && process.env.NODE_ENV !== 'production';

    return successResponse({
      message: GENERIC_MESSAGE,
      emailConfigured: isEmailConfigured(),
      ...(exposeLink ? { resetUrl } : {}),
    });
  } catch (error) {
    return handleError(error);
  }
}
