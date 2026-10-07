import { UserRole } from '@/lib/types/db';

/** Creating or rotating a registration QR code is restricted to administrators. */
export function canManageRegistrationLink(role: string | null | undefined): boolean {
  return role === UserRole.SUPER_ADMIN || role === UserRole.CHURCH_ADMIN;
}
