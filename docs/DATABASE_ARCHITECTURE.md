# Database Architecture Documentation

## Multi-Tenant Church Data Capturing System

> **Database Engine:** PostgreSQL  
> **ORM:** Prisma  
> **Architecture Pattern:** Multi-Tenant with Tenant Isolation

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Normalization Considerations](#normalization-considerations)
4. [Entities and Relationships](#entities-and-relationships)
5. [Enumerations](#enumerations)
6. [SQL Schema](#sql-schema)
7. [Indexes Strategy](#indexes-strategy)
8. [Security Considerations](#security-considerations)

---

## Overview

This database architecture implements a **strict multi-tenant isolation pattern** where:

- All tenant-owned tables include a mandatory `tenant_id` column
- Referential integrity is enforced via foreign keys
- `SUPER_ADMIN` users can access all tenants; other roles are tenant-scoped
- Hierarchical tenant structure supports HQ and branch churches

### Key Design Principles

| Principle                | Implementation                                              |
| ------------------------ | ----------------------------------------------------------- |
| **Multi-Tenancy**        | Row-level isolation using `tenant_id` foreign key           |
| **RBAC**                 | Role-based access with configurable permissions per module  |
| **Audit Trail**          | Comprehensive audit logging with before/after snapshots     |
| **Soft References**      | Anonymous data capture without requiring membership         |
| **Hierarchical Tenants** | Self-referencing `Tenant` table for HQ/branch relationships |

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              MULTI-TENANT CHURCH MANAGEMENT SYSTEM                       │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                    ┌──────────────┐
                                    │   TENANT     │ (Root Entity)
                                    │──────────────│
                                    │ id (PK)      │◄────────────┐ (self-ref: parent/branches)
                                    │ name         │             │
                                    │ slug (UQ)    │─────────────┘
                                    │ parent_id    │
                                    │ is_hq        │
                                    └──────┬───────┘
                                           │
           ┌───────────────┬───────────────┼───────────────┬───────────────┬────────────────┐
           │               │               │               │               │                │
           ▼               ▼               ▼               ▼               ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌────────────┐
    │   USER   │    │  MEMBER  │    │   LEAD   │    │ SERVICE  │    │DEPARTMENT│    │ROLE_PERM   │
    │──────────│    │──────────│    │──────────│    │──────────│    │──────────│    │────────────│
    │ id (PK)  │    │ id (PK)  │    │ id (PK)  │    │ id (PK)  │    │ id (PK)  │    │ id (PK)    │
    │ email(UQ)│    │tenant_id │    │tenant_id │    │tenant_id │    │tenant_id │    │ tenant_id  │
    │tenant_id │    │ phone    │    │ phone    │    │ name     │    │ name     │    │ role       │
    │ role     │    │ status   │    │ source   │    │ date     │    │          │    │ module     │
    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────┬─────┘    └────────────┘
         │               │               │               │               │
         │               │               │               │               │
         │         ┌─────┴─────┐         │               │         ┌─────┴─────┐
         │         │           │         │               │         │           │
         ▼         ▼           ▼         ▼               ▼         ▼           │
    ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐       │
    │AUDIT_LOG │ │ OFFERING │ │PRAYER_REQ│ │ OFFERING │ │DEPT_MEMBER   │       │
    │──────────│ │──────────│ │──────────│ │──────────│ │──────────────│       │
    │ id (PK)  │ │ id (PK)  │ │ id (PK)  │ │service_id│ │department_id │◄──────┘
    │ user_id  │ │member_id │ │member_id │ │ amount   │ │ member_id    │
    │ action   │ │ type     │ │ status   │ │ type     │ │ role         │
    └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────────┘

         │
         │         ┌──────────────────────────────────────────┐
         │         │                                          │
         ▼         ▼                                          ▼
    ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐
    │INVITATION│ │COMMUNICATION │ │ CALL_LOG │ │INT_MSG   │ │USER_PERM     │
    │──────────│ │──────────────│ │──────────│ │──────────│ │──────────────│
    │ id (PK)  │ │ id (PK)      │ │ id (PK)  │ │ id (PK)  │ │ id (PK)      │
    │tenant_id │ │ tenant_id    │ │tenant_id │ │sender_id │ │ user_id      │
    │ email    │ │ member_id    │ │operator  │ │receiver  │ │ module       │
    │ token(UQ)│ │ lead_id      │ │member_id │ │ parent_id│ │ can_view     │
    │ status   │ │ type         │ │ lead_id  │ │ (thread) │ │ can_create   │
    └──────────┘ └──────────────┘ └──────────┘ └──────────┘ └──────────────┘

                                    ┌──────────────────┐
                                    │  SYSTEM_SETTINGS │ (Singleton)
                                    │──────────────────│
                                    │ id (PK)          │
                                    │ platform_name    │
                                    │ smtp_settings    │
                                    │ security_config  │
                                    └──────────────────┘
```

---

## Normalization Considerations

### First Normal Form (1NF) ✅

- All tables have atomic values (no repeating groups)
- Each column contains only single values
- JSON columns (`old_data`, `new_data` in AuditLog) store structured audit data

### Second Normal Form (2NF) ✅

- All non-key attributes are fully dependent on the primary key
- No partial dependencies exist

### Third Normal Form (3NF) ✅

- No transitive dependencies
- Example: `Member.city` and `Member.country` are kept for denormalization purposes (performance)

### Denormalization Decisions

| Table           | Field                                | Reason                                         |
| --------------- | ------------------------------------ | ---------------------------------------------- |
| `Member`        | `city`, `state`, `country`           | Frequently accessed; avoid address table joins |
| `Communication` | `recipient_phone`, `recipient_email` | Snapshot at send time; recipient may change    |
| `CallLog`       | `phone_number`                       | Historical record of number called             |

---

## Entities and Relationships

### Core Entities

#### 1. Tenant (Church)

**Purpose:** Root entity for multi-tenancy; represents a church organization

| Relationship  | Type        | Related Entity | Description                 |
| ------------- | ----------- | -------------- | --------------------------- |
| `parent`      | Many-to-One | Tenant         | Branch → HQ hierarchy       |
| `branches`    | One-to-Many | Tenant         | HQ → Branches               |
| `users`       | One-to-Many | User           | Staff/admins of this church |
| `members`     | One-to-Many | Member         | Church members              |
| `leads`       | One-to-Many | Lead           | Prospects/leads             |
| `services`    | One-to-Many | Service        | Church services             |
| `departments` | One-to-Many | Department     | Church departments          |

#### 2. User (System User)

**Purpose:** Authentication and authorization entity

| Relationship         | Type        | Related Entity | Description                          |
| -------------------- | ----------- | -------------- | ------------------------------------ |
| `tenant`             | Many-to-One | Tenant         | User's church (null for SUPER_ADMIN) |
| `callLogs`           | One-to-Many | CallLog        | Calls made by this user              |
| `assignedLeads`      | One-to-Many | Lead           | Leads assigned to this user          |
| `sentCommunications` | One-to-Many | Communication  | Messages sent                        |
| `userPermissions`    | One-to-Many | UserPermission | Custom permission overrides          |

#### 3. Member (Church Member)

**Purpose:** Church membership records

| Relationship        | Type        | Related Entity   | Description            |
| ------------------- | ----------- | ---------------- | ---------------------- |
| `tenant`            | Many-to-One | Tenant           | Member's church        |
| `offerings`         | One-to-Many | Offering         | Tithes/offerings given |
| `prayerRequests`    | One-to-Many | PrayerRequest    | Prayer submissions     |
| `departments`       | One-to-Many | DepartmentMember | Department memberships |
| `convertedFromLead` | One-to-One  | Lead             | Original lead record   |

#### 4. Lead (Prospect)

**Purpose:** Track prospects from various sources

| Relationship        | Type        | Related Entity | Description           |
| ------------------- | ----------- | -------------- | --------------------- |
| `tenant`            | Many-to-One | Tenant         | Lead's target church  |
| `assignedTo`        | Many-to-One | User           | Assigned staff member |
| `convertedToMember` | One-to-One  | Member         | Conversion tracking   |
| `callLogs`          | One-to-Many | CallLog        | Call history          |
| `communications`    | One-to-Many | Communication  | Messages sent         |

### Supporting Entities

#### 5. Service (Church Service/Event)

- Tracks church services and events
- Links to offerings collected during service

#### 6. Department

- Church ministries/departments
- Many-to-many relationship with Members via `DepartmentMember`

#### 7. Offering

- Financial contributions
- Optional links to Member and Service

#### 8. PrayerRequest

- Prayer submissions (member or anonymous)
- Status tracking (PENDING → ANSWERED)

#### 9. Communication

- Multi-channel messaging (SMS, Email, WhatsApp)
- Can target Member or Lead

#### 10. CallLog

- Call center activity tracking
- Links to operator (User), target (Member/Lead)

#### 11. Invitation

- Token-based user invitations
- Expiration and status tracking

#### 12. AuditLog

- Comprehensive action tracking
- Before/after JSON snapshots

#### 13. InternalMessage

- Inter-user messaging
- Threading support via `parent_id`

#### 14. RolePermission / UserPermission

- Configurable RBAC
- Tenant-specific permission overrides

#### 15. SystemSettings

- Global platform configuration
- Singleton pattern (single row)

---

## Enumerations

```sql
-- User Roles
CREATE TYPE user_role AS ENUM (
    'SUPER_ADMIN',    -- Global access to all tenants
    'CHURCH_ADMIN',   -- Full access within a single tenant
    'STAFF',          -- Limited access within a tenant
    'CALL_CENTER',    -- Call center specific access
    'SUBSCRIBER',     -- Read-only or submission-based access
    'MEMBER'          -- Church member access
);

-- Member Status
CREATE TYPE member_status AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'DECEASED',
    'TRANSFERRED'
);

-- Lead Source
CREATE TYPE lead_source AS ENUM (
    'FACEBOOK',
    'TV_SERVICE',
    'WEBSITE',
    'REFERRAL',
    'WALK_IN',
    'PHONE_CALL',
    'OTHER'
);

-- Lead Status
CREATE TYPE lead_status AS ENUM (
    'NEW',
    'CONTACTED',
    'FOLLOW_UP',
    'CONVERTED',
    'CLOSED'
);

-- Prayer Request Status
CREATE TYPE prayer_request_status AS ENUM (
    'PENDING',
    'IN_PROGRESS',
    'ANSWERED',
    'CLOSED'
);

-- Communication Type
CREATE TYPE communication_type AS ENUM (
    'SMS',
    'EMAIL',
    'WHATSAPP'
);

-- Communication Status
CREATE TYPE communication_status AS ENUM (
    'PENDING',
    'SENT',
    'DELIVERED',
    'FAILED'
);

-- Offering Type
CREATE TYPE offering_type AS ENUM (
    'TITHE',
    'OFFERING',
    'FIRST_FRUIT',
    'SPECIAL_SEED',
    'BUILDING_PROJECT',
    'MISSIONS',
    'OTHER'
);

-- Invitation Status
CREATE TYPE invitation_status AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'REVOKED'
);

-- Call Outcome
CREATE TYPE call_outcome AS ENUM (
    'ANSWERED',
    'NO_ANSWER',
    'BUSY',
    'VOICEMAIL',
    'CALLBACK_REQUESTED',
    'WRONG_NUMBER',
    'COMPLETED'
);

-- Gender
CREATE TYPE gender AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER'
);

-- Message Priority
CREATE TYPE message_priority AS ENUM (
    'LOW',
    'NORMAL',
    'HIGH',
    'URGENT'
);

-- Message Status
CREATE TYPE message_status AS ENUM (
    'UNREAD',
    'READ',
    'REPLIED',
    'ARCHIVED'
);
```

---

## SQL Schema

### Complete Table Definitions

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANT CHURCH DATA CAPTURING SYSTEM - PostgreSQL Schema
-- ════════════════════════════════════════════════════════════════════════════

-- Enable UUID extension for CUID-like IDs (optional, using TEXT for CUIDs)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════════════
-- ENUMERATIONS
-- ════════════════════════════════════════════════════════════════════════════

CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'CHURCH_ADMIN', 'STAFF', 'CALL_CENTER', 'SUBSCRIBER', 'MEMBER');
CREATE TYPE member_status AS ENUM ('ACTIVE', 'INACTIVE', 'DECEASED', 'TRANSFERRED');
CREATE TYPE lead_source AS ENUM ('FACEBOOK', 'TV_SERVICE', 'WEBSITE', 'REFERRAL', 'WALK_IN', 'PHONE_CALL', 'OTHER');
CREATE TYPE lead_status AS ENUM ('NEW', 'CONTACTED', 'FOLLOW_UP', 'CONVERTED', 'CLOSED');
CREATE TYPE prayer_request_status AS ENUM ('PENDING', 'IN_PROGRESS', 'ANSWERED', 'CLOSED');
CREATE TYPE communication_type AS ENUM ('SMS', 'EMAIL', 'WHATSAPP');
CREATE TYPE communication_status AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');
CREATE TYPE offering_type AS ENUM ('TITHE', 'OFFERING', 'FIRST_FRUIT', 'SPECIAL_SEED', 'BUILDING_PROJECT', 'MISSIONS', 'OTHER');
CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');
CREATE TYPE call_outcome AS ENUM ('ANSWERED', 'NO_ANSWER', 'BUSY', 'VOICEMAIL', 'CALLBACK_REQUESTED', 'WRONG_NUMBER', 'COMPLETED');
CREATE TYPE gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE message_priority AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');
CREATE TYPE message_status AS ENUM ('UNREAD', 'READ', 'REPLIED', 'ARCHIVED');

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: tenant
-- Purpose: Root entity for multi-tenancy (Church)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE tenant (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL UNIQUE,
    description     TEXT,
    logo            TEXT,
    website         TEXT,
    email           TEXT,
    phone           TEXT,
    address         TEXT,
    city            TEXT,
    state           TEXT,
    postal_code     TEXT,
    country         TEXT NOT NULL DEFAULT 'South Africa',
    timezone        TEXT NOT NULL DEFAULT 'Africa/Johannesburg',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    is_hq           BOOLEAN NOT NULL DEFAULT FALSE,
    parent_id       TEXT REFERENCES tenant(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenant_slug ON tenant(slug);
CREATE INDEX idx_tenant_parent_id ON tenant(parent_id);
CREATE INDEX idx_tenant_is_active ON tenant(is_active);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: "user"
-- Purpose: System users with role-based access
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE "user" (
    id              TEXT PRIMARY KEY,
    email           TEXT NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    phone           TEXT,
    avatar          TEXT,
    role            user_role NOT NULL DEFAULT 'MEMBER',
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified  BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at   TIMESTAMP WITH TIME ZONE,
    tenant_id       TEXT REFERENCES tenant(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_tenant_id ON "user"(tenant_id);
CREATE INDEX idx_user_role ON "user"(role);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: role_permission
-- Purpose: Configurable permissions per role, module, and tenant
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE role_permission (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT REFERENCES tenant(id) ON DELETE CASCADE,
    role        user_role NOT NULL,
    module      TEXT NOT NULL,
    can_view    BOOLEAN NOT NULL DEFAULT FALSE,
    can_create  BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_role_permission UNIQUE (tenant_id, role, module)
);

CREATE INDEX idx_role_permission_tenant_id ON role_permission(tenant_id);
CREATE INDEX idx_role_permission_role ON role_permission(role);
CREATE INDEX idx_role_permission_module ON role_permission(module);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: user_permission
-- Purpose: Configurable permissions per user and module (overrides)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE user_permission (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    module      TEXT NOT NULL,
    can_view    BOOLEAN NOT NULL DEFAULT FALSE,
    can_create  BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_user_permission UNIQUE (user_id, module)
);

CREATE INDEX idx_user_permission_user_id ON user_permission(user_id);
CREATE INDEX idx_user_permission_module ON user_permission(module);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: member
-- Purpose: Church members
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE member (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    -- Personal Information
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    middle_name     TEXT,
    email           TEXT,
    phone           TEXT NOT NULL,
    alternate_phone TEXT,
    gender          gender,
    date_of_birth   DATE,
    address         TEXT,
    city            TEXT,
    state           TEXT,
    country         TEXT NOT NULL DEFAULT 'South Africa',
    occupation      TEXT,
    employer        TEXT,

    -- Church Information
    membership_id   TEXT,
    status          member_status NOT NULL DEFAULT 'ACTIVE',
    join_date       DATE NOT NULL DEFAULT CURRENT_DATE,
    baptism_date    DATE,
    wedding_date    DATE,

    -- Family Relations
    family_id       TEXT,
    is_head_of_family BOOLEAN NOT NULL DEFAULT FALSE,

    -- Metadata
    notes           TEXT,
    photo           TEXT,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_member_tenant_phone UNIQUE (tenant_id, phone),
    CONSTRAINT uq_member_tenant_membership_id UNIQUE (tenant_id, membership_id)
);

CREATE INDEX idx_member_tenant_id ON member(tenant_id);
CREATE INDEX idx_member_status ON member(status);
CREATE INDEX idx_member_family_id ON member(family_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: lead
-- Purpose: Prospects from various sources (Facebook, TV, etc.)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE lead (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    -- Contact Information
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    email               TEXT,
    phone               TEXT NOT NULL,
    alternate_phone     TEXT,
    address             TEXT,
    city                TEXT,
    state               TEXT,

    -- Lead Details
    source              lead_source NOT NULL,
    source_details      TEXT,
    status              lead_status NOT NULL DEFAULT 'NEW',
    notes               TEXT,

    -- Assignment
    assigned_to_id      TEXT REFERENCES "user"(id) ON DELETE SET NULL,
    assigned_at         TIMESTAMP WITH TIME ZONE,

    -- Conversion Tracking
    converted_to_member_id TEXT UNIQUE REFERENCES member(id) ON DELETE SET NULL,
    converted_at        TIMESTAMP WITH TIME ZONE,

    -- Metadata
    priority            INTEGER NOT NULL DEFAULT 0,
    last_contact_at     TIMESTAMP WITH TIME ZONE,
    next_follow_up      TIMESTAMP WITH TIME ZONE,

    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_lead_tenant_phone UNIQUE (tenant_id, phone)
);

CREATE INDEX idx_lead_tenant_id ON lead(tenant_id);
CREATE INDEX idx_lead_status ON lead(status);
CREATE INDEX idx_lead_source ON lead(source);
CREATE INDEX idx_lead_assigned_to_id ON lead(assigned_to_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: prayer_request
-- Purpose: Prayer submissions
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE prayer_request (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    -- Requestor
    member_id       TEXT REFERENCES member(id) ON DELETE SET NULL,

    -- Anonymous requestor details
    requestor_name  TEXT,
    requestor_email TEXT,
    requestor_phone TEXT,

    -- Prayer Details
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    is_anonymous    BOOLEAN NOT NULL DEFAULT FALSE,
    is_urgent       BOOLEAN NOT NULL DEFAULT FALSE,
    status          prayer_request_status NOT NULL DEFAULT 'PENDING',

    -- Response
    prayer_response TEXT,
    answered_at     TIMESTAMP WITH TIME ZONE,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_prayer_request_tenant_id ON prayer_request(tenant_id);
CREATE INDEX idx_prayer_request_member_id ON prayer_request(member_id);
CREATE INDEX idx_prayer_request_status ON prayer_request(status);
CREATE INDEX idx_prayer_request_is_urgent ON prayer_request(is_urgent);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: service
-- Purpose: Church services/events
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE service (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    name            TEXT NOT NULL,
    description     TEXT,
    service_date    DATE NOT NULL,
    start_time      TIME,
    end_time        TIME,

    -- Attendance
    attendance_count INTEGER,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_tenant_id ON service(tenant_id);
CREATE INDEX idx_service_service_date ON service(service_date);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: offering
-- Purpose: Church offerings and collections
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE offering (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    -- Giver Information
    member_id       TEXT REFERENCES member(id) ON DELETE SET NULL,

    -- Anonymous giver details
    giver_name      TEXT,
    giver_phone     TEXT,

    -- Offering Details
    type            offering_type NOT NULL,
    amount          DECIMAL(15, 2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'NGN',
    description     TEXT,

    -- Service Reference
    service_id      TEXT REFERENCES service(id) ON DELETE SET NULL,

    -- Payment Details
    payment_method  TEXT,
    reference       TEXT,

    -- Metadata
    given_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recorded_by     TEXT,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_offering_tenant_id ON offering(tenant_id);
CREATE INDEX idx_offering_member_id ON offering(member_id);
CREATE INDEX idx_offering_type ON offering(type);
CREATE INDEX idx_offering_service_id ON offering(service_id);
CREATE INDEX idx_offering_given_at ON offering(given_at);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: department
-- Purpose: Church departments/ministries
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE department (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    name        TEXT NOT NULL,
    description TEXT,
    leader_id   TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_department_tenant_name UNIQUE (tenant_id, name)
);

CREATE INDEX idx_department_tenant_id ON department(tenant_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: department_member
-- Purpose: Junction table for department-member relationship
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE department_member (
    id              TEXT PRIMARY KEY,
    department_id   TEXT NOT NULL REFERENCES department(id) ON DELETE CASCADE,
    member_id       TEXT NOT NULL REFERENCES member(id) ON DELETE CASCADE,
    role            TEXT,
    joined_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_department_member UNIQUE (department_id, member_id)
);

CREATE INDEX idx_department_member_department_id ON department_member(department_id);
CREATE INDEX idx_department_member_member_id ON department_member(member_id);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: communication
-- Purpose: SMS, Email, WhatsApp messages
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE communication (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    -- Message Details
    type            communication_type NOT NULL,
    subject         TEXT,
    message         TEXT NOT NULL,

    -- Recipient
    member_id       TEXT REFERENCES member(id) ON DELETE SET NULL,
    lead_id         TEXT REFERENCES lead(id) ON DELETE SET NULL,
    recipient_phone TEXT,
    recipient_email TEXT,

    -- Sender
    sender_id       TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

    -- Status Tracking
    status          communication_status NOT NULL DEFAULT 'PENDING',
    sent_at         TIMESTAMP WITH TIME ZONE,
    delivered_at    TIMESTAMP WITH TIME ZONE,
    failure_reason  TEXT,

    -- External Reference
    external_id     TEXT,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_communication_tenant_id ON communication(tenant_id);
CREATE INDEX idx_communication_member_id ON communication(member_id);
CREATE INDEX idx_communication_lead_id ON communication(lead_id);
CREATE INDEX idx_communication_status ON communication(status);
CREATE INDEX idx_communication_type ON communication(type);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: call_log
-- Purpose: Call center activity tracking
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE call_log (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    -- Call Parties
    operator_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

    -- Called party
    member_id       TEXT REFERENCES member(id) ON DELETE SET NULL,
    lead_id         TEXT REFERENCES lead(id) ON DELETE SET NULL,

    phone_number    TEXT NOT NULL,

    -- Call Details
    outcome         call_outcome NOT NULL,
    duration        INTEGER,
    notes           TEXT,

    -- Follow-up
    requires_follow_up BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date  TIMESTAMP WITH TIME ZONE,
    follow_up_notes TEXT,

    called_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_call_log_tenant_id ON call_log(tenant_id);
CREATE INDEX idx_call_log_operator_id ON call_log(operator_id);
CREATE INDEX idx_call_log_member_id ON call_log(member_id);
CREATE INDEX idx_call_log_lead_id ON call_log(lead_id);
CREATE INDEX idx_call_log_called_at ON call_log(called_at);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: invitation
-- Purpose: Token-based invitations
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE invitation (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL REFERENCES tenant(id) ON DELETE CASCADE,

    email           TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'MEMBER',
    token           TEXT NOT NULL UNIQUE,
    status          invitation_status NOT NULL DEFAULT 'PENDING',

    -- Who created the invitation
    created_by_id   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at     TIMESTAMP WITH TIME ZONE,

    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitation_tenant_id ON invitation(tenant_id);
CREATE INDEX idx_invitation_token ON invitation(token);
CREATE INDEX idx_invitation_email ON invitation(email);
CREATE INDEX idx_invitation_status ON invitation(status);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: audit_log
-- Purpose: Track all critical actions
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE audit_log (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT REFERENCES tenant(id) ON DELETE SET NULL,

    user_id     TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,

    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,

    old_data    JSONB,
    new_data    JSONB,

    ip_address  TEXT,
    user_agent  TEXT,

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: internal_message
-- Purpose: Communication between Tenants and Super Admin
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE internal_message (
    id          TEXT PRIMARY KEY,

    -- Sender/Receiver
    sender_id   TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    receiver_id TEXT REFERENCES "user"(id) ON DELETE SET NULL,

    -- Tenant context
    tenant_id   TEXT REFERENCES tenant(id) ON DELETE SET NULL,

    -- Message content
    subject     TEXT NOT NULL,
    message     TEXT NOT NULL,
    priority    message_priority NOT NULL DEFAULT 'NORMAL',
    status      message_status NOT NULL DEFAULT 'UNREAD',

    -- Threading
    parent_id   TEXT REFERENCES internal_message(id) ON DELETE SET NULL,

    -- Metadata
    read_at     TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,

    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_internal_message_sender_id ON internal_message(sender_id);
CREATE INDEX idx_internal_message_receiver_id ON internal_message(receiver_id);
CREATE INDEX idx_internal_message_tenant_id ON internal_message(tenant_id);
CREATE INDEX idx_internal_message_status ON internal_message(status);
CREATE INDEX idx_internal_message_parent_id ON internal_message(parent_id);
CREATE INDEX idx_internal_message_created_at ON internal_message(created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- TABLE: system_settings
-- Purpose: Global platform settings (Super Admin only)
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE system_settings (
    id                      TEXT PRIMARY KEY DEFAULT 'system_settings',

    -- General Settings
    platform_name           TEXT NOT NULL DEFAULT 'Unity Fellowship Church',
    platform_description    TEXT DEFAULT 'Multi-Tenant Church Management System',
    support_email           TEXT,
    support_phone           TEXT,
    default_timezone        TEXT NOT NULL DEFAULT 'Africa/Johannesburg',

    -- Email/SMTP Settings
    smtp_host               TEXT,
    smtp_port               INTEGER NOT NULL DEFAULT 587,
    smtp_user               TEXT,
    smtp_pass               TEXT,
    smtp_from_email         TEXT,
    smtp_from_name          TEXT,
    smtp_secure             BOOLEAN NOT NULL DEFAULT TRUE,

    -- Notification Settings
    notify_new_tenant       BOOLEAN NOT NULL DEFAULT TRUE,
    notify_system_errors    BOOLEAN NOT NULL DEFAULT TRUE,
    notify_daily_summary    BOOLEAN NOT NULL DEFAULT FALSE,
    notify_security_alerts  BOOLEAN NOT NULL DEFAULT TRUE,

    -- Security Settings
    session_timeout_mins    INTEGER NOT NULL DEFAULT 60,
    max_login_attempts      INTEGER NOT NULL DEFAULT 5,
    lockout_duration_mins   INTEGER NOT NULL DEFAULT 15,
    password_min_length     INTEGER NOT NULL DEFAULT 8,
    require_uppercase       BOOLEAN NOT NULL DEFAULT TRUE,
    require_number          BOOLEAN NOT NULL DEFAULT TRUE,
    require_special_char    BOOLEAN NOT NULL DEFAULT TRUE,
    require_2fa             BOOLEAN NOT NULL DEFAULT FALSE,

    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════════════════════════════════════════
-- TRIGGERS: Auto-update updated_at timestamps
-- ════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON tenant FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_role_permission_updated_at BEFORE UPDATE ON role_permission FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_permission_updated_at BEFORE UPDATE ON user_permission FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_member_updated_at BEFORE UPDATE ON member FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_lead_updated_at BEFORE UPDATE ON lead FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_prayer_request_updated_at BEFORE UPDATE ON prayer_request FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_updated_at BEFORE UPDATE ON service FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offering_updated_at BEFORE UPDATE ON offering FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_department_updated_at BEFORE UPDATE ON department FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_communication_updated_at BEFORE UPDATE ON communication FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_call_log_updated_at BEFORE UPDATE ON call_log FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invitation_updated_at BEFORE UPDATE ON invitation FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_internal_message_updated_at BEFORE UPDATE ON internal_message FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

## Indexes Strategy

### Index Categories

| Category               | Purpose                   | Examples                                 |
| ---------------------- | ------------------------- | ---------------------------------------- |
| **Primary Keys**       | Unique row identification | `id` on all tables                       |
| **Foreign Keys**       | Join optimization         | `tenant_id`, `member_id`, `user_id`      |
| **Unique Constraints** | Data integrity            | `email`, `slug`, `token`                 |
| **Filter/Search**      | Query performance         | `status`, `role`, `source`               |
| **Date/Time**          | Range queries             | `created_at`, `service_date`, `given_at` |

### Index Summary by Table

| Table           | Indexes                                                         |
| --------------- | --------------------------------------------------------------- |
| `tenant`        | `slug` (unique), `parent_id`, `is_active`                       |
| `user`          | `email` (unique), `tenant_id`, `role`                           |
| `member`        | `tenant_id`, `status`, `family_id`, `(tenant_id, phone)` unique |
| `lead`          | `tenant_id`, `status`, `source`, `assigned_to_id`               |
| `offering`      | `tenant_id`, `member_id`, `type`, `service_id`, `given_at`      |
| `communication` | `tenant_id`, `member_id`, `lead_id`, `status`, `type`           |
| `call_log`      | `tenant_id`, `operator_id`, `member_id`, `lead_id`, `called_at` |
| `audit_log`     | `tenant_id`, `user_id`, `entity_type`, `created_at`             |

---

## Security Considerations

### Row-Level Security (RLS)

For enhanced security, implement PostgreSQL RLS policies:

```sql
-- Enable RLS on tenant-scoped tables
ALTER TABLE member ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering ENABLE ROW LEVEL SECURITY;
-- ... repeat for other tenant-scoped tables

-- Example policy: Users can only see data from their tenant
CREATE POLICY tenant_isolation_policy ON member
    USING (tenant_id = current_setting('app.current_tenant_id', true));
```

### Sensitive Data Protection

| Field                  | Protection Method                                        |
| ---------------------- | -------------------------------------------------------- |
| `password_hash`        | bcrypt with salt rounds ≥ 12                             |
| `smtp_pass`            | Application-level encryption                             |
| `token` (invitation)   | Cryptographically random, time-limited                   |
| `old_data`, `new_data` | Audit logs may contain PII; implement retention policies |

### Access Control Matrix

| Role         | Tenant Data | Other Tenant Data | System Settings |
| ------------ | ----------- | ----------------- | --------------- |
| SUPER_ADMIN  | Full        | Full              | Full            |
| CHURCH_ADMIN | Full        | None              | None            |
| STAFF        | Limited     | None              | None            |
| CALL_CENTER  | Leads/Calls | None              | None            |
| SUBSCRIBER   | Read-only   | None              | None            |
| MEMBER       | Own data    | None              | None            |

---

## Appendix: Seed Data Script

```sql
-- ════════════════════════════════════════════════════════════════════════════
-- SEED DATA: Initial system setup
-- ════════════════════════════════════════════════════════════════════════════

-- Create HQ Tenant
INSERT INTO tenant (id, name, slug, description, country, timezone, is_active, is_hq, created_at, updated_at)
VALUES (
    'clhq000000000000000',
    'ChurchHub HQ',
    'churchhub-hq',
    'ChurchHub System Administration',
    'South Africa',
    'Africa/Johannesburg',
    TRUE,
    TRUE,
    NOW(),
    NOW()
);

-- Create Super Admin User (password: SuperAdmin@123)
-- Password hash generated with bcrypt, 12 rounds
INSERT INTO "user" (id, email, password_hash, first_name, last_name, role, is_active, email_verified, tenant_id, created_at, updated_at)
VALUES (
    'clsa000000000000000',
    'superadmin@churchhub.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4k3Hc0pLKJ8.k1pO',
    'Super',
    'Admin',
    'SUPER_ADMIN',
    TRUE,
    TRUE,
    'clhq000000000000000',
    NOW(),
    NOW()
);

-- Initialize system settings
INSERT INTO system_settings (id, platform_name, platform_description, created_at, updated_at)
VALUES (
    'system_settings',
    'Unity Fellowship Church',
    'Multi-Tenant Church Management System',
    NOW(),
    NOW()
);
```

---

## Version History

| Version | Date       | Author | Changes                       |
| ------- | ---------- | ------ | ----------------------------- |
| 1.0.0   | 2026-01-09 | System | Initial database architecture |

---

_Generated from Prisma Schema Analysis_
