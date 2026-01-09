-- ════════════════════════════════════════════════════════════════════════════
-- MULTI-TENANT CHURCH DATA CAPTURING SYSTEM
-- PostgreSQL DDL Schema
-- ════════════════════════════════════════════════════════════════════════════
-- 
-- Database: PostgreSQL 14+
-- Generated: 2026-01-09
-- 
-- Usage:
--   psql -U postgres -d your_database -f 000_init_schema.sql
--
-- Or via pg_restore / pgAdmin import
-- ════════════════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 1: CLEANUP (Optional - uncomment to drop existing objects)
-- ════════════════════════════════════════════════════════════════════════════

-- DROP TABLE IF EXISTS system_settings CASCADE;
-- DROP TABLE IF EXISTS internal_message CASCADE;
-- DROP TABLE IF EXISTS audit_log CASCADE;
-- DROP TABLE IF EXISTS invitation CASCADE;
-- DROP TABLE IF EXISTS call_log CASCADE;
-- DROP TABLE IF EXISTS communication CASCADE;
-- DROP TABLE IF EXISTS department_member CASCADE;
-- DROP TABLE IF EXISTS department CASCADE;
-- DROP TABLE IF EXISTS offering CASCADE;
-- DROP TABLE IF EXISTS service CASCADE;
-- DROP TABLE IF EXISTS prayer_request CASCADE;
-- DROP TABLE IF EXISTS lead CASCADE;
-- DROP TABLE IF EXISTS member CASCADE;
-- DROP TABLE IF EXISTS user_permission CASCADE;
-- DROP TABLE IF EXISTS role_permission CASCADE;
-- DROP TABLE IF EXISTS "user" CASCADE;
-- DROP TABLE IF EXISTS tenant CASCADE;

