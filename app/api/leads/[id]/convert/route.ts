/**
 * ════════════════════════════════════════════════════════════════════════════
 * LEADS API - CONVERT TO MEMBER
 * POST /api/leads/[id]/convert - Convert lead to member
 * ════════════════════════════════════════════════════════════════════════════
 */

import { NextRequest } from 'next/server';
import { randomUUID } from 'crypto';
import { query, withTransaction } from '@/lib/db';
import { LeadStatus } from '@/lib/types/db';
import {
  withPermission,
  successResponse,
  errorResponse,
  parseBody,
  logAudit,
} from '@/lib/api';
import { convertLeadSchema, idParamSchema } from '@/lib/validations';

type RouteParams = { id: string };

interface LeadRow {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  alternate_phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  notes: string | null;
  converted_to_member_id: string | null;
}

/**
 * POST /api/leads/[id]/convert
 * Convert a lead to a member
 */
export const POST = withPermission<RouteParams>('update', 'lead', async (request, context, params) => {
  const { id } = idParamSchema.parse(params);
  const { memberData } = await parseBody(request, convertLeadSchema);

  // Get the lead
  const leadRows = await query<LeadRow>(
    `SELECT id, tenant_id, first_name, last_name, email, phone, alternate_phone, address, city, state, notes, converted_to_member_id
     FROM lead WHERE id = $1 AND tenant_id = $2`,
    [id, context.tenantId]
  );
  const lead = leadRows[0];

  if (!lead) {
    return errorResponse('NOT_FOUND', 'Lead not found', 404);
  }

  if (lead.converted_to_member_id) {
    return errorResponse('ALREADY_CONVERTED', 'Lead has already been converted to a member', 400);
  }

  // Create member from lead data (or use provided memberData)
  const member = await withTransaction(async (client) => {
    const memberId = randomUUID();

    const firstName = memberData?.firstName ?? lead.first_name;
    const lastName = memberData?.lastName ?? lead.last_name;
    const email = memberData?.email ?? lead.email ?? null;
    const phone = memberData?.phone ?? lead.phone;
    const alternatePhone = memberData?.alternatePhone ?? lead.alternate_phone ?? null;
    const address = memberData?.address ?? lead.address ?? null;
    const city = memberData?.city ?? lead.city ?? null;
    const state = memberData?.state ?? lead.state ?? null;
    const notes = memberData?.notes ?? lead.notes ?? null;

    const memberRows = await client.query(
      `INSERT INTO member (
         id, tenant_id, first_name, last_name, middle_name, email, phone, alternate_phone,
         gender, date_of_birth, address, city, state, country, occupation, employer,
         membership_id, status, join_date, baptism_date, wedding_date, family_id,
         is_head_of_family, notes, photo
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
         COALESCE($14, 'South Africa'), $15, $16, $17, COALESCE($18, 'ACTIVE'),
         COALESCE($19, CURRENT_DATE), $20, $21, $22, COALESCE($23, FALSE), $24, $25
       )
       RETURNING *`,
      [
        memberId,
        context.tenantId,
        firstName,
        lastName,
        memberData?.middleName ?? null,
        email,
        phone,
        alternatePhone,
        memberData?.gender ?? null,
        memberData?.dateOfBirth ?? null,
        address,
        city,
        state,
        memberData?.country ?? null,
        memberData?.occupation ?? null,
        memberData?.employer ?? null,
        memberData?.membershipId ?? null,
        memberData?.status ?? null,
        memberData?.joinDate ?? null,
        memberData?.baptismDate ?? null,
        memberData?.weddingDate ?? null,
        memberData?.familyId ?? null,
        memberData?.isHeadOfFamily ?? null,
        notes,
        memberData?.photo ?? null,
      ]
    );
    const newMember = memberRows.rows[0];

    // Update lead with conversion info
    await client.query(
      `UPDATE lead SET status = $1, converted_to_member_id = $2, converted_at = NOW() WHERE id = $3`,
      [LeadStatus.CONVERTED, newMember.id, id]
    );

    return newMember;
  });

  const mappedMember = {
    id: member.id,
    tenantId: member.tenant_id,
    firstName: member.first_name,
    lastName: member.last_name,
    middleName: member.middle_name,
    email: member.email,
    phone: member.phone,
    alternatePhone: member.alternate_phone,
    gender: member.gender,
    dateOfBirth: member.date_of_birth,
    address: member.address,
    city: member.city,
    state: member.state,
    country: member.country,
    occupation: member.occupation,
    employer: member.employer,
    membershipId: member.membership_id,
    status: member.status,
    joinDate: member.join_date,
    baptismDate: member.baptism_date,
    weddingDate: member.wedding_date,
    familyId: member.family_id,
    isHeadOfFamily: member.is_head_of_family,
    notes: member.notes,
    photo: member.photo,
    createdAt: member.created_at,
    updatedAt: member.updated_at,
  };

  // Log audit
  await logAudit(
    context.user.id,
    context.tenantId,
    'CONVERT_LEAD_TO_MEMBER',
    'Lead',
    id,
    lead,
    { memberId: mappedMember.id },
    request
  );

  return successResponse({
    lead: { id, status: 'CONVERTED' },
    member: mappedMember,
  });
});
