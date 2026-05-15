-- table: agent_migrations
-- pulled from dev: 2026-05-14T18:10:00Z

CREATE TABLE IF NOT EXISTS public.agent_migrations (
  id             bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  migration_name text NOT NULL,
  applied_at     timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT agent_migrations_pkey PRIMARY KEY (id),
  CONSTRAINT agent_migrations_migration_name_key UNIQUE (migration_name)
);
