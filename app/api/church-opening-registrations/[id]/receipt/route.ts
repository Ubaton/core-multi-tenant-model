import { errorResponse, successResponse, withPermission } from '@/lib/api';
import { isChurchOpeningEmailTenant, sendChurchOpeningReceipt } from '@/lib/church-opening/email';

export const POST = withPermission<{ id: string }>('update', 'member', async (request, context, { id }) => {
  if (!isChurchOpeningEmailTenant(context.tenant.tenant?.slug ?? '')) {
    return errorResponse('FORBIDDEN', 'Registration receipts are unavailable for this church', 403);
  }

  const body = await request.json().catch(() => null);
  if (typeof body?.resend !== 'boolean') {
    return errorResponse('VALIDATION_ERROR', 'Specify whether to resend a previously sent receipt', 400);
  }

  const outcome = await sendChurchOpeningReceipt(context.tenantId, id, body.resend);
  return successResponse({ outcome });
});
