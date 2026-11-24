export function normalizeRegistrationCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^REG-[0-9A-F]{12}$/.test(code) ? code : null;
}
