/**
 * ════════════════════════════════════════════════════════════════════════════
 * VALIDATION SCHEMAS
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Zod schemas for request validation across all API endpoints.
 */

import { z } from 'zod';
import { 
  UserRole, 
  MemberStatus, 
  LeadSource, 
  LeadStatus, 
  PrayerRequestStatus,
  CommunicationType,
  OfferingType,
  CallOutcome,
  Gender 
} from '../generated/prisma';

// ════════════════════════════════════════════════════════════════════════════
// COMMON SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const searchSchema = paginationSchema.extend({
  search: z.string().optional(),
});

export const idParamSchema = z.object({
  id: z.string().cuid(),
});

export const dateRangeSchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// AUTH SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().optional(),
  invitationToken: z.string().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ════════════════════════════════════════════════════════════════════════════
// TENANT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createTenantSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  description: z.string().max(1000).optional(),
  logo: z.string().url().optional(),
  website: z.string().url().optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).default('South Africa'),
  timezone: z.string().default('Africa/Johannesburg'),
  isHQ: z.boolean().default(false),
  parentId: z.string().cuid().optional(),
});

export const updateTenantSchema = createTenantSchema.partial();

// ════════════════════════════════════════════════════════════════════════════
// USER SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().max(20).optional(),
  role: z.nativeEnum(UserRole).default(UserRole.MEMBER),
  tenantId: z.string().cuid().optional(), // Required for non-SUPER_ADMIN
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).optional(),
  role: z.nativeEnum(UserRole).optional(),
  isActive: z.boolean().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// MEMBER SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createMemberSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  middleName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10, 'Valid phone number is required').max(20),
  alternatePhone: z.string().max(20).optional(),
  gender: z.nativeEnum(Gender).optional(),
  dateOfBirth: z.coerce.date().optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  country: z.string().max(100).default('South Africa'),
  occupation: z.string().max(200).optional(),
  employer: z.string().max(200).optional(),
  membershipId: z.string().max(50).optional(),
  status: z.nativeEnum(MemberStatus).default(MemberStatus.ACTIVE),
  joinDate: z.coerce.date().optional(),
  baptismDate: z.coerce.date().optional(),
  weddingDate: z.coerce.date().optional(),
  familyId: z.string().optional(),
  isHeadOfFamily: z.boolean().default(false),
  notes: z.string().max(2000).optional(),
  photo: z.string().url().optional(),
});

export const updateMemberSchema = createMemberSchema.partial();

export const memberFilterSchema = searchSchema.extend({
  status: z.nativeEnum(MemberStatus).optional(),
  gender: z.nativeEnum(Gender).optional(),
  departmentId: z.string().cuid().optional(),
  joinDateFrom: z.coerce.date().optional(),
  joinDateTo: z.coerce.date().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// LEAD SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createLeadSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  email: z.string().email().optional(),
  phone: z.string().min(10, 'Valid phone number is required').max(20),
  alternatePhone: z.string().max(20).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  source: z.nativeEnum(LeadSource),
  sourceDetails: z.string().max(500).optional(),
  status: z.nativeEnum(LeadStatus).default(LeadStatus.NEW),
  notes: z.string().max(2000).optional(),
  assignedToId: z.string().cuid().optional(),
  priority: z.number().int().min(0).max(10).default(0),
  nextFollowUp: z.coerce.date().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadFilterSchema = searchSchema.extend({
  status: z.nativeEnum(LeadStatus).optional(),
  source: z.nativeEnum(LeadSource).optional(),
  assignedToId: z.string().cuid().optional(),
  unassigned: z.coerce.boolean().optional(),
  createdFrom: z.coerce.date().optional(),
  createdTo: z.coerce.date().optional(),
});

export const assignLeadSchema = z.object({
  assignedToId: z.string().cuid(),
});

export const convertLeadSchema = z.object({
  memberData: createMemberSchema.optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// PRAYER REQUEST SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createPrayerRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(1, 'Description is required').max(5000),
  memberId: z.string().cuid().optional(),
  requestorName: z.string().max(200).optional(),
  requestorEmail: z.string().email().optional(),
  requestorPhone: z.string().max(20).optional(),
  isAnonymous: z.boolean().default(false),
  isUrgent: z.boolean().default(false),
});

export const updatePrayerRequestSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().min(1).max(5000).optional(),
  status: z.nativeEnum(PrayerRequestStatus).optional(),
  prayerResponse: z.string().max(5000).optional(),
  isUrgent: z.boolean().optional(),
});

export const prayerRequestFilterSchema = searchSchema.extend({
  status: z.nativeEnum(PrayerRequestStatus).optional(),
  isUrgent: z.coerce.boolean().optional(),
  memberId: z.string().cuid().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// OFFERING SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createOfferingSchema = z.object({
  memberId: z.string().cuid().optional(),
  giverName: z.string().max(200).optional(),
  giverPhone: z.string().max(20).optional(),
  type: z.nativeEnum(OfferingType),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().length(3).default('NGN'),
  description: z.string().max(500).optional(),
  serviceId: z.string().cuid().optional(),
  paymentMethod: z.string().max(50).optional(),
  reference: z.string().max(100).optional(),
  givenAt: z.coerce.date().optional(),
});

export const updateOfferingSchema = createOfferingSchema.partial();

