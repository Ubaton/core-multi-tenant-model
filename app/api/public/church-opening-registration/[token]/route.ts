/**
 * ════════════════════════════════════════════════════════════════════════════
 * PUBLIC REGISTRATION API (no login)
 * GET  /api/public/church-opening-registration/[token] - Form header
 * POST /api/public/church-opening-registration/[token] - Save a registration
 * and send the receipt and event-team copy for the official event tenant.
 *
 * Unknown, rotated and expired tokens are indistinguishable (404).
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth';
import { query } from '@/lib/db';
import { errorResponse, successResponse, createdResponse, handleError } from '@/lib/api';
import { hasPermission } from '@/lib/permissions';
import { isChurchOpeningEmailTenant, sendChurchOpeningRegistrationEmails } from '@/lib/church-opening/email';
import { HONEYPOT_FIELD, validateRegistration } from '@/lib/church-opening/fields';
import {
  MAX_BODY_BYTES,
  findActiveLink,
  hashClientIp,
  isRateLimited,
} from '@/lib/church-opening/server';

type RouteParams = { params: Promise<{ token: string }> };

const NO_STORE = { 'Cache-Control': 'no-store' };

function notFound(): NextResponse {
  return errorResponse('LINK_INVALID', 'This registration link is no longer valid', 404);
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const link = await findActiveLink(token);
    if (!link) return notFound();

    const response = successResponse({ churchName: link.tenantName, logo: link.tenantLogo });
    response.headers.set('Cache-Control', NO_STORE['Cache-Control']);
    return response;
  } catch (error) {
    return handleError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params;
    const link = await findActiveLink(token);
    if (!link) return notFound();

    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return errorResponse('PAYLOAD_TOO_LARGE', 'Submission is too large', 413);
    }

    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      return errorResponse('INVALID_JSON', 'Invalid request', 400);
    }

    // Honeypot: pretend success so bots get no signal to adapt to.
    const honeypot = (body as Record<string, unknown> | null)?.[HONEYPOT_FIELD];
    if (typeof honeypot === 'string' && honeypot.trim() !== '') {
      return createdResponse({ received: true });
    }

    const result = validateRegistration(body);
    if (!result.ok) {
      const details = Object.fromEntries(Object.entries(result.errors).map(([k, v]) => [k, [v]]));
      return errorResponse('VALIDATION_ERROR', 'Please correct the highlighted fields', 400, details);
    }

    const ipHash = hashClientIp(request);
    if (await isRateLimited(link.tenantId, ipHash)) {
      const user = await getCurrentUser();
      if (user?.tenantId !== link.tenantId || !hasPermission(user, 'create', 'member')) {
        return errorResponse('RATE_LIMITED', 'Too many submissions. Please try again later or ask the check-in team for help.', 429);
      }
    }

    const { data } = result;
    const registrationId = randomUUID();
    const values = [
      registrationId,
      link.tenantId,
      data.surname,
      data.names,
      data.cellNumber,
      data.emailAddress ?? null,
      data.idNumber ?? null,
      JSON.stringify(data),
      ipHash,
    ];

    for (let attempt = 0; attempt < 3; attempt++) {
      const [registration] = await query<{ registration_code: string }>(
        `INSERT INTO church_opening_registration
           (id, tenant_id, surname, names, cell_number, email, id_number, data, ip_hash)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (tenant_id, registration_code) DO NOTHING
         RETURNING registration_code`,
        values
      );

      if (registration) {
        const code = registration.registration_code;
        const receiptSent = isChurchOpeningEmailTenant(link.tenantSlug)
          ? await sendChurchOpeningRegistrationEmails({ registrationId, code, data })
          : undefined;
        return createdResponse({ received: true, registrationCode: code, receiptSent });
      }
    }

    throw new Error('Could not allocate a church opening registration code');
  } catch (error) {
    return handleError(error);
  }
}
