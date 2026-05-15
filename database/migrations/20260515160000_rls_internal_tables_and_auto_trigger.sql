-- Migration: 20260515160000_rls_internal_tables_and_auto_trigger
-- Created:   2026-05-15
-- Description: Enable RLS on the 4 remaining unprotected tables
--              (agent_migrations, event_logs, expense_sync_logs,
--              visitor_conversion_data), fix the profiles self-update
--              policy so non-admin users can save their own timezone, and
--              install the rls_auto_enable event trigger so future tables
--              in the public schema are protected automatically.
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
  v_name text := '20260515160000_rls_internal_tables_and_auto_trigger';
BEGIN
  IF EXISTS (SELECT 1 FROM public.agent_migrations WHERE migration_name = v_name) THEN
    RAISE NOTICE 'Migration % already applied, skipping.', v_name;
    RETURN;
  END IF;

  -- ── 1. Enable RLS on internal / logging tables ──────────────────────────
  --
  -- None of these are queried by the app UI; service_role (used by backend
  -- workers) bypasses RLS automatically.  We add admin-read policies so that
  -- future admin tooling can inspect these tables via the anon key + JWT.

  EXECUTE $sql$ ALTER TABLE public.agent_migrations      ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.event_logs            ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.expense_sync_logs     ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.visitor_conversion_data ENABLE ROW LEVEL SECURITY; $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='agent_migrations' AND policyname='agent_migrations_admin_read') THEN
        CREATE POLICY "agent_migrations_admin_read" ON public.agent_migrations
          AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='event_logs' AND policyname='event_logs_admin_read') THEN
        CREATE POLICY "event_logs_admin_read" ON public.event_logs
          AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='expense_sync_logs' AND policyname='expense_sync_logs_admin_read') THEN
        CREATE POLICY "expense_sync_logs_admin_read" ON public.expense_sync_logs
          AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='visitor_conversion_data' AND policyname='visitor_conversion_data_admin_read') THEN
        CREATE POLICY "visitor_conversion_data_admin_read" ON public.visitor_conversion_data
          AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
      END IF;
    END; $p$;
  $sql$;

  -- ── 2. Fix profiles self-update ──────────────────────────────────────────
  --
  -- The existing profiles_admin_write policy (FOR ALL … USING is_admin())
  -- blocks UPDATE for non-admin authenticated users.  AuthContext.tsx lets
  -- any logged-in user save their timezone preference via
  --   supabase.from("profiles").update({timezone}).eq("user_id", user.id)
  -- which currently silently fails for managers and viewers.
  -- This policy adds a scoped UPDATE that allows each user to update their
  -- own row only, without granting any broader write access.

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_self_update') THEN
        CREATE POLICY "profiles_self_update" ON public.profiles
          AS PERMISSIVE FOR UPDATE TO authenticated
          USING (user_id = auth.uid())
          WITH CHECK (user_id = auth.uid());
      END IF;
    END; $p$;
  $sql$;

  -- ── 3. Auto-enable RLS event trigger ────────────────────────────────────
  --
  -- Automatically enables RLS on any new table created in the public schema,
  -- preventing future tables from being left unprotected.
  -- Exact SQL supplied by Supabase advisor (reproduced verbatim).

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION rls_auto_enable()
    RETURNS EVENT_TRIGGER
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog
    AS $fn$
    DECLARE
      cmd record;
    BEGIN
      FOR cmd IN
        SELECT *
        FROM pg_event_trigger_ddl_commands()
        WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
          AND object_type IN ('table','partitioned table')
      LOOP
        IF cmd.schema_name IS NOT NULL
           AND cmd.schema_name IN ('public')
           AND cmd.schema_name NOT IN ('pg_catalog','information_schema')
           AND cmd.schema_name NOT LIKE 'pg_toast%'
           AND cmd.schema_name NOT LIKE 'pg_temp%'
        THEN
          BEGIN
            EXECUTE format('alter table if exists %s enable row level security',
                           cmd.object_identity);
            RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
          EXCEPTION
            WHEN OTHERS THEN
              RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
          END;
        ELSE
          RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)',
                    cmd.object_identity, cmd.schema_name;
        END IF;
      END LOOP;
    END;
    $fn$;
  $sql$;

  EXECUTE $sql$ DROP EVENT TRIGGER IF EXISTS ensure_rls; $sql$;

  EXECUTE $sql$
    CREATE EVENT TRIGGER ensure_rls
      ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      EXECUTE FUNCTION rls_auto_enable();
  $sql$;

  -- Record migration
  INSERT INTO public.agent_migrations (migration_name) VALUES (v_name);
END;
$migration$;

COMMIT;
