/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBER REGISTRATION FORM - FIELD DEFINITIONS & VALIDATION
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Single source of truth for the public registration form. The client renders
 * the form from REGISTRATION_SECTIONS and the server validates submissions
 * with the schema derived from the very same list, so the two cannot drift.
 *
 * This module is imported by client code: keep it free of server-only imports.
 *
 * Only the keys declared here are ever persisted; the schema strips anything
 * else, so a caller cannot stuff arbitrary data into the JSONB column.
 */

import { z } from 'zod';
import { normalizePhone } from '@/lib/members-import';

export type FieldType = 'text' | 'tel' | 'email' | 'date' | 'number' | 'select' | 'textarea';

export interface FieldOption {
  value: string;
  label: string;
}

export interface RegistrationField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: readonly FieldOption[];
  placeholder?: string;
  autoComplete?: string;
}

export interface RegistrationSection {
  id: string;
  title: string;
  description?: string;
  fields: readonly RegistrationField[];
}

const YES_NO: readonly FieldOption[] = [
  { value: 'Yes', label: 'Yes' },
  { value: 'No', label: 'No' },
];

const GENDER: readonly FieldOption[] = [
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
];

const MARITAL_STATUS: readonly FieldOption[] = [
  { value: 'Single', label: 'Single' },
  { value: 'Married', label: 'Married' },
  { value: 'Divorced', label: 'Divorced' },
  { value: 'Widowed', label: 'Widowed' },
];

export const REGISTRATION_SECTIONS: readonly RegistrationSection[] = [
  {
    id: 'personal',
    title: 'Personal details',
    fields: [
      { key: 'surname', label: 'Surname', type: 'text', required: true, autoComplete: 'family-name' },
      { key: 'maidenName', label: 'Maiden name', type: 'text' },
      { key: 'names', label: 'Names', type: 'text', required: true, autoComplete: 'given-name' },
      { key: 'idNumber', label: 'ID number', type: 'text' },
      { key: 'age', label: 'Age', type: 'number' },
      { key: 'gender', label: 'Gender', type: 'select', options: GENDER },
      { key: 'maritalStatus', label: 'Marital status', type: 'select', options: MARITAL_STATUS },
    ],
  },
  {
    id: 'contact',
    title: 'Contact details',
    fields: [
      { key: 'cellNumber', label: 'Cell number', type: 'tel', required: true, autoComplete: 'tel', placeholder: '082 123 4567' },
      { key: 'emailAddress', label: 'Email address', type: 'email', autoComplete: 'email' },
      { key: 'homeTel', label: 'Home tel', type: 'tel' },
      { key: 'workTel', label: 'Work tel', type: 'tel' },
      { key: 'fax', label: 'Fax', type: 'tel' },
    ],
  },
  {
    id: 'address',
    title: 'Address',
    fields: [
      { key: 'residentialArea', label: 'Residential area', type: 'text', autoComplete: 'address-level2' },
      { key: 'postalAddress', label: 'Postal address', type: 'textarea', autoComplete: 'street-address' },
    ],
  },
  {
    id: 'faith',
    title: 'Faith journey',
    fields: [
      { key: 'dateOfConversion', label: 'Date of conversion', type: 'date' },
      { key: 'placeOfConversion', label: 'Place of conversion', type: 'text' },
      { key: 'baptismDate', label: 'Baptism date', type: 'date' },
      { key: 'placeOfBaptism', label: 'Place of baptism', type: 'text' },
      { key: 'supportsMinistry', label: 'Supporting ministry with your income', type: 'select', options: YES_NO },
      { key: 'disfellowship', label: 'Disfellowship', type: 'select', options: YES_NO },
    ],
  },
  {
    id: 'spouse',
    title: 'Spouse details',
    description: 'Leave blank if not applicable.',
    fields: [
      { key: 'spouseSurname', label: 'Spouse surname', type: 'text' },
      { key: 'spouseMaidenName', label: 'Spouse maiden name', type: 'text' },
      { key: 'spouseNames', label: 'Spouse names', type: 'text' },
      { key: 'spouseIsMember', label: 'Is your spouse a member?', type: 'select', options: YES_NO },
      { key: 'spouseIdNumber', label: 'Spouse ID number', type: 'text' },
      { key: 'spouseAge', label: 'Spouse age', type: 'number' },
      { key: 'spouseGender', label: 'Spouse gender', type: 'select', options: GENDER },
      { key: 'spouseTelephone', label: 'Spouse telephone number', type: 'tel' },
      { key: 'spouseCellphone', label: 'Spouse cellphone', type: 'tel' },
      { key: 'spouseEmail', label: 'Spouse email', type: 'email' },
    ],
  },
  {
    id: 'children',
    title: 'Children',
    description: 'Leave blank if not applicable.',
    fields: [
      { key: 'child1Name', label: 'Child 1 name', type: 'text' },
      { key: 'child1DateOfBirth', label: 'Child 1 date of birth', type: 'date' },
      { key: 'child1IsMember', label: 'Is child 1 a member?', type: 'select', options: YES_NO },
      { key: 'child2Name', label: 'Child 2 name', type: 'text' },
      { key: 'child2DateOfBirth', label: 'Child 2 date of birth', type: 'date' },
      { key: 'child3Name', label: 'Child 3 name', type: 'text' },
      { key: 'child3DateOfBirth', label: 'Child 3 date of birth', type: 'date' },
    ],
  },
  {
    id: 'work',
    title: 'Work and study',
    fields: [
      { key: 'occupation', label: 'Occupation', type: 'text' },
      { key: 'isEmployed', label: 'Are you employed?', type: 'select', options: YES_NO },
      { key: 'employerName', label: 'If yes, name of employer', type: 'text' },
      { key: 'profession', label: 'Profession', type: 'text' },
      { key: 'isStudent', label: 'Are you still a student?', type: 'select', options: YES_NO },
      { key: 'institutionName', label: 'If student, name of institution', type: 'text' },
    ],
  },
  {
    id: 'church',
    title: 'Church background',
    fields: [
      { key: 'previousChurch', label: 'Previous church', type: 'text' },
      { key: 'previousPastor', label: 'Previous pastor', type: 'text' },
      { key: 'dateOfLocalMembership', label: 'Date of local membership', type: 'date' },
      { key: 'submittedToChurchOn', label: 'Submitted to church on', type: 'date' },
      { key: 'churchRemarks', label: 'Church remarks', type: 'textarea' },
      { key: 'additionalInformation', label: 'Additional information', type: 'textarea' },
    ],
  },
];

