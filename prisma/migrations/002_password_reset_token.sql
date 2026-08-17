-- ══════════════════════════════════════════════════════════════════════════
-- Password reset tokens
-- prisma/migrations/002_password_reset_token.sql
--
-- Run once via:  psql $DATABASE_URL -f prisma/migrations/002_password_reset_token.sql
--
-- Backs the forgot-password / reset-password flow. Only a SHA-256 hash of the
-- token is stored, so a database leak does not hand out usable reset links.
-- ══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
    id          TEXT PRIMARY KEY,
    "userId"    TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
    "usedAt"    TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_password_reset_token_hash UNIQUE ("tokenHash"),
    CONSTRAINT fk_password_reset_token_user
        FOREIGN KEY ("userId") REFERENCES "User"(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_password_reset_token_user ON "PasswordResetToken" ("userId");
CREATE INDEX IF NOT EXISTS idx_password_reset_token_expires ON "PasswordResetToken" ("expiresAt");

COMMENT ON TABLE "PasswordResetToken" IS 'Single-use, short-lived password reset tokens';
COMMENT ON COLUMN "PasswordResetToken"."tokenHash" IS 'SHA-256 hex digest of the token sent to the user - the raw token is never stored';
COMMENT ON COLUMN "PasswordResetToken"."usedAt" IS 'Set when the token is redeemed; a token with usedAt IS NOT NULL is rejected';
