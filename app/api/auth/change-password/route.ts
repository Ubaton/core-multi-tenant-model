/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - CHANGE PASSWORD
 * POST /api/auth/change-password
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
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
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!fullUser) {
      return errorResponse('NOT_FOUND', 'User not found', 404);
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, fullUser.passwordHash);
    if (!isValidPassword) {
      return errorResponse('INVALID_CREDENTIALS', 'Current password is incorrect', 400);
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password and clear mustChangePassword flag
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        passwordHash: newPasswordHash,
        mustChangePassword: false, // Clear the flag after password change
      },
    });

    return successResponse({ message: 'Password updated successfully' });
  } catch (error) {
    return handleError(error);
  }
}