export const REGISTRATION_FIELDS: readonly RegistrationField[] = REGISTRATION_SECTIONS.flatMap((s) => s.fields);

// ════════════════════════════════════════════════════════════════════════════
// VALIDATION
// ════════════════════════════════════════════════════════════════════════════

const MAX_TEXT_LENGTH = 200;
const MAX_TEXTAREA_LENGTH = 1000;
const MIN_PHONE_DIGITS = 10;
const MAX_PHONE_LENGTH = 20;
const MAX_AGE = 120;

/** Honeypot input name. Real people never see or fill it; bots usually do. */
export const HONEYPOT_FIELD = 'website';

function isRealDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

function fieldSchema(field: RegistrationField): z.ZodType<string | undefined> {
  switch (field.type) {
    case 'email':
      return z.string().trim().max(255).email('Enter a valid email address');
    case 'tel':
      return z
        .string()
        .transform((v) => normalizePhone(v))
        .pipe(
          z
            .string()
            .min(MIN_PHONE_DIGITS, `Must have at least ${MIN_PHONE_DIGITS} digits`)
            .max(MAX_PHONE_LENGTH, 'Number is too long')
        );
    case 'date':
      return z.string().trim().refine(isRealDate, 'Enter a valid date');
    case 'number':
      return z
        .string()
        .trim()
        .refine((v) => /^\d{1,3}$/.test(v) && Number(v) <= MAX_AGE, `Enter a number between 0 and ${MAX_AGE}`);
    case 'select': {
      const allowed = new Set((field.options ?? []).map((o) => o.value));
      return z.string().trim().refine((v) => allowed.has(v), 'Choose one of the options');
    }
    case 'textarea':
      return z.string().trim().max(MAX_TEXTAREA_LENGTH, `Keep this under ${MAX_TEXTAREA_LENGTH} characters`);
    default:
      return z.string().trim().max(MAX_TEXT_LENGTH, `Keep this under ${MAX_TEXT_LENGTH} characters`);
  }
}

const fieldSchemas = new Map(REGISTRATION_FIELDS.map((f) => [f.key, fieldSchema(f)]));

export type RegistrationData = Record<string, string>;

export type RegistrationValidation =
  | { ok: true; data: RegistrationData }
  | { ok: false; errors: Record<string, string> };

/**
 * Validate a raw form payload. Blank optional fields are dropped, unknown keys
 * are ignored, and every message is safe to show to the person filling it in.
 */
export function validateRegistration(raw: unknown): RegistrationValidation {
  const input = raw !== null && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const data: RegistrationData = {};
  const errors: Record<string, string> = {};

  for (const field of REGISTRATION_FIELDS) {
    const value = input[field.key];
    const text = typeof value === 'string' ? value.trim() : '';

    if (text === '') {
      if (field.required) errors[field.key] = `${field.label} is required`;
      continue;
    }

    const result = fieldSchemas.get(field.key)!.safeParse(text);
    if (result.success && result.data !== undefined) {
      data[field.key] = result.data;
    } else if (!result.success) {
      errors[field.key] = result.error.issues[0]?.message ?? 'Invalid value';
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}
