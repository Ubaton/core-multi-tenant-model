import type { UserRole } from '@/lib/generated/prisma';

export type ModulePermissions = {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
};

export type PermissionsMatrix = Record<string, Record<string, ModulePermissions>>;

// Default module permissions matrix (fallback)
export const DEFAULT_MODULE_PERMISSIONS: Record<UserRole, Record<string, ModulePermissions>> = {
  SUPER_ADMIN: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    members: { view: true, create: true, edit: true, delete: true },
    leads: { view: true, create: true, edit: true, delete: true },
    offerings: { view: true, create: true, edit: true, delete: true },
    prayer_requests: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    calls: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: true },
    users: { view: true, create: true, edit: true, delete: true },
    tenants: { view: true, create: true, edit: true, delete: true },
  },
  CHURCH_ADMIN: {
    dashboard: { view: true, create: true, edit: true, delete: true },
    members: { view: true, create: true, edit: true, delete: true },
    leads: { view: true, create: true, edit: true, delete: true },
    offerings: { view: true, create: true, edit: true, delete: true },
    prayer_requests: { view: true, create: true, edit: true, delete: true },
    communications: { view: true, create: true, edit: true, delete: true },
    calls: { view: true, create: true, edit: true, delete: true },
    reports: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, create: true, edit: true, delete: false },
    users: { view: true, create: true, edit: true, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  STAFF: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: true, create: true, edit: true, delete: false },
    leads: { view: true, create: true, edit: true, delete: false },
    offerings: { view: true, create: true, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: true, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    calls: { view: true, create: true, edit: true, delete: false },
    reports: { view: true, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  CALL_CENTER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: true, create: false, edit: false, delete: false },
    leads: { view: true, create: true, edit: true, delete: false },
    offerings: { view: false, create: false, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: true, delete: false },
    communications: { view: true, create: true, edit: false, delete: false },
    calls: { view: true, create: true, edit: true, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  SUBSCRIBER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: true, create: false, edit: false, delete: false },
    leads: { view: false, create: false, edit: false, delete: false },
    offerings: { view: true, create: false, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: false, delete: false },
    communications: { view: true, create: false, edit: false, delete: false },
    calls: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
  MEMBER: {
    dashboard: { view: true, create: false, edit: false, delete: false },
    members: { view: false, create: false, edit: false, delete: false },
    leads: { view: false, create: false, edit: false, delete: false },
    offerings: { view: true, create: true, edit: false, delete: false },
    prayer_requests: { view: true, create: true, edit: false, delete: false },
    communications: { view: true, create: false, edit: false, delete: false },
    calls: { view: false, create: false, edit: false, delete: false },
    reports: { view: false, create: false, edit: false, delete: false },
    settings: { view: false, create: false, edit: false, delete: false },
    users: { view: false, create: false, edit: false, delete: false },
    tenants: { view: false, create: false, edit: false, delete: false },
  },
};
