/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - CHANGE PASSWORD
 * POST /api/auth/change-password
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { successResponse, errorResponse, handleError } from '@/lib/api';
import { changePasswordSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return errorResponse('UNAUTHENTICATED', 'Not authenticated', 401);
    }

    const body = await request.json();
    const { currentPassword, newPassword } = changePasswordSchema.parse(body);

    // Get user with password hash
    const rows = await query<{ id: string; password_hash: string }>(
      `SELECT id, password_hash FROM "user" WHERE id = $1`,
      [user.id]
    );
    const fullUser = rows[0];

    if (!fullUser) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, fullUser.password_hash);
    if (!isValidPassword) {
      return errorResponse('INVALID_CREDENTIALS', 'Current password is incorrect', 400);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear mustChangePassword flag
    await query(
      `UPDATE "user" SET password_hash = $1, must_change_password = FALSE WHERE id = $2`,
      [newPasswordHash, user.id]
    );

    return successResponse({ message: 'Password updated successfully' });
  } catch (error) {
    return handleError(error);
  }
}
