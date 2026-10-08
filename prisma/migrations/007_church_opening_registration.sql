-- Independent QR links and submissions for VILLAGE OF THE LORD CHURCH OPENING.
CREATE TABLE IF NOT EXISTS church_opening_link (
    id          TEXT PRIMARY KEY,
    tenant_id   TEXT NOT NULL,
    token       TEXT NOT NULL,
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    expires_at  TIMESTAMP(3),
    created_by  TEXT,
    created_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_church_opening_link_tenant UNIQUE (tenant_id),
    CONSTRAINT uq_church_opening_link_token UNIQUE (token),
    CONSTRAINT fk_church_opening_link_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS church_opening_registration (
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

    CONSTRAINT chk_church_opening_registration_status CHECK (status IN ('PENDING', 'REVIEWED')),
    CONSTRAINT fk_church_opening_registration_tenant FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_church_opening_registration_tenant_created ON church_opening_registration (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_church_opening_registration_rate_limit ON church_opening_registration (tenant_id, ip_hash, created_at);

COMMENT ON TABLE church_opening_registration IS
  'Self-service registrations submitted through the public QR/link form. Staged, not yet members.';
