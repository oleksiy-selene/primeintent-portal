-- table: profiles
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.profiles (
  user_id         uuid NOT NULL,
  email           text NOT NULL,
  display_name    text,
  role            text DEFAULT 'viewer' NOT NULL,
  last_sign_in_at timestamp with time zone,
  created_at      timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  timezone        text DEFAULT 'America/New_York' NOT NULL,
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_role_check CHECK (role = ANY (ARRAY['admin', 'manager', 'viewer'])),
  CONSTRAINT profiles_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles USING btree (email);
