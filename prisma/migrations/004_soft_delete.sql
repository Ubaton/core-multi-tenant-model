-- ══════════════════════════════════════════════════════════════════════════
-- Soft delete for tenant and "user"
-- prisma/migrations/004_soft_delete.sql
--
-- Run once via:  psql $DATABASE_URL -f prisma/migrations/004_soft_delete.sql
--
-- A Super Admin deleting a tenant or a user must not destroy the record: the
-- row is retained so the audit trail stays resolvable, but it is hidden from
-- every UI listing. deleted_at NULL means "live"; any timestamp means deleted.
-- deleted_by records which Super Admin performed the deletion.
--
-- Deliberately NOT touching the unique constraints on user.email and
-- tenant.slug: a deleted record still owns its email/slug, so reusing one is
-- rejected rather than silently colliding with a retained row.
-- ══════════════════════════════════════════════════════════════════════════

ALTER TABLE tenant  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);
ALTER TABLE tenant  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

ALTER TABLE "user"  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP(3);
ALTER TABLE "user"  ADD COLUMN IF NOT EXISTS deleted_by TEXT;

-- Partial indexes: every listing filters on "deleted_at IS NULL", so only the
-- live rows need to be indexed.
CREATE INDEX IF NOT EXISTS tenant_deleted_at_idx ON tenant (deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS user_deleted_at_idx   ON "user" (deleted_at) WHERE deleted_at IS NULL;