export const offeringFilterSchema = searchSchema.extend({
  type: z.nativeEnum(OfferingType).optional(),
  memberId: z.string().cuid().optional(),
  serviceId: z.string().cuid().optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// COMMUNICATION SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createCommunicationSchema = z.object({
  type: z.nativeEnum(CommunicationType),
  subject: z.string().max(200).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  memberId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  recipientPhone: z.string().max(20).optional(),
  recipientEmail: z.string().email().optional(),
}).refine(
  (data) => data.memberId || data.leadId || data.recipientPhone || data.recipientEmail,
  { message: 'At least one recipient must be specified' }
);

export const bulkCommunicationSchema = z.object({
  type: z.nativeEnum(CommunicationType),
  subject: z.string().max(200).optional(),
  message: z.string().min(1, 'Message is required').max(5000),
  recipientIds: z.array(z.string().cuid()).min(1, 'At least one recipient required'),
  recipientType: z.enum(['member', 'lead']),
});

// ════════════════════════════════════════════════════════════════════════════
// CALL LOG SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createCallLogSchema = z.object({
  memberId: z.string().cuid().optional(),
  leadId: z.string().cuid().optional(),
  phoneNumber: z.string().min(10, 'Valid phone number is required').max(20),
  outcome: z.nativeEnum(CallOutcome),
  duration: z.number().int().min(0).optional(),
  notes: z.string().max(2000).optional(),
  requiresFollowUp: z.boolean().default(false),
  followUpDate: z.coerce.date().optional(),
  followUpNotes: z.string().max(1000).optional(),
}).refine(
  (data) => data.memberId || data.leadId,
  { message: 'Either memberId or leadId must be specified' }
);

export const updateCallLogSchema = z.object({
  notes: z.string().max(2000).optional(),
  requiresFollowUp: z.boolean().optional(),
  followUpDate: z.coerce.date().optional(),
  followUpNotes: z.string().max(1000).optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// SERVICE SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createServiceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  serviceDate: z.coerce.date(),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)').optional(),
  attendanceCount: z.number().int().min(0).optional(),
});

export const updateServiceSchema = createServiceSchema.partial();

// ════════════════════════════════════════════════════════════════════════════
// DEPARTMENT SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().max(1000).optional(),
  leaderId: z.string().cuid().optional(),
  isActive: z.boolean().default(true),
});

export const updateDepartmentSchema = createDepartmentSchema.partial();

export const addDepartmentMemberSchema = z.object({
  memberId: z.string().cuid(),
  role: z.string().max(100).optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// INVITATION SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.nativeEnum(UserRole).default(UserRole.MEMBER),
  expiresInDays: z.number().int().min(1).max(30).default(7),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
});

// ════════════════════════════════════════════════════════════════════════════
// SYSTEM SETTINGS SCHEMAS
// ════════════════════════════════════════════════════════════════════════════

export const updateSystemSettingsSchema = z.object({
  // General Settings
  platformName: z.string().min(1).max(200).optional(),
  platformDescription: z.string().max(1000).optional().nullable(),
  supportEmail: z.string().email().optional().nullable(),
  supportPhone: z.string().max(20).optional().nullable(),
  defaultTimezone: z.string().optional(),
  // Email/SMTP Settings
  smtpHost: z.string().max(200).optional().nullable(),
  smtpPort: z.coerce.number().int().min(1).max(65535).optional(),
  smtpUser: z.string().max(200).optional().nullable(),
  smtpPass: z.string().max(200).optional().nullable(),
  smtpFromEmail: z.string().email().optional().nullable(),
  smtpFromName: z.string().max(200).optional().nullable(),
  smtpSecure: z.boolean().optional(),
  // Notification Settings
  notifyNewTenant: z.boolean().optional(),
  notifySystemErrors: z.boolean().optional(),
  notifyDailySummary: z.boolean().optional(),
  notifySecurityAlerts: z.boolean().optional(),
  // Security Settings
  sessionTimeoutMins: z.coerce.number().int().min(5).max(1440).optional(),
  maxLoginAttempts: z.coerce.number().int().min(1).max(20).optional(),
  lockoutDurationMins: z.coerce.number().int().min(1).max(1440).optional(),
  passwordMinLength: z.coerce.number().int().min(6).max(128).optional(),
  requireUppercase: z.boolean().optional(),
  requireNumber: z.boolean().optional(),
  requireSpecialChar: z.boolean().optional(),
  require2FA: z.boolean().optional(),
});

// ════════════════════════════════════════════════════════════════════════════
// EXPORT TYPE INFERENCES
// ════════════════════════════════════════════════════════════════════════════

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type CreateMemberInput = z.infer<typeof createMemberSchema>;
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;
export type MemberFilterInput = z.infer<typeof memberFilterSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadFilterInput = z.infer<typeof leadFilterSchema>;
export type CreatePrayerRequestInput = z.infer<typeof createPrayerRequestSchema>;
export type UpdatePrayerRequestInput = z.infer<typeof updatePrayerRequestSchema>;
export type CreateOfferingInput = z.infer<typeof createOfferingSchema>;
export type UpdateOfferingInput = z.infer<typeof updateOfferingSchema>;
export type CreateCommunicationInput = z.infer<typeof createCommunicationSchema>;
export type CreateCallLogInput = z.infer<typeof createCallLogSchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type UpdateSystemSettingsInput = z.infer<typeof updateSystemSettingsSchema>;
