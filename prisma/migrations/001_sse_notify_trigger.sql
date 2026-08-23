-- ══════════════════════════════════════════════════════════════════════════
-- Postgres NOTIFY trigger setup
-- prisma/migrations/001_sse_notify_trigger.sql
--
-- Run once via:  psql $DATABASE_URL -f prisma/migrations/001_sse_notify_trigger.sql
-- Or add to your Prisma migration workflow.
--
-- This function fires pg_notify('app_changes', payload) after every
-- INSERT/UPDATE/DELETE on the listed tables.
-- ══════════════════════════════════════════════════════════════════════════

-- ── Shared notify function ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION notify_app_change()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  payload jsonb;
  row_id  text;
  tenant  text;
BEGIN
  -- Resolve the affected row
  IF (TG_OP = 'DELETE') THEN
    row_id := OLD.id;
    tenant := OLD.tenant_id;
  ELSE
    row_id := NEW.id;
    tenant := NEW.tenant_id;
  END IF;

  payload := jsonb_build_object(
    'table',    TG_TABLE_NAME,
    'action',   TG_OP,
    'tenantId', tenant,
    'id',       row_id,
    'ts',       (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::bigint
  );

  -- pg_notify payload is limited to 8000 bytes — the jsonb above is ~150 bytes.
  PERFORM pg_notify('app_changes', payload::text);
  RETURN NULL;
END;
$$;

-- ── Create triggers on relevant tables ──────────────────────────────────────
-- Adjust the table list to match your schema.

DO $$
DECLARE
  tbl text;
  tables text[] := ARRAY[
    'member', 'lead', 'offering', 'prayer_request',
    'service', 'communication', 'internal_message'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_notify_%1$s ON "%1$s";
       CREATE TRIGGER trg_notify_%1$s
       AFTER INSERT OR UPDATE OR DELETE ON "%1$s"
       FOR EACH ROW EXECUTE FUNCTION notify_app_change();',
      tbl
    );
  END LOOP;
END;
$$;
