export function normalizeRegistrationCode(value: string): string | null {
  const code = value.trim().toUpperCase();
  return /^REG-[0-9A-F]{12}$/.test(code) ? code : null;
}

export function getChurchOpeningCheckInUrl(code: string, baseUrl: string): string {
  const url = new URL('/registrations', baseUrl);
  url.searchParams.set('checkIn', code);
  url.hash = 'church-opening-check-in';
  return url.href;
}
