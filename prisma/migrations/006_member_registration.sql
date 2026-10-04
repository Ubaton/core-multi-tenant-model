-- ══════════════════════════════════════════════════════════════════════════
-- Public member registration (QR code / shareable link)
-- prisma/migrations/006_member_registration.sql
--
-- Apply once via:  node scripts/run-migration.mjs prisma/migrations/006_member_registration.sql
--
-- registration_link
--   One row per tenant. `token` is an unguessable capability embedded in the
--   public URL / QR code (/register/<token>). Rotating the link replaces the
--   token, which immediately kills every previously shared URL and QR code.
--
-- member_registration
--   One row per submitted form. The searchable identity fields get real
--   columns; the full form (about 50 fields) is kept as JSONB so the form can
--   evolve without a migration. Submissions are staged here and are NOT
--   members until someone on the tenant reviews them.
--
--   ip_hash is a salted SHA-256 of the submitter's IP. It exists only to
--   rate-limit abuse across server instances, never to identify a person.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS registration_link (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    token       TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at  TIMESTAMP(3),
    created_by  TEXT,
    created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_registration_link_tenant UNIQUE (tenant_id),
    CONSTRAINT uq_registration_link_token UNIQUE (token),
    CONSTRAINT fk_registration_link_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS member_registration (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    surname     TEXT NOT NULL,
    names       TEXT NOT NULL,
    cell_number TEXT NOT NULL,
    email       TEXT,
    id_number   TEXT,
    data        JSONB NOT NULL,
    status      TEXT NOT NULL DEFAULT 'PENDING',
    ip_hash     TEXT,
    created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_member_registration_status CHECK (status IN ('PENDING', 'REVIEWED')),
    CONSTRAINT fk_member_registration_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_member_registration_tenant_created ON member_registration (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_member_registration_rate_limit ON member_registration (tenant_id, ip_hash, created_at);

COMMENT ON TABLE member_registration IS
  'Self-service registrations submitted through the public QR/link form. Staged, not yet members.';
