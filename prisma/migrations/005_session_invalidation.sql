-- ══════════════════════════════════════════════════════════════════════════
-- Session invalidation cutoff for "user"
-- prisma/migrations/005_session_invalidation.sql
--
-- Run once via:  psql $DATABASE_URL -f prisma/migrations/005_session_invalidation.sql
--
-- Access and refresh tokens are stateless JWTs, so there is no session table to
-- delete rows from. Instead each user carries a cutoff: any token issued before
-- sessions_valid_from is refused at verification time. Setting the column to
-- NOW() therefore signs the user out everywhere, on every device.
--
-- Password reset sets this. Someone resetting because they believe their
-- account is compromised must not leave a live session behind for whoever
-- compromised it.
--
-- Deliberately NULLable with no default: NULL means "no cutoff", so applying
-- this migration does not sign out every existing session on deploy. The column
-- only starts mattering the first time a user resets their password.
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE "user" ADD COLUMN IF NOT EXISTS sessions_valid_from TIMESTAMP(3);

COMMENT ON COLUMN "user".sessions_valid_from IS
  'Tokens issued before this instant are rejected. NULL means no cutoff.';
