/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEADS API - CONVERT TO MEMBER
 * POST /api/leads/[id]/convert - Convert lead to member
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { LeadStatus } from '@/lib/generated/prisma';
import { 
  withPermission, 
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { convertLeadSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

/**
 * POST /api/leads/[id]/convert
 * Convert a lead to a member
 */
export const POST = withPermission<RouteParams>('update', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const { memberData } = await parseBody(request, convertLeadSchema);

  // Get the lead
  const lead = await prisma.lead.findFirst({
    where: { 
      id,
      tenantId: context.tenantId,
    },
  });

  if (!lead) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  if (lead.convertedToMemberId) {
    return errorResponse('ALREADY_CONVERTED', 'Lead has already been converted to a member', 400);
  }

  // Create member from lead data (or use provided memberData)
  const member = await prisma.$transaction(async (tx) => {
    // Create the member
    const newMember = await tx.member.create({
      data: {
        tenantId: context.tenantId,
        firstName: memberData?.firstName ?? lead.firstName,
        lastName: memberData?.lastName ?? lead.lastName,
        email: memberData?.email ?? lead.email ?? undefined,
        phone: memberData?.phone ?? lead.phone,
        alternatePhone: memberData?.alternatePhone ?? lead.alternatePhone ?? undefined,
        address: memberData?.address ?? lead.address ?? undefined,
        city: memberData?.city ?? lead.city ?? undefined,
        state: memberData?.state ?? lead.state ?? undefined,
        notes: memberData?.notes ?? lead.notes ?? undefined,
        ...memberData,
      },
    });

    // Update lead with conversion info
    await tx.lead.update({
      where: { id },
      data: {
        status: LeadStatus.CONVERTED,
        convertedToMemberId: newMember.id,
        convertedAt: new Date(),
      },
    });

    return newMember;
  });

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'CONVERT_LEAD_TO_MEMBER',
    'Lead',
    id,
    lead,
    { memberId: member.id },
    request
  );

  return successResponse({
    lead: { id, status: 'CONVERTED' },
    member,
  });
});
