-- Migration: 20260515003957_rename_conversion_columns_add_data_table
-- Created:   2026-05-15
-- Description: Rename payout_amount→payout and event_time→conversion_time on
--              visitor_conversions; create visitor_conversion_data table for
--              extended optional conversion fields.
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
  v_name text := '20260515003957_rename_conversion_columns_add_data_table';
BEGIN
  IF EXISTS (SELECT 1 FROM public.agent_migrations WHERE migration_name = v_name) THEN
    RAISE NOTICE 'Migration % already applied, skipping.', v_name;
    RETURN;
  END IF;

  -- ----------------------------------------------------------
  -- 1. Rename columns on visitor_conversions
  -- ----------------------------------------------------------
  EXECUTE $sql$
    ALTER TABLE public.visitor_conversions
      RENAME COLUMN payout_amount TO payout;
  $sql$;

  EXECUTE $sql$
    ALTER TABLE public.visitor_conversions
      RENAME COLUMN event_time TO conversion_time;
  $sql$;

  -- Rename the payout check constraint to match the new column name
  EXECUTE $sql$
    ALTER TABLE public.visitor_conversions
      RENAME CONSTRAINT visitor_conversions_payout_amount_check
                      TO visitor_conversions_payout_check;
  $sql$;

  -- ----------------------------------------------------------
  -- 2. Create visitor_conversion_data (1-to-1 with visitor_conversions)
  -- ----------------------------------------------------------
  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.visitor_conversion_data (
      visitor_conversion_id  bigint NOT NULL,
      event_time_unix        bigint,
      call_duration_seconds  numeric,
      city                   text,
      city_meta              text,
      currently_insured      boolean,
      hashed_birth_date      text,
      hashed_city_meta       text,
      hashed_email           text,
      hashed_first_name      text,
      hashed_last_name       text,
      hashed_phone_e164      text,
      hashed_phone_meta      text,
      homeowner              boolean,
      person_age             numeric,
      postal_state           text,
      referer_domain         text,
      subid                  text,
      vertical               text,
      zip_code               text,
      CONSTRAINT visitor_conversion_data_pkey
        PRIMARY KEY (visitor_conversion_id),
      CONSTRAINT visitor_conversion_data_visitor_conversion_id_fkey
        FOREIGN KEY (visitor_conversion_id)
        REFERENCES public.visitor_conversions(visitor_conversion_id)
        ON DELETE CASCADE
    );
  $sql$;

  -- Record migration
  INSERT INTO public.agent_migrations (migration_name) VALUES (v_name);
END;
$migration$;

COMMIT;
