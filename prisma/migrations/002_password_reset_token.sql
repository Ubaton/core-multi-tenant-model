-- ══════════════════════════════════════════════════════════════════════════
-- Password reset tokens
-- prisma/migrations/002_password_reset_token.sql
--
-- Run once via:  psql $DATABASE_URL -f prisma/migrations/002_password_reset_token.sql
--
-- Backs the forgot-password / reset-password flow. Only a SHA-256 hash of the
-- token is stored, so a database leak does not hand out usable reset links.
--
-- Naming follows 000_init_schema.sql (snake_case), which matches the live
-- database.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS password_reset_token (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at    TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_password_reset_token_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_token_user
        FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_user ON password_reset_token (user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_token_expires ON password_reset_token (expires_at);

COMMENT ON TABLE password_reset_token IS 'Single-use, short-lived password reset tokens';
COMMENT ON COLUMN password_reset_token.token_hash IS 'SHA-256 hex digest of the token sent to the user - the raw token is never stored';
COMMENT ON COLUMN password_reset_token.used_at IS 'Set when the token is redeemed; a token with used_at IS NOT NULL is rejected';
