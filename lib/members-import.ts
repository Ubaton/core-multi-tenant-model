/**
 * ════════════════════════════════════════════════════════════════════════════
 * MEMBER IMPORT - SHARED PARSING & VALIDATION
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Used by both the import page (preview) and the import API (authoritative
 * validation). Import columns map onto the existing member fields:
 *
 *   Name         → firstName
 *   Surname      → lastName
 *   Email        → email
 *   Cell Number  → phone
 *   Country      → country   (defaults to South Africa)
 *   Province     → state
 */

import { z } from 'zod';

export const MAX_IMPORT_ROWS = 1000;
export const DEFAULT_COUNTRY = 'South Africa';

export const IMPORT_COLUMNS = [
  { key: 'firstName', label: 'Name', required: true, aliases: ['name', 'first name', 'firstname', 'first_name'] },
  { key: 'lastName', label: 'Surname', required: true, aliases: ['surname', 'last name', 'lastname', 'last_name'] },
  { key: 'email', label: 'Email', required: false, aliases: ['email', 'email address', 'e-mail'] },
  { key: 'phone', label: 'Cell Number', required: true, aliases: ['cell number', 'cell', 'cellphone', 'cell phone', 'cell no', 'mobile', 'mobile number', 'phone', 'phone number'] },
  { key: 'country', label: 'Country', required: false, aliases: ['country'] },
  { key: 'state', label: 'Province', required: false, aliases: ['province', 'state'] },
] as const;

export type ImportField = (typeof IMPORT_COLUMNS)[number]['key'];

export interface ImportRow {
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  country: string;
  state?: string;
}

export const importRowSchema = z.object({
  firstName: z.string().trim().min(1, 'Name is required').max(100),
  lastName: z.string().trim().min(1, 'Surname is required').max(100),
  email: z.string().trim().email('Invalid email address').max(255).optional(),
  phone: z.string().min(10, 'Cell number must have at least 10 digits').max(20),
  country: z.string().trim().max(100).default(DEFAULT_COUNTRY),
  state: z.string().trim().max(100).optional(),
});

export const importRequestSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).min(1, 'No rows to import').max(MAX_IMPORT_ROWS, `A maximum of ${MAX_IMPORT_ROWS} rows can be imported at once`),
});

// ════════════════════════════════════════════════════════════════════════════
// PHONE HELPERS
// ════════════════════════════════════════════════════════════════════════════

/**
 * Strip formatting (spaces, dashes, brackets, dots) while keeping a leading "+".
 * Spreadsheets drop the leading zero from South African numbers
 * (0821234567 → 821234567), so a 9-digit number is restored with its zero.
 */
export function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const hasPlus = trimmed.startsWith('+');
  const digits = trimmed.replace(/\D/g, '');
  if (!hasPlus && digits.length === 9 && /^[1-8]/.test(digits)) {
    return `0${digits}`;
  }
  return hasPlus ? `+${digits}` : digits;
}

/**
 * Canonical key used for duplicate detection so that 082 123 4567 and
 * +27 82 123 4567 are recognised as the same cell number.
 */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('27') && digits.length === 11) return `0${digits.slice(2)}`;
  if (digits.startsWith('0027') && digits.length === 13) return `0${digits.slice(4)}`;
  return digits;
}

// ════════════════════════════════════════════════════════════════════════════
// CSV PARSING (RFC 4180: quoted fields, escaped quotes, CRLF/LF, BOM)
// ════════════════════════════════════════════════════════════════════════════

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i++) {
    const char = source[i];

    if (inQuotes) {
      if (char === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',' || char === ';') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim() !== ''));
}

// ════════════════════════════════════════════════════════════════════════════
// HEADER MAPPING & ROW VALIDATION
// ════════════════════════════════════════════════════════════════════════════

export interface HeaderMapping {
  /** Column index in the file for each import field (undefined = not present). */
  indexes: Partial<Record<ImportField, number>>;
  /** Required columns missing from the file. */
  missing: string[];
}

export function mapHeaders(headers: string[]): HeaderMapping {
  const normalized = headers.map((h) => h.trim().toLowerCase());
  const indexes: Partial<Record<ImportField, number>> = {};

  for (const column of IMPORT_COLUMNS) {
    const index = normalized.findIndex((h) => (column.aliases as readonly string[]).includes(h));
    if (index !== -1) indexes[column.key] = index;
  }

  const missing = IMPORT_COLUMNS.filter((c) => c.required && indexes[c.key] === undefined).map((c) => c.label);
  return { indexes, missing };
}

export interface RawImportRow {
  firstName?: unknown;
  lastName?: unknown;
  email?: unknown;
  phone?: unknown;
  country?: unknown;
  state?: unknown;
}

function clean(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

export type RowValidation =
  | { ok: true; row: ImportRow }
  | { ok: false; errors: string[] };

/** Validate a single raw row against the member rules. Pure; never throws. */
export function validateImportRow(raw: RawImportRow): RowValidation {
  const phone = clean(raw.phone);
  const result = importRowSchema.safeParse({
    firstName: clean(raw.firstName) ?? '',
    lastName: clean(raw.lastName) ?? '',
    email: clean(raw.email),
    phone: phone ? normalizePhone(phone) : '',
    country: clean(raw.country) ?? DEFAULT_COUNTRY,
    state: clean(raw.state),
  });

  if (!result.success) {
    return { ok: false, errors: result.error.issues.map((issue) => issue.message) };
  }
  return { ok: true, row: result.data };
}

/** Turn parsed CSV rows (header row first) into raw import rows. */
export function toRawRows(table: string[][], mapping: HeaderMapping): RawImportRow[] {
  return table.slice(1).map((cells) => {
    const pick = (field: ImportField) => {
      const index = mapping.indexes[field];
      return index === undefined ? undefined : cells[index];
    };
    return {
      firstName: pick('firstName'),
      lastName: pick('lastName'),
      email: pick('email'),
      phone: pick('phone'),
      country: pick('country'),
      state: pick('state'),
    };
  });
}

export const IMPORT_TEMPLATE_CSV = [
  IMPORT_COLUMNS.map((c) => c.label).join(','),
  'Thabo,Mokoena,thabo@example.com,0821234567,South Africa,Gauteng',
  'Naledi,Dlamini,,0731234567,South Africa,KwaZulu-Natal',
].join('\r\n');
