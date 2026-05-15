-- Migration: 20260514000000_initial_schema
-- Created:   2026-05-14
-- Description: Full initial schema — tables, functions, RLS policies, indexes, seed data.
--
-- Apply to an environment:
--   Option A: Supabase dashboard → SQL Editor → paste and run
--   Option B: psql <connection-string> -f <this-file>
--
-- Idempotency: the DO block checks public.agent_migrations and exits early
-- if this migration was already applied. All DDL uses IF NOT EXISTS / OR REPLACE
-- guards, and policies are checked against pg_policies before creation.

BEGIN;

-- ============================================================
-- Step 1: Ensure migration tracking table exists (always safe)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agent_migrations (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  migration_name text NOT NULL UNIQUE,
  applied_at     timestamptz DEFAULT now() NOT NULL
);

-- ============================================================
-- Step 2: Idempotency guard + migration body
-- ============================================================
DO $migration$
DECLARE
  v_name text := '20260514000000_initial_schema';
BEGIN
  IF EXISTS (SELECT 1 FROM public.agent_migrations WHERE migration_name = v_name) THEN
    RAISE NOTICE 'Migration % already applied, skipping.', v_name;
    RETURN;
  END IF;

  -- ----------------------------------------------------------
  -- Functions (before tables that use them in policies)
  -- ----------------------------------------------------------
  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.handle_new_user()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path TO 'public'
    AS $fn$
    BEGIN
      INSERT INTO public.profiles (user_id, email, role, display_name)
      VALUES (
        NEW.id,
        NEW.email,
        'viewer',
        NEW.raw_user_meta_data->>'display_name'
      )
      ON CONFLICT (user_id) DO UPDATE
        SET email = EXCLUDED.email;
      RETURN NEW;
    END;
    $fn$;
  $sql$;

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.handle_user_signin()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
     SET search_path TO 'public'
    AS $fn$
    BEGIN
      IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
        UPDATE public.profiles
           SET last_sign_in_at = NEW.last_sign_in_at,
               email = NEW.email
         WHERE user_id = NEW.id;
      END IF;
      RETURN NEW;
    END;
    $fn$;
  $sql$;

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.is_admin()
     RETURNS boolean
     LANGUAGE sql
     STABLE SECURITY DEFINER
     SET search_path TO 'public'
    AS $fn$
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
         WHERE user_id = auth.uid() AND role = 'admin'
      );
    $fn$;
  $sql$;

  EXECUTE $sql$
    CREATE OR REPLACE FUNCTION public.is_manager_or_above()
     RETURNS boolean
     LANGUAGE sql
     STABLE SECURITY DEFINER
     SET search_path TO 'public'
    AS $fn$
      SELECT EXISTS (
        SELECT 1 FROM public.profiles
         WHERE user_id = auth.uid() AND role IN ('admin', 'manager')
      );
    $fn$;
  $sql$;

  -- ----------------------------------------------------------
  -- Tables (enum/lookup tables first, then FK-dependent tables)
  -- ----------------------------------------------------------

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_browser_family (
      browser_family_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name              text NOT NULL,
      CONSTRAINT enum_browser_family_pkey PRIMARY KEY (browser_family_id),
      CONSTRAINT enum_browser_family_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_campaign_status (
      campaign_status_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name               text NOT NULL,
      CONSTRAINT enum_campaign_status_pkey PRIMARY KEY (campaign_status_id),
      CONSTRAINT enum_campaign_status_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_conversion_status (
      conversion_status_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name                 text NOT NULL,
      CONSTRAINT enum_conversion_status_pkey PRIMARY KEY (conversion_status_id),
      CONSTRAINT enum_conversion_status_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_device_type (
      device_type_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name           text NOT NULL,
      CONSTRAINT enum_device_type_pkey PRIMARY KEY (device_type_id),
      CONSTRAINT enum_device_type_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_expense_type (
      expense_type_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name            text NOT NULL,
      CONSTRAINT enum_expense_type_pkey PRIMARY KEY (expense_type_id),
      CONSTRAINT enum_expense_type_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_os_family (
      os_family_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name         text NOT NULL,
      CONSTRAINT enum_os_family_pkey PRIMARY KEY (os_family_id),
      CONSTRAINT enum_os_family_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_partner_status (
      partner_status_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name              text NOT NULL,
      CONSTRAINT enum_partner_status_pkey PRIMARY KEY (partner_status_id),
      CONSTRAINT enum_partner_status_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.enum_partner_type (
      partner_type_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
      name            text NOT NULL,
      CONSTRAINT enum_partner_type_pkey PRIMARY KEY (partner_type_id),
      CONSTRAINT enum_partner_type_name_key UNIQUE (name)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.profiles (
      user_id         uuid NOT NULL,
      email           text NOT NULL,
      display_name    text,
      role            text DEFAULT 'viewer' NOT NULL,
      last_sign_in_at timestamp with time zone,
      created_at      timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      timezone        text DEFAULT 'America/New_York' NOT NULL,
      CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
      CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin'::text, 'manager'::text, 'viewer'::text])),
      CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
    );
  $sql$;

  EXECUTE $sql$ CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email); $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.partners (
      partner_id        bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      partner_uid       uuid DEFAULT gen_random_uuid() NOT NULL,
      name              text NOT NULL,
      partner_type_id   smallint NOT NULL,
      created_at        timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      postback_url      text,
      partner_status_id smallint DEFAULT 1 NOT NULL,
      CONSTRAINT partners_pkey PRIMARY KEY (partner_id),
      CONSTRAINT partners_partner_uid_key UNIQUE (partner_uid),
      CONSTRAINT partners_partner_status_id_fkey FOREIGN KEY (partner_status_id) REFERENCES public.enum_partner_status(partner_status_id),
      CONSTRAINT partners_partner_type_id_fkey FOREIGN KEY (partner_type_id) REFERENCES public.enum_partner_type(partner_type_id)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.campaigns (
      campaign_id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      campaign_uid         uuid DEFAULT gen_random_uuid() NOT NULL,
      partner_id           bigint NOT NULL,
      campaign_external_id text,
      campaign_status_id   smallint NOT NULL,
      name                 text NOT NULL,
      description          text,
      origin               text NOT NULL,
      channel              text NOT NULL,
      created_at           timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      updated_at           timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      CONSTRAINT campaigns_pkey PRIMARY KEY (campaign_id),
      CONSTRAINT campaigns_campaign_uid_key UNIQUE (campaign_uid),
      CONSTRAINT campaigns_campaign_status_id_fkey FOREIGN KEY (campaign_status_id) REFERENCES public.enum_campaign_status(campaign_status_id),
      CONSTRAINT campaigns_partner_id_fkey FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.campaign_expenses (
      campaign_expense_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      campaign_id         bigint NOT NULL,
      expense_type_id     smallint NOT NULL,
      start_time          timestamp with time zone NOT NULL,
      end_time            timestamp with time zone NOT NULL,
      amount              numeric NOT NULL,
      created_at          timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      updated_at          timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      CONSTRAINT campaign_expenses_pkey PRIMARY KEY (campaign_expense_id),
      CONSTRAINT campaign_expenses_campaign_id_expense_type_id_start_time_en_key
        UNIQUE (campaign_id, expense_type_id, start_time, end_time),
      CONSTRAINT campaign_expenses_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(campaign_id),
      CONSTRAINT campaign_expenses_expense_type_id_fkey FOREIGN KEY (expense_type_id) REFERENCES public.enum_expense_type(expense_type_id)
    );
  $sql$;

  EXECUTE $sql$ CREATE INDEX IF NOT EXISTS idx_campaign_expenses_campaign_start ON public.campaign_expenses USING btree (campaign_id, start_time); $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.visitors (
      visitor_id        bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      visitor_uid       uuid DEFAULT gen_random_uuid() NOT NULL,
      campaign_id       bigint NOT NULL,
      external_click_id text,
      subid1            text,
      subid2            text,
      subid3            text,
      subid4            text,
      created_at        timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      ip_address        inet NOT NULL,
      user_agent        text NOT NULL,
      device_type_id    smallint,
      browser_family_id smallint,
      os_family_id      smallint,
      referrer_url      text,
      landing_page_url  text,
      utm_source        text,
      utm_medium        text,
      utm_campaign      text,
      utm_content       text,
      utm_term          text,
      geo_state         character(2),
      geo_country       character(2),
      is_bot            boolean DEFAULT false NOT NULL,
      extra_data        jsonb,
      CONSTRAINT visitors_pkey PRIMARY KEY (visitor_id),
      CONSTRAINT visitors_visitor_uid_key UNIQUE (visitor_uid),
      CONSTRAINT visitors_campaign_id_fkey FOREIGN KEY (campaign_id) REFERENCES public.campaigns(campaign_id),
      CONSTRAINT visitors_browser_family_id_fkey FOREIGN KEY (browser_family_id) REFERENCES public.enum_browser_family(browser_family_id),
      CONSTRAINT visitors_device_type_id_fkey FOREIGN KEY (device_type_id) REFERENCES public.enum_device_type(device_type_id),
      CONSTRAINT visitors_os_family_id_fkey FOREIGN KEY (os_family_id) REFERENCES public.enum_os_family(os_family_id)
    );
  $sql$;

  EXECUTE $sql$
    CREATE INDEX IF NOT EXISTS idx_visitors_campaign_created  ON public.visitors USING btree (campaign_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_visitors_campaign_id       ON public.visitors USING btree (campaign_id);
    CREATE INDEX IF NOT EXISTS idx_visitors_created_at        ON public.visitors USING btree (created_at);
    CREATE INDEX IF NOT EXISTS idx_visitors_external_click_id ON public.visitors USING btree (external_click_id);
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.visitor_conversions (
      visitor_conversion_id  bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      visitor_conversion_uid uuid DEFAULT gen_random_uuid() NOT NULL,
      visitor_id             bigint NOT NULL,
      payout_amount          numeric NOT NULL,
      conversion_status_id   smallint NOT NULL,
      external_conversion_id text,
      event_time             timestamp with time zone,
      created_at             timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      CONSTRAINT visitor_conversions_pkey PRIMARY KEY (visitor_conversion_id),
      CONSTRAINT visitor_conversions_visitor_conversion_uid_key UNIQUE (visitor_conversion_uid),
      CONSTRAINT visitor_conversions_payout_amount_check CHECK (payout_amount >= 0),
      CONSTRAINT visitor_conversions_conversion_status_id_fkey FOREIGN KEY (conversion_status_id) REFERENCES public.enum_conversion_status(conversion_status_id),
      CONSTRAINT visitor_conversions_visitor_id_fkey FOREIGN KEY (visitor_id) REFERENCES public.visitors(visitor_id)
    );
  $sql$;

  EXECUTE $sql$
    CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_conversion_idempotency
      ON public.visitor_conversions USING btree (visitor_id, external_conversion_id)
      WHERE external_conversion_id IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_visitor_conversions_visitor_id
      ON public.visitor_conversions USING btree (visitor_id);
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.event_logs (
      event_log_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      type         text,
      payload      jsonb,
      message      text,
      created_at   timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      CONSTRAINT event_logs_pkey PRIMARY KEY (event_log_id)
    );
  $sql$;

  EXECUTE $sql$
    CREATE TABLE IF NOT EXISTS public.expense_sync_logs (
      expense_sync_log_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
      started_at          timestamp with time zone,
      completed_at        timestamp with time zone,
      status              text,
      last_synced_hour    timestamp with time zone,
      error_message       text,
      created_at          timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
      CONSTRAINT expense_sync_logs_pkey PRIMARY KEY (expense_sync_log_id)
    );
  $sql$;

  -- ----------------------------------------------------------
  -- Row Level Security
  -- ----------------------------------------------------------
  EXECUTE $sql$ ALTER TABLE public.campaign_expenses    ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.campaigns            ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_browser_family  ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_campaign_status  ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_conversion_status ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_device_type     ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_expense_type    ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_os_family       ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_partner_status  ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.enum_partner_type    ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.partners             ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.visitor_conversions  ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$ ALTER TABLE public.visitors             ENABLE ROW LEVEL SECURITY; $sql$;

  -- Policies — guarded with pg_policies existence check (CREATE POLICY has no IF NOT EXISTS)
  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaign_expenses' AND policyname='campaign_expenses_read') THEN
        CREATE POLICY "campaign_expenses_read" ON public.campaign_expenses AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns' AND policyname='campaigns_manager_write') THEN
        CREATE POLICY "campaigns_manager_write" ON public.campaigns AS PERMISSIVE FOR ALL TO authenticated USING (is_manager_or_above()) WITH CHECK (is_manager_or_above());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='campaigns' AND policyname='campaigns_read') THEN
        CREATE POLICY "campaigns_read" ON public.campaigns AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_browser_family' AND policyname='enum_browser_family_read') THEN
        CREATE POLICY "enum_browser_family_read" ON public.enum_browser_family AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_campaign_status' AND policyname='enum_campaign_status_read') THEN
        CREATE POLICY "enum_campaign_status_read" ON public.enum_campaign_status AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_conversion_status' AND policyname='enum_conversion_status_read') THEN
        CREATE POLICY "enum_conversion_status_read" ON public.enum_conversion_status AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_device_type' AND policyname='enum_device_type_read') THEN
        CREATE POLICY "enum_device_type_read" ON public.enum_device_type AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_expense_type' AND policyname='enum_expense_type_read') THEN
        CREATE POLICY "enum_expense_type_read" ON public.enum_expense_type AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_os_family' AND policyname='enum_os_family_read') THEN
        CREATE POLICY "enum_os_family_read" ON public.enum_os_family AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_partner_status' AND policyname='enum_partner_status_read') THEN
        CREATE POLICY "enum_partner_status_read" ON public.enum_partner_status AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='enum_partner_type' AND policyname='enum_partner_type_read') THEN
        CREATE POLICY "enum_partner_type_read" ON public.enum_partner_type AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='partners' AND policyname='partners_manager_write') THEN
        CREATE POLICY "partners_manager_write" ON public.partners AS PERMISSIVE FOR ALL TO authenticated USING (is_manager_or_above()) WITH CHECK (is_manager_or_above());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='partners' AND policyname='partners_read') THEN
        CREATE POLICY "partners_read" ON public.partners AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_admin_write') THEN
        CREATE POLICY "profiles_admin_write" ON public.profiles AS PERMISSIVE FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='profiles' AND policyname='profiles_read') THEN
        CREATE POLICY "profiles_read" ON public.profiles AS PERMISSIVE FOR SELECT TO authenticated USING ((user_id = auth.uid()) OR is_admin());
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='visitor_conversions' AND policyname='visitor_conversions_read') THEN
        CREATE POLICY "visitor_conversions_read" ON public.visitor_conversions AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
    END; $p$;
  $sql$;

  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='visitors' AND policyname='visitors_read') THEN
        CREATE POLICY "visitors_read" ON public.visitors AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
    END; $p$;
  $sql$;

  -- ----------------------------------------------------------
  -- Seed data (enum tables + default partner and campaign)
  -- ----------------------------------------------------------
  EXECUTE $sql$
    INSERT INTO public.enum_browser_family (browser_family_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'Unknown'), (2, 'Chrome'), (3, 'Chrome Headless'),
      (4, 'Mobile Chrome'), (5, 'Mobile Safari'), (6, 'Firefox'), (7, 'Samsung Internet')
    ON CONFLICT (browser_family_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.enum_campaign_status (campaign_status_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'Active'), (2, 'Paused'), (3, 'Archived')
    ON CONFLICT (campaign_status_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.enum_conversion_status (conversion_status_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'pending'), (2, 'approved'), (3, 'rejected'), (4, 'reversed')
    ON CONFLICT (conversion_status_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.enum_device_type (device_type_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'Mobile'), (2, 'Desktop'), (3, 'Tablet'), (4, 'Bot')
    ON CONFLICT (device_type_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.enum_expense_type (expense_type_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'google_ads')
    ON CONFLICT (expense_type_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.enum_os_family (os_family_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'Unknown'), (2, 'macOS'), (3, 'Linux'),
      (4, 'Android'), (5, 'iOS'), (6, 'Chrome OS'), (7, 'Windows')
    ON CONFLICT (os_family_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.enum_partner_status (partner_status_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'Active'), (2, 'Inactive')
    ON CONFLICT (partner_status_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.enum_partner_type (partner_type_id, name) OVERRIDING SYSTEM VALUE VALUES
      (1, 'Internal'), (2, 'Affiliate')
    ON CONFLICT (partner_type_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.partners (partner_id, partner_uid, name, partner_type_id, postback_url, partner_status_id)
    OVERRIDING SYSTEM VALUE VALUES
      (1, '00000000-0000-0000-0000-000000000000', 'Default Partner', 2, 'https://test.com?cid={subid2}{click_id}', 1)
    ON CONFLICT (partner_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    INSERT INTO public.campaigns (campaign_id, campaign_uid, partner_id, campaign_external_id, campaign_status_id, name, description, origin, channel)
    OVERRIDING SYSTEM VALUE VALUES
      (3, '00000000-0000-0000-0000-000000000000', 1, NULL, 1, 'Default Campaign', NULL, 'test', 'test')
    ON CONFLICT (campaign_id) DO NOTHING;
  $sql$;

  EXECUTE $sql$
    SELECT setval('public.enum_browser_family_browser_family_id_seq',     (SELECT MAX(browser_family_id)    FROM public.enum_browser_family));
    SELECT setval('public.enum_campaign_status_campaign_status_id_seq',    (SELECT MAX(campaign_status_id)   FROM public.enum_campaign_status));
    SELECT setval('public.enum_conversion_status_conversion_status_id_seq',(SELECT MAX(conversion_status_id) FROM public.enum_conversion_status));
    SELECT setval('public.enum_device_type_device_type_id_seq',            (SELECT MAX(device_type_id)       FROM public.enum_device_type));
    SELECT setval('public.enum_expense_type_expense_type_id_seq',          (SELECT MAX(expense_type_id)      FROM public.enum_expense_type));
    SELECT setval('public.enum_os_family_os_family_id_seq',                (SELECT MAX(os_family_id)         FROM public.enum_os_family));
    SELECT setval('public.enum_partner_status_partner_status_id_seq',      (SELECT MAX(partner_status_id)    FROM public.enum_partner_status));
    SELECT setval('public.enum_partner_type_partner_type_id_seq',          (SELECT MAX(partner_type_id)      FROM public.enum_partner_type));
    SELECT setval('public.partners_partner_id_seq',                        (SELECT MAX(partner_id)           FROM public.partners));
    SELECT setval('public.campaigns_campaign_id_seq',                      (SELECT MAX(campaign_id)          FROM public.campaigns));
  $sql$;

  -- ----------------------------------------------------------
  -- Record migration
  -- ----------------------------------------------------------
  INSERT INTO public.agent_migrations (migration_name) VALUES (v_name);

END;
$migration$;

COMMIT;
