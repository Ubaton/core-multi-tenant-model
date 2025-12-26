/**
 * ════════════════════════════════════════════════════════════════════════════
 * AUTH API - LOGOUT
 * POST /api/auth/logout
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { clearAuthCookies } from '@/lib/auth';
import { successResponse, handleError } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    await clearAuthCookies();
    return successResponse({ message: 'Logged out successfully' });
  } catch (error) {
    return handleError(error);
  }
}
