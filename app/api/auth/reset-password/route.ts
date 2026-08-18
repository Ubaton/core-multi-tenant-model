/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - RESET PASSWORD
 * GET  /api/auth/reset-password?token=...  Check a token before showing the form
 * POST /api/auth/reset-password            Redeem the token and set a password
 *
 * Consumed by the single-page recovery UI at /forgot-password?token=...
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { query, withTransaction } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { successResponse, errorResponse, handleError, parseBody } from '@/lib/api';
import { resetPasswordSchema } from '@/lib/validations';

interface TokenRow {
  id: string;
  user_id: string;
  expires_at: Date;
  used_at: Date | null;
  is_active: boolean;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Look up a token together with the owning user's active flag.
 */
async function findToken(token: string): Promise<TokenRow | undefined> {
  const rows = await query<TokenRow>(
    `SELECT t.id,
            t.user_id,
            t.expires_at,
            t.used_at,
            u.is_active
     FROM password_reset_token t
     JOIN "user" u ON u.id = t.user_id
     WHERE t.token_hash = $1`,
    [hashToken(token)]
  );
  return rows[0];
}

/**
 * A token is usable when it exists, is unredeemed, unexpired, and its owner is
 * still active.
 */
function isUsable(row: TokenRow | undefined): row is TokenRow {
  return Boolean(
    row && !row.used_at && row.is_active && new Date(row.expires_at).getTime() > Date.now()
  );
}

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get('token');

    if (!token) {
      return errorResponse('VALIDATION_ERROR', 'Reset token is required', 400);
    }

    const row = await findToken(token);

    if (!isUsable(row)) {
      return errorResponse(
        'INVALID_TOKEN',
        'This password reset link is invalid or has expired',
        400
      );
    }

    return successResponse({ valid: true, expiresAt: row.expires_at });
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, password } = await parseBody(request, resetPasswordSchema);

    const row = await findToken(token);

    if (!isUsable(row)) {
      return errorResponse(
        'INVALID_TOKEN',
        'This password reset link is invalid or has expired',
        400
      );
    }

    const passwordHash = await hashPassword(password);

    await withTransaction(async (client) => {
      // Redeem the token first, guarded on it still being unused so two
      // concurrent submissions cannot both succeed.
      const redeemed = await client.query(
        `UPDATE password_reset_token
         SET used_at = NOW()
         WHERE id = $1 AND used_at IS NULL`,
        [row.id]
      );

      if (redeemed.rowCount === 0) {
        throw new TokenAlreadyUsedError();
      }

      await client.query(
        `UPDATE "user"
         SET password_hash = $1, must_change_password = FALSE, updated_at = NOW()
         WHERE id = $2`,
        [passwordHash, row.user_id]
      );

      // Any other outstanding reset links for this user are now void.
      await client.query(
        `UPDATE password_reset_token
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [row.user_id]
      );
    });

    return successResponse({
      message: 'Your password has been reset. You can now sign in.',
    });
  } catch (error) {
    if (error instanceof TokenAlreadyUsedError) {
      return errorResponse(
        'INVALID_TOKEN',
        'This password reset link is invalid or has expired',
        400
      );
    }
    return handleError(error);
  }
}

class TokenAlreadyUsedError extends Error {
  constructor() {
    super('Reset token already used');
    this.name = 'TokenAlreadyUsedError';
  }
}
