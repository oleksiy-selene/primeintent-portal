-- Migration: 20260515171747_drop_conversion_time_unix_column
-- Created:   2026-05-15
-- Description: Drop the event_time_unix column from visitor_conversion_data.
--              (Reconstructed from dev schema — original file was not committed.)
--
-- Apply to an environment:
--   Option A: Supabase dashboard → SQL Editor → paste and run
--   Option B: psql <connection-string> -f <this-file>
--
-- Idempotency: the DO block checks public.agent_migrations and exits
-- early if this migration was already applied.

BEGIN;

-- Ensure migration tracking table exists (always safe)
CREATE TABLE IF NOT EXISTS public.agent_migrations (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  migration_name text NOT NULL UNIQUE,
  applied_at     timestamptz DEFAULT now() NOT NULL
);

DO $migration$
DECLARE
  v_name text := '20260515171747_drop_conversion_time_unix_column';
BEGIN
  IF EXISTS (SELECT 1 FROM public.agent_migrations WHERE migration_name = v_name) THEN
    RAISE NOTICE 'Migration % already applied, skipping.', v_name;
    RETURN;
  END IF;

  EXECUTE $sql$
    ALTER TABLE public.visitor_conversion_data
      DROP COLUMN IF EXISTS event_time_unix;
  $sql$;

  INSERT INTO public.agent_migrations (migration_name) VALUES (v_name);
END;
$migration$;

COMMIT;
