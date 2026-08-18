-- ══════════════════════════════════════════════════════════════════════════
-- Default for updated_at
-- prisma/migrations/003_updated_at_defaults.sql
--
-- Run once via:  psql $DATABASE_URL -f prisma/migrations/003_updated_at_defaults.sql
--
-- 000_init_schema.sql declares every updated_at as NOT NULL with no default,
-- so any INSERT that does not name the column fails with a not-null violation.
-- Prisma's @updatedAt fills this in at the client layer, but the app talks to
-- Postgres directly through pg, so the default has to live in the database.
--
-- This only affects INSERTs. Keeping the value current on UPDATE remains the
-- caller's job (each UPDATE sets updated_at = NOW() explicitly).
-- ══════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
    target RECORD;
BEGIN
    FOR target IN
        SELECT table_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_name = 'updated_at'
          AND column_default IS NULL
    LOOP
        EXECUTE format(
            'ALTER TABLE %I ALTER COLUMN updated_at SET DEFAULT NOW()',
            target.table_name
        );
        RAISE NOTICE 'updated_at default set on %', target.table_name;
    END LOOP;
END $$;