-- DROP TYPE IF EXISTS message_status CASCADE;
-- DROP TYPE IF EXISTS message_priority CASCADE;
-- DROP TYPE IF EXISTS gender CASCADE;
-- DROP TYPE IF EXISTS call_outcome CASCADE;
-- DROP TYPE IF EXISTS invitation_status CASCADE;
-- DROP TYPE IF EXISTS offering_type CASCADE;
-- DROP TYPE IF EXISTS communication_status CASCADE;
-- DROP TYPE IF EXISTS communication_type CASCADE;
-- DROP TYPE IF EXISTS prayer_request_status CASCADE;
-- DROP TYPE IF EXISTS lead_status CASCADE;
-- DROP TYPE IF EXISTS lead_source CASCADE;
-- DROP TYPE IF EXISTS member_status CASCADE;
-- DROP TYPE IF EXISTS user_role CASCADE;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 2: ENUMERATIONS
-- ════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM (
        'SUPER_ADMIN',
        'CHURCH_ADMIN',
        'STAFF',
        'CALL_CENTER',
        'SUBSCRIBER',
        'MEMBER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE member_status AS ENUM (
        'ACTIVE',
        'INACTIVE',
        'DECEASED',
        'TRANSFERRED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_source AS ENUM (
        'FACEBOOK',
        'TV_SERVICE',
        'WEBSITE',
        'REFERRAL',
        'WALK_IN',
        'PHONE_CALL',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE lead_status AS ENUM (
        'NEW',
        'CONTACTED',
        'FOLLOW_UP',
        'CONVERTED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE prayer_request_status AS ENUM (
        'PENDING',
        'IN_PROGRESS',
        'ANSWERED',
        'CLOSED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE communication_type AS ENUM (
        'SMS',
        'EMAIL',
        'WHATSAPP'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE communication_status AS ENUM (
        'PENDING',
        'SENT',
        'DELIVERED',
        'FAILED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE offering_type AS ENUM (
        'TITHE',
        'OFFERING',
        'FIRST_FRUIT',
        'SPECIAL_SEED',
        'BUILDING_PROJECT',
        'MISSIONS',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM (
        'PENDING',
        'ACCEPTED',
        'EXPIRED',
        'REVOKED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE call_outcome AS ENUM (
        'ANSWERED',
        'NO_ANSWER',
        'BUSY',
        'VOICEMAIL',
        'CALLBACK_REQUESTED',
        'WRONG_NUMBER',
        'COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE gender AS ENUM (
        'MALE',
        'FEMALE',
        'OTHER'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_priority AS ENUM (
        'LOW',
        'NORMAL',
        'HIGH',
        'URGENT'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE message_status AS ENUM (
        'UNREAD',
        'READ',
        'REPLIED',
        'ARCHIVED'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 3: TABLES
-- ════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: tenant
-- Purpose: Root entity for multi-tenancy (Church organization)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tenant (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
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
    parent_id       TEXT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_tenant_slug UNIQUE (slug),
    CONSTRAINT fk_tenant_parent FOREIGN KEY (parent_id) REFERENCES tenant(id) ON DELETE SET NULL
);

COMMENT ON TABLE tenant IS 'Root entity for multi-tenancy - represents a church organization';
COMMENT ON COLUMN tenant.slug IS 'Unique subdomain identifier (e.g., grace-chapel)';
COMMENT ON COLUMN tenant.is_hq IS 'Indicates if this is the headquarters church';
COMMENT ON COLUMN tenant.parent_id IS 'Reference to parent tenant for branch churches';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: "user"
-- Purpose: System users with role-based access control
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "user" (
    id                    TEXT PRIMARY KEY,
    email                 TEXT NOT NULL,
    password_hash         TEXT NOT NULL,
    first_name            TEXT NOT NULL,
    last_name             TEXT NOT NULL,
    phone                 TEXT,
    avatar                TEXT,
    role                  user_role NOT NULL DEFAULT 'MEMBER',
    is_active             BOOLEAN NOT NULL DEFAULT TRUE,
    email_verified        BOOLEAN NOT NULL DEFAULT FALSE,
    must_change_password  BOOLEAN NOT NULL DEFAULT FALSE,
    last_login_at         TIMESTAMP WITH TIME ZONE,
    tenant_id             TEXT,
    created_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_email UNIQUE (email),
    CONSTRAINT fk_user_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE SET NULL
);

COMMENT ON TABLE "user" IS 'System users with role-based access - tenant_id is NULL for SUPER_ADMIN';
COMMENT ON COLUMN "user".password_hash IS 'bcrypt hashed password with salt';
COMMENT ON COLUMN "user".role IS 'User role for RBAC: SUPER_ADMIN, CHURCH_ADMIN, STAFF, CALL_CENTER, SUBSCRIBER, MEMBER';
COMMENT ON COLUMN "user".must_change_password IS 'When TRUE, user must change password on next login';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: role_permission
-- Purpose: Configurable permissions per role, module, and tenant
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS role_permission (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    role        user_role NOT NULL,
    module      TEXT NOT NULL,
    can_view    BOOLEAN NOT NULL DEFAULT FALSE,
    can_create  BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_role_permission UNIQUE (tenant_id, role, module),
    CONSTRAINT fk_role_permission_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

COMMENT ON TABLE role_permission IS 'Role-based permissions per module - NULL tenant_id = global default';
COMMENT ON COLUMN role_permission.module IS 'Module identifier: members, leads, offerings, prayer_requests, etc.';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: user_permission
-- Purpose: User-specific permission overrides
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_permission (
    id          TEXT PRIMARY KEY,
    user_id     TEXT NOT NULL,
    module      TEXT NOT NULL,
    can_view    BOOLEAN NOT NULL DEFAULT FALSE,
    can_create  BOOLEAN NOT NULL DEFAULT FALSE,
    can_edit    BOOLEAN NOT NULL DEFAULT FALSE,
    can_delete  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_user_permission UNIQUE (user_id, module),
    CONSTRAINT fk_user_permission_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

COMMENT ON TABLE user_permission IS 'User-specific permission overrides (takes precedence over role permissions)';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: member
-- Purpose: Church members registry
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS member (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL,
    
    -- Personal Information
    first_name          TEXT NOT NULL,
    last_name           TEXT NOT NULL,
    middle_name         TEXT,
    email               TEXT,
    phone               TEXT NOT NULL,
    alternate_phone     TEXT,
    gender              gender,
    date_of_birth       DATE,
    address             TEXT,
    city                TEXT,
    state               TEXT,
    country             TEXT NOT NULL DEFAULT 'South Africa',
    occupation          TEXT,
    employer            TEXT,
    
    -- Church Information
    membership_id       TEXT,
    status              member_status NOT NULL DEFAULT 'ACTIVE',
    join_date           DATE NOT NULL DEFAULT CURRENT_DATE,
    baptism_date        DATE,
    wedding_date        DATE,
    
    -- Family Relations
    family_id           TEXT,
    is_head_of_family   BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Metadata
    notes               TEXT,
    photo               TEXT,
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_member_tenant_phone UNIQUE (tenant_id, phone),
    CONSTRAINT uq_member_tenant_membership_id UNIQUE (tenant_id, membership_id),
    CONSTRAINT fk_member_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

COMMENT ON TABLE member IS 'Church members with multi-tenant isolation';
COMMENT ON COLUMN member.membership_id IS 'Church-assigned membership ID (unique per tenant)';
COMMENT ON COLUMN member.family_id IS 'Groups family members together';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: lead
-- Purpose: Prospects from various sources (Facebook, TV, website, etc.)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS lead (
    id                      TEXT PRIMARY KEY,
    tenant_id               TEXT NOT NULL,
    
    -- Contact Information
    first_name              TEXT NOT NULL,
    last_name               TEXT NOT NULL,
    email                   TEXT,
    phone                   TEXT NOT NULL,
    alternate_phone         TEXT,
    address                 TEXT,
    city                    TEXT,
    state                   TEXT,
    
    -- Lead Details
    source                  lead_source NOT NULL,
    source_details          TEXT,
    status                  lead_status NOT NULL DEFAULT 'NEW',
    notes                   TEXT,
    
    -- Assignment
    assigned_to_id          TEXT,
    assigned_at             TIMESTAMP WITH TIME ZONE,
    
    -- Conversion Tracking
    converted_to_member_id  TEXT,
    converted_at            TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    priority                INTEGER NOT NULL DEFAULT 0,
    last_contact_at         TIMESTAMP WITH TIME ZONE,
    next_follow_up          TIMESTAMP WITH TIME ZONE,
    
    created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_lead_tenant_phone UNIQUE (tenant_id, phone),
    CONSTRAINT uq_lead_converted_member UNIQUE (converted_to_member_id),
    CONSTRAINT fk_lead_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    CONSTRAINT fk_lead_assigned_to FOREIGN KEY (assigned_to_id) REFERENCES "user"(id) ON DELETE SET NULL,
    CONSTRAINT fk_lead_converted_member FOREIGN KEY (converted_to_member_id) REFERENCES member(id) ON DELETE SET NULL
);

COMMENT ON TABLE lead IS 'Prospects from various sources with conversion tracking';
COMMENT ON COLUMN lead.source_details IS 'Specific campaign name, TV program, etc.';
COMMENT ON COLUMN lead.priority IS '0 = normal, higher values = more urgent';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: prayer_request
-- Purpose: Prayer submissions (from members or anonymous)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS prayer_request (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL,
    
    -- Requestor (member or anonymous)
    member_id           TEXT,
    requestor_name      TEXT,
    requestor_email     TEXT,
    requestor_phone     TEXT,
    
    -- Prayer Details
    title               TEXT NOT NULL,
    description         TEXT NOT NULL,
    is_anonymous        BOOLEAN NOT NULL DEFAULT FALSE,
    is_urgent           BOOLEAN NOT NULL DEFAULT FALSE,
    status              prayer_request_status NOT NULL DEFAULT 'PENDING',
    
    -- Response
    prayer_response     TEXT,
    answered_at         TIMESTAMP WITH TIME ZONE,
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_prayer_request_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    CONSTRAINT fk_prayer_request_member FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE SET NULL
);

COMMENT ON TABLE prayer_request IS 'Prayer submissions with status tracking';
COMMENT ON COLUMN prayer_request.is_anonymous IS 'If TRUE, requestor identity should be hidden in public displays';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: service
-- Purpose: Church services and events
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS service (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL,
    
    name                TEXT NOT NULL,
    description         TEXT,
    service_date        DATE NOT NULL,
    start_time          TIME,
    end_time            TIME,
    
    -- Attendance
    attendance_count    INTEGER,
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_service_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

COMMENT ON TABLE service IS 'Church services and events with attendance tracking';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: offering
-- Purpose: Church offerings, tithes, and donations
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS offering (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    
    -- Giver Information
    member_id       TEXT,
    giver_name      TEXT,
    giver_phone     TEXT,
    
    -- Offering Details
    type            offering_type NOT NULL,
    amount          DECIMAL(15, 2) NOT NULL,
    currency        TEXT NOT NULL DEFAULT 'NGN',
    description     TEXT,
    
    -- Service Reference
    service_id      TEXT,
    
    -- Payment Details
    payment_method  TEXT,
    reference       TEXT,
    
    -- Metadata
    given_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    recorded_by     TEXT,
    
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_offering_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    CONSTRAINT fk_offering_member FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE SET NULL,
    CONSTRAINT fk_offering_service FOREIGN KEY (service_id) REFERENCES service(id) ON DELETE SET NULL,
    CONSTRAINT chk_offering_amount_positive CHECK (amount > 0)
);

COMMENT ON TABLE offering IS 'Financial contributions with type classification';
COMMENT ON COLUMN offering.giver_name IS 'For anonymous or non-member givers';
COMMENT ON COLUMN offering.recorded_by IS 'User ID who recorded this offering';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: department
-- Purpose: Church departments and ministries
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS department (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    
    name        TEXT NOT NULL,
    description TEXT,
    leader_id   TEXT,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_department_tenant_name UNIQUE (tenant_id, name),
    CONSTRAINT fk_department_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

COMMENT ON TABLE department IS 'Church departments/ministries';
COMMENT ON COLUMN department.leader_id IS 'Member ID of department head';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: department_member
-- Purpose: Junction table for many-to-many department-member relationship
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS department_member (
    id              TEXT PRIMARY KEY,
    department_id   TEXT NOT NULL,
    member_id       TEXT NOT NULL,
    role            TEXT,
    joined_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_department_member UNIQUE (department_id, member_id),
    CONSTRAINT fk_department_member_department FOREIGN KEY (department_id) REFERENCES department(id) ON DELETE CASCADE,
    CONSTRAINT fk_department_member_member FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE CASCADE
);

COMMENT ON TABLE department_member IS 'Junction table linking members to departments with role';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: communication
-- Purpose: Multi-channel messaging (SMS, Email, WhatsApp)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS communication (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    
    -- Message Details
    type            communication_type NOT NULL,
    subject         TEXT,
    message         TEXT NOT NULL,
    
    -- Recipient (member or lead)
    member_id       TEXT,
    lead_id         TEXT,
    recipient_phone TEXT,
    recipient_email TEXT,
    
    -- Sender
    sender_id       TEXT NOT NULL,
    
    -- Status Tracking
    status          communication_status NOT NULL DEFAULT 'PENDING',
    sent_at         TIMESTAMP WITH TIME ZONE,
    delivered_at    TIMESTAMP WITH TIME ZONE,
    failure_reason  TEXT,
    
    -- External Reference
    external_id     TEXT,
    
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_communication_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    CONSTRAINT fk_communication_member FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE SET NULL,
    CONSTRAINT fk_communication_lead FOREIGN KEY (lead_id) REFERENCES lead(id) ON DELETE SET NULL,
    CONSTRAINT fk_communication_sender FOREIGN KEY (sender_id) REFERENCES "user"(id) ON DELETE CASCADE
);

COMMENT ON TABLE communication IS 'Multi-channel messaging with delivery tracking';
COMMENT ON COLUMN communication.external_id IS 'ID from SMS/Email/WhatsApp provider';
COMMENT ON COLUMN communication.recipient_phone IS 'Snapshot of phone at send time';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: call_log
-- Purpose: Call center activity tracking
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS call_log (
    id                  TEXT PRIMARY KEY,
    tenant_id           TEXT NOT NULL,
    
    -- Call Parties
    operator_id         TEXT NOT NULL,
    member_id           TEXT,
    lead_id             TEXT,
    phone_number        TEXT NOT NULL,
    
    -- Call Details
    outcome             call_outcome NOT NULL,
    duration            INTEGER,
    notes               TEXT,
    
    -- Follow-up
    requires_follow_up  BOOLEAN NOT NULL DEFAULT FALSE,
    follow_up_date      TIMESTAMP WITH TIME ZONE,
    follow_up_notes     TEXT,
    
    called_at           TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    created_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_call_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_log_operator FOREIGN KEY (operator_id) REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT fk_call_log_member FOREIGN KEY (member_id) REFERENCES member(id) ON DELETE SET NULL,
    CONSTRAINT fk_call_log_lead FOREIGN KEY (lead_id) REFERENCES lead(id) ON DELETE SET NULL
);

COMMENT ON TABLE call_log IS 'Call center activity with outcome and follow-up tracking';
COMMENT ON COLUMN call_log.duration IS 'Call duration in seconds';
COMMENT ON COLUMN call_log.phone_number IS 'The number that was called (historical record)';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: invitation
-- Purpose: Token-based user invitations
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invitation (
    id              TEXT PRIMARY KEY,
    tenant_id       TEXT NOT NULL,
    
    email           TEXT NOT NULL,
    role            user_role NOT NULL DEFAULT 'MEMBER',
    token           TEXT NOT NULL,
    status          invitation_status NOT NULL DEFAULT 'PENDING',
    
    -- Creator
    created_by_id   TEXT NOT NULL,
    
    expires_at      TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at     TIMESTAMP WITH TIME ZONE,
    
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT uq_invitation_token UNIQUE (token),
    CONSTRAINT fk_invitation_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    CONSTRAINT fk_invitation_creator FOREIGN KEY (created_by_id) REFERENCES "user"(id) ON DELETE CASCADE
);

COMMENT ON TABLE invitation IS 'Token-based user invitations with expiration';
COMMENT ON COLUMN invitation.token IS 'Cryptographically random invitation token';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: audit_log
-- Purpose: Comprehensive action tracking for compliance and debugging
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_log (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT,
    
    user_id     TEXT NOT NULL,
    
    action      TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id   TEXT NOT NULL,
    
    old_data    JSONB,
    new_data    JSONB,
    
    ip_address  TEXT,
    user_agent  TEXT,
    
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_audit_log_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE SET NULL,
    CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

COMMENT ON TABLE audit_log IS 'Comprehensive audit trail for all critical actions';
COMMENT ON COLUMN audit_log.action IS 'Action identifier: CREATE_MEMBER, UPDATE_OFFERING, DELETE_LEAD, etc.';
COMMENT ON COLUMN audit_log.old_data IS 'Previous state JSON snapshot (for updates/deletes)';
COMMENT ON COLUMN audit_log.new_data IS 'New state JSON snapshot (for creates/updates)';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: internal_message
-- Purpose: Internal messaging between users/tenants and Super Admin
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS internal_message (
    id          TEXT PRIMARY KEY,
    
    -- Sender/Receiver
    sender_id   TEXT NOT NULL,
    receiver_id TEXT,
    
    -- Tenant context
    tenant_id   TEXT,
    
    -- Message content
    subject     TEXT NOT NULL,
    message     TEXT NOT NULL,
    priority    message_priority NOT NULL DEFAULT 'NORMAL',
    status      message_status NOT NULL DEFAULT 'UNREAD',
    
    -- Threading (for replies)
    parent_id   TEXT,
    
    -- Metadata
    read_at     TIMESTAMP WITH TIME ZONE,
    archived_at TIMESTAMP WITH TIME ZONE,
    
    created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    CONSTRAINT fk_internal_message_sender FOREIGN KEY (sender_id) REFERENCES "user"(id) ON DELETE CASCADE,
    CONSTRAINT fk_internal_message_receiver FOREIGN KEY (receiver_id) REFERENCES "user"(id) ON DELETE SET NULL,
    CONSTRAINT fk_internal_message_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE SET NULL,
    CONSTRAINT fk_internal_message_parent FOREIGN KEY (parent_id) REFERENCES internal_message(id) ON DELETE SET NULL
);

COMMENT ON TABLE internal_message IS 'Internal messaging system with threading support';
COMMENT ON COLUMN internal_message.receiver_id IS 'NULL for broadcast to Super Admin';
COMMENT ON COLUMN internal_message.parent_id IS 'Reference to parent message for threading';

-- ──────────────────────────────────────────────────────────────────────────────
-- TABLE: system_settings
-- Purpose: Global platform settings (singleton - one row)
-- ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS system_settings (
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

COMMENT ON TABLE system_settings IS 'Global platform configuration (singleton table)';
COMMENT ON COLUMN system_settings.smtp_pass IS 'Should be encrypted at application level';

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 4: INDEXES
-- ════════════════════════════════════════════════════════════════════════════

-- Tenant indexes
CREATE INDEX IF NOT EXISTS idx_tenant_slug ON tenant(slug);
CREATE INDEX IF NOT EXISTS idx_tenant_parent_id ON tenant(parent_id);
CREATE INDEX IF NOT EXISTS idx_tenant_is_active ON tenant(is_active);

-- User indexes
CREATE INDEX IF NOT EXISTS idx_user_email ON "user"(email);
CREATE INDEX IF NOT EXISTS idx_user_tenant_id ON "user"(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_role ON "user"(role);

-- Role permission indexes
CREATE INDEX IF NOT EXISTS idx_role_permission_tenant_id ON role_permission(tenant_id);
CREATE INDEX IF NOT EXISTS idx_role_permission_role ON role_permission(role);
CREATE INDEX IF NOT EXISTS idx_role_permission_module ON role_permission(module);

-- User permission indexes
CREATE INDEX IF NOT EXISTS idx_user_permission_user_id ON user_permission(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permission_module ON user_permission(module);

-- Member indexes
CREATE INDEX IF NOT EXISTS idx_member_tenant_id ON member(tenant_id);
CREATE INDEX IF NOT EXISTS idx_member_status ON member(status);
CREATE INDEX IF NOT EXISTS idx_member_family_id ON member(family_id);
CREATE INDEX IF NOT EXISTS idx_member_email ON member(email);
CREATE INDEX IF NOT EXISTS idx_member_join_date ON member(join_date);

-- Lead indexes
CREATE INDEX IF NOT EXISTS idx_lead_tenant_id ON lead(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lead_status ON lead(status);
CREATE INDEX IF NOT EXISTS idx_lead_source ON lead(source);
CREATE INDEX IF NOT EXISTS idx_lead_assigned_to_id ON lead(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_lead_next_follow_up ON lead(next_follow_up);

-- Prayer request indexes
CREATE INDEX IF NOT EXISTS idx_prayer_request_tenant_id ON prayer_request(tenant_id);
CREATE INDEX IF NOT EXISTS idx_prayer_request_member_id ON prayer_request(member_id);
CREATE INDEX IF NOT EXISTS idx_prayer_request_status ON prayer_request(status);
CREATE INDEX IF NOT EXISTS idx_prayer_request_is_urgent ON prayer_request(is_urgent);

-- Service indexes
CREATE INDEX IF NOT EXISTS idx_service_tenant_id ON service(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_service_date ON service(service_date);

-- Offering indexes
CREATE INDEX IF NOT EXISTS idx_offering_tenant_id ON offering(tenant_id);
CREATE INDEX IF NOT EXISTS idx_offering_member_id ON offering(member_id);
CREATE INDEX IF NOT EXISTS idx_offering_type ON offering(type);
CREATE INDEX IF NOT EXISTS idx_offering_service_id ON offering(service_id);
CREATE INDEX IF NOT EXISTS idx_offering_given_at ON offering(given_at);

-- Department indexes
CREATE INDEX IF NOT EXISTS idx_department_tenant_id ON department(tenant_id);

-- Department member indexes
CREATE INDEX IF NOT EXISTS idx_department_member_department_id ON department_member(department_id);
CREATE INDEX IF NOT EXISTS idx_department_member_member_id ON department_member(member_id);

-- Communication indexes
CREATE INDEX IF NOT EXISTS idx_communication_tenant_id ON communication(tenant_id);
CREATE INDEX IF NOT EXISTS idx_communication_member_id ON communication(member_id);
CREATE INDEX IF NOT EXISTS idx_communication_lead_id ON communication(lead_id);
CREATE INDEX IF NOT EXISTS idx_communication_status ON communication(status);
CREATE INDEX IF NOT EXISTS idx_communication_type ON communication(type);
CREATE INDEX IF NOT EXISTS idx_communication_sender_id ON communication(sender_id);

-- Call log indexes
CREATE INDEX IF NOT EXISTS idx_call_log_tenant_id ON call_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_call_log_operator_id ON call_log(operator_id);
CREATE INDEX IF NOT EXISTS idx_call_log_member_id ON call_log(member_id);
CREATE INDEX IF NOT EXISTS idx_call_log_lead_id ON call_log(lead_id);
CREATE INDEX IF NOT EXISTS idx_call_log_called_at ON call_log(called_at);

-- Invitation indexes
CREATE INDEX IF NOT EXISTS idx_invitation_tenant_id ON invitation(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitation_token ON invitation(token);
CREATE INDEX IF NOT EXISTS idx_invitation_email ON invitation(email);
CREATE INDEX IF NOT EXISTS idx_invitation_status ON invitation(status);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant_id ON audit_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity_type ON audit_log(entity_type);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Internal message indexes
CREATE INDEX IF NOT EXISTS idx_internal_message_sender_id ON internal_message(sender_id);
CREATE INDEX IF NOT EXISTS idx_internal_message_receiver_id ON internal_message(receiver_id);
CREATE INDEX IF NOT EXISTS idx_internal_message_tenant_id ON internal_message(tenant_id);
CREATE INDEX IF NOT EXISTS idx_internal_message_status ON internal_message(status);
CREATE INDEX IF NOT EXISTS idx_internal_message_parent_id ON internal_message(parent_id);
CREATE INDEX IF NOT EXISTS idx_internal_message_created_at ON internal_message(created_at);

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 5: TRIGGERS
-- ════════════════════════════════════════════════════════════════════════════

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at column
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY[
            'tenant', '"user"', 'role_permission', 'user_permission',
            'member', 'lead', 'prayer_request', 'service', 'offering',
            'department', 'communication', 'call_log', 'invitation',
            'internal_message', 'system_settings'
        ])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', replace(t, '"', ''), t, replace(t, '"', ''), t);
    END LOOP;
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 6: SEED DATA
-- ════════════════════════════════════════════════════════════════════════════

-- Insert default system settings (singleton)
INSERT INTO system_settings (id, platform_name, platform_description)
VALUES ('system_settings', 'Unity Fellowship Church', 'Multi-Tenant Church Management System')
ON CONFLICT (id) DO NOTHING;

-- Insert HQ Tenant
INSERT INTO tenant (id, name, slug, description, country, timezone, is_active, is_hq)
VALUES (
    'clhq000000000000000',
    'ChurchHub HQ',
    'churchhub-hq',
    'ChurchHub System Administration',
    'South Africa',
    'Africa/Johannesburg',
    TRUE,
    TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- Insert Super Admin User
-- Password: SuperAdmin@123 (bcrypt hash with 12 rounds)
INSERT INTO "user" (id, email, password_hash, first_name, last_name, role, is_active, email_verified, tenant_id)
VALUES (
    'clsa000000000000000',
    'superadmin@churchhub.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4k3Hc0pLKJ8.k1pO',
    'Super',
    'Admin',
    'SUPER_ADMIN',
    TRUE,
    TRUE,
    'clhq000000000000000'
)
ON CONFLICT (email) DO NOTHING;

-- ════════════════════════════════════════════════════════════════════════════
-- SECTION 7: ROW-LEVEL SECURITY (Optional - Uncomment to enable)
-- ════════════════════════════════════════════════════════════════════════════

/*
-- Enable RLS on tenant-scoped tables
ALTER TABLE member ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_request ENABLE ROW LEVEL SECURITY;
ALTER TABLE service ENABLE ROW LEVEL SECURITY;
ALTER TABLE offering ENABLE ROW LEVEL SECURITY;
ALTER TABLE department ENABLE ROW LEVEL SECURITY;
ALTER TABLE department_member ENABLE ROW LEVEL SECURITY;
ALTER TABLE communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_permission ENABLE ROW LEVEL SECURITY;

-- Example policy: Users can only access data from their tenant
CREATE POLICY tenant_isolation_member ON member
    USING (tenant_id = current_setting('app.current_tenant_id', true)::TEXT);

CREATE POLICY tenant_isolation_lead ON lead
    USING (tenant_id = current_setting('app.current_tenant_id', true)::TEXT);

-- Add similar policies for other tenant-scoped tables...
*/

-- ════════════════════════════════════════════════════════════════════════════
-- SCHEMA CREATION COMPLETE
-- ════════════════════════════════════════════════════════════════════════════

-- Verify table count
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE';
    
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Schema creation complete!';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE 'Super Admin Credentials:';
    RAISE NOTICE '  Email:    superadmin@churchhub.com';
    RAISE NOTICE '  Password: SuperAdmin@123';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
    RAISE NOTICE 'WARNING: Change the Super Admin password after first login!';
    RAISE NOTICE '════════════════════════════════════════════════════════════';
END $$;
