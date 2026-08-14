/**
 * ════════════════════════════════════════════════════════════════════════════
 * HAND-WRITTEN DATABASE TYPES (replaces generated Prisma client types)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * These interfaces mirror the columns in prisma/migrations/000_init_schema.sql.
 * JSON/JS-facing shapes use camelCase (matching what Prisma used to return).
 */

// ════════════════════════════════════════════════════════════════════════════
// ENUMS
// ════════════════════════════════════════════════════════════════════════════

export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  CHURCH_ADMIN: 'CHURCH_ADMIN',
  STAFF: 'STAFF',
  CALL_CENTER: 'CALL_CENTER',
  SUBSCRIBER: 'SUBSCRIBER',
  MEMBER: 'MEMBER',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const MemberStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  DECEASED: 'DECEASED',
  TRANSFERRED: 'TRANSFERRED',
} as const;
export type MemberStatus = (typeof MemberStatus)[keyof typeof MemberStatus];

export const LeadSource = {
  FACEBOOK: 'FACEBOOK',
  TV_SERVICE: 'TV_SERVICE',
  WEBSITE: 'WEBSITE',
  REFERRAL: 'REFERRAL',
  WALK_IN: 'WALK_IN',
  PHONE_CALL: 'PHONE_CALL',
  OTHER: 'OTHER',
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LeadStatus = {
  NEW: 'NEW',
  CONTACTED: 'CONTACTED',
  FOLLOW_UP: 'FOLLOW_UP',
  CONVERTED: 'CONVERTED',
  CLOSED: 'CLOSED',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const PrayerRequestStatus = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  ANSWERED: 'ANSWERED',
  CLOSED: 'CLOSED',
} as const;
export type PrayerRequestStatus = (typeof PrayerRequestStatus)[keyof typeof PrayerRequestStatus];

export const CommunicationType = {
  SMS: 'SMS',
  EMAIL: 'EMAIL',
  WHATSAPP: 'WHATSAPP',
} as const;
export type CommunicationType = (typeof CommunicationType)[keyof typeof CommunicationType];

export const CommunicationStatus = {
  PENDING: 'PENDING',
  SENT: 'SENT',
  DELIVERED: 'DELIVERED',
  FAILED: 'FAILED',
} as const;
export type CommunicationStatus = (typeof CommunicationStatus)[keyof typeof CommunicationStatus];

export const OfferingType = {
  TITHE: 'TITHE',
  OFFERING: 'OFFERING',
  FIRST_FRUIT: 'FIRST_FRUIT',
  SPECIAL_SEED: 'SPECIAL_SEED',
  BUILDING_PROJECT: 'BUILDING_PROJECT',
  MISSIONS: 'MISSIONS',
  OTHER: 'OTHER',
} as const;
export type OfferingType = (typeof OfferingType)[keyof typeof OfferingType];

export const InvitationStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type InvitationStatus = (typeof InvitationStatus)[keyof typeof InvitationStatus];

export const CallOutcome = {
  ANSWERED: 'ANSWERED',
  NO_ANSWER: 'NO_ANSWER',
  BUSY: 'BUSY',
  VOICEMAIL: 'VOICEMAIL',
  CALLBACK_REQUESTED: 'CALLBACK_REQUESTED',
  WRONG_NUMBER: 'WRONG_NUMBER',
  COMPLETED: 'COMPLETED',
} as const;
export type CallOutcome = (typeof CallOutcome)[keyof typeof CallOutcome];

export const Gender = {
  MALE: 'MALE',
  FEMALE: 'FEMALE',
  OTHER: 'OTHER',
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const MessagePriority = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;
export type MessagePriority = (typeof MessagePriority)[keyof typeof MessagePriority];

export const MessageStatus = {
  UNREAD: 'UNREAD',
  READ: 'READ',
  REPLIED: 'REPLIED',
  ARCHIVED: 'ARCHIVED',
} as const;
export type MessageStatus = (typeof MessageStatus)[keyof typeof MessageStatus];

// ════════════════════════════════════════════════════════════════════════════
// MODELS (camelCase, JSON-facing shape matching prior Prisma output)
// ════════════════════════════════════════════════════════════════════════════

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string;
  timezone: string;
  isActive: boolean;
  isHQ: boolean;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  mustChangePassword: boolean;
  lastLoginAt: Date | null;
  tenantId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RolePermission {
  id: string;
  tenantId: string | null;
  role: UserRole;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPermission {
  id: string;
  userId: string;
  module: string;
  canView: boolean;
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Member {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  middleName: string | null;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  gender: Gender | null;
  dateOfBirth: Date | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string;
  occupation: string | null;
  employer: string | null;
  membershipId: string | null;
  status: MemberStatus;
  joinDate: Date;
  baptismDate: Date | null;
  weddingDate: Date | null;
  familyId: string | null;
  isHeadOfFamily: boolean;
  notes: string | null;
  photo: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Lead {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string;
  alternatePhone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  source: LeadSource;
  sourceDetails: string | null;
  status: LeadStatus;
  notes: string | null;
  assignedToId: string | null;
  assignedAt: Date | null;
  convertedToMemberId: string | null;
  convertedAt: Date | null;
  priority: number;
  lastContactAt: Date | null;
  nextFollowUp: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrayerRequest {
  id: string;
  tenantId: string;
  memberId: string | null;
  requestorName: string | null;
  requestorEmail: string | null;
  requestorPhone: string | null;
  title: string;
  description: string;
  isAnonymous: boolean;
  isUrgent: boolean;
  status: PrayerRequestStatus;
  prayerResponse: string | null;
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Offering {
  id: string;
  tenantId: string;
  memberId: string | null;
  giverName: string | null;
  giverPhone: string | null;
  type: OfferingType;
  amount: string; // NUMERIC comes back as string from pg
  currency: string;
  description: string | null;
  serviceId: string | null;
  paymentMethod: string | null;
  reference: string | null;
  givenAt: Date;
  recordedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Service {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  serviceDate: Date;
  startTime: string | null;
  endTime: string | null;
  attendanceCount: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Communication {
  id: string;
  tenantId: string;
  type: CommunicationType;
  subject: string | null;
  message: string;
  memberId: string | null;
  leadId: string | null;
  recipientPhone: string | null;
  recipientEmail: string | null;
  senderId: string;
  status: CommunicationStatus;
  sentAt: Date | null;
  deliveredAt: Date | null;
  failureReason: string | null;
  externalId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CallLog {
  id: string;
  tenantId: string;
  operatorId: string;
  memberId: string | null;
  leadId: string | null;
  phoneNumber: string;
  outcome: CallOutcome;
  duration: number | null;
  notes: string | null;
  requiresFollowUp: boolean;
  followUpDate: Date | null;
  followUpNotes: string | null;
  calledAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Department {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  leaderId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DepartmentMember {
  id: string;
  departmentId: string;
  memberId: string;
  role: string | null;
  joinedAt: Date;
}

export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  token: string;
  status: InvitationStatus;
  createdById: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuditLog {
  id: string;
  tenantId: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldData: unknown | null;
  newData: unknown | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

export interface InternalMessage {
  id: string;
  senderId: string;
  receiverId: string | null;
  tenantId: string | null;
  subject: string;
  message: string;
  priority: MessagePriority;
  status: MessageStatus;
  parentId: string | null;
  readAt: Date | null;
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettings {
  id: string;
  platformName: string;
  platformDescription: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  defaultTimezone: string;
  smtpHost: string | null;
  smtpPort: number;
  smtpUser: string | null;
  smtpPass: string | null;
  smtpFromEmail: string | null;
  smtpFromName: string | null;
  smtpSecure: boolean;
  notifyNewTenant: boolean;
  notifySystemErrors: boolean;
  notifyDailySummary: boolean;
  notifySecurityAlerts: boolean;
  sessionTimeoutMins: number;
  maxLoginAttempts: number;
  lockoutDurationMins: number;
  passwordMinLength: number;
  requireUppercase: boolean;
  requireNumber: boolean;
  requireSpecialChar: boolean;
  require2FA: boolean;
  createdAt: Date;
  updatedAt: Date;
}
