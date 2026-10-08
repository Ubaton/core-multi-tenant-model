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
import { COUNTRY_OPTIONS, getProvinceOptions } from './locations';
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

export const REGISTRATION_SECTIONS: readonly RegistrationSection[] = [{
  id: 'church-opening',
  title: 'Registration details',
  fields: [
    { key: 'names', label: 'Name', type: 'text', required: true, autoComplete: 'given-name' },
    { key: 'surname', label: 'Surname', type: 'text', required: true, autoComplete: 'family-name' },
    { key: 'emailAddress', label: 'Email', type: 'email', required: true, autoComplete: 'email' },
    { key: 'cellNumber', label: 'Cell Number', type: 'tel', required: true, autoComplete: 'tel' },
    { key: 'country', label: 'Country', type: 'select', options: COUNTRY_OPTIONS, required: true, autoComplete: 'country-name' },
    { key: 'province', label: 'Province', type: 'select', required: true, autoComplete: 'address-level1' },
  ],
}];

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

    const schema = field.key === 'province'
      ? fieldSchema({ ...field, options: getProvinceOptions(typeof input.country === 'string' ? input.country.trim() : '') })
      : fieldSchemas.get(field.key)!;
    const result = schema.safeParse(text);
    if (result.success && result.data !== undefined) {
      data[field.key] = result.data;
    } else if (!result.success) {
      errors[field.key] = result.error.issues[0]?.message ?? 'Invalid value';
    }
  }

  return Object.keys(errors).length > 0 ? { ok: false, errors } : { ok: true, data };
}
