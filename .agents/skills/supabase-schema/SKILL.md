---
name: supabase-schema
description: Manage Supabase database schema changes safely using the Management API. Use when starting any task that requires schema changes, when you need to pull the current schema locally, or when you need to create and apply a migration. Also use when asked to seed the database, update seed data, or reset the dev database to a clean state. Never modifies production — only the user runs migrations on production.
---

# Supabase Schema Skill

Manages database schema and seed data for Supabase without relying on git submodules, Docker, or the Supabase CLI. Uses the Supabase Management API to read schema from and apply migrations to the **dev** database. The names of the required environment variables are configured in `config.json` (not hardcoded) so the skill works in any project regardless of naming conventions.

## Config

Project configuration is stored in `.agents/skills/supabase-schema/config.json`:

```json
{
  "production_project_ref": "cbmdldxphadvjbydeiqq",
  "supabase_url_env_var_name": "<name of the env var holding the Supabase project URL>",
  "supabase_access_token_env_var_name": "<name of the env var holding the personal access token>",
  "migration_tracking_table": "agent_migrations",
  "latest_schema_dir": "database/latest-schema",
  "migrations_dir": "database/migrations",
  "seed_file": "database/seed.sql"
}
```

- `supabase_url_env_var_name` — the **name** of the env var whose value is the Supabase project URL (`https://<ref>.supabase.co`). The dev project ref is extracted from this URL at runtime.
- `supabase_access_token_env_var_name` — the **name** of the env var whose value is the Supabase personal access token (create one at supabase.com/dashboard/account/tokens).

**Always read `config.json` first** to get the correct env var names before running any commands. Derive the credentials like this:

```bash
# Read env var names from config.json
URL_VAR=$(jq -r .supabase_url_env_var_name .agents/skills/supabase-schema/config.json)
TOKEN_VAR=$(jq -r .supabase_access_token_env_var_name .agents/skills/supabase-schema/config.json)
# Resolve values at runtime
DEV_REF=$(printenv "$URL_VAR" | sed -E 's|https?://([^.]+)\.supabase\.co.*|\1|')
ACCESS_TOKEN=$(printenv "$TOKEN_VAR")
```

The production ref (`cbmdldxphadvjbydeiqq`) is used **only** for read-only schema inspection when explicitly comparing dev vs production. All write operations (migrations, seeds, resets) target dev only.

## Directory Layout

```
database/
  seed.sql             ← canonical seed file (enum tables + default partner/campaign)
  latest-schema/
    tables/            ← one .sql per table
    views/             ← one .sql per view
    functions/         ← one .sql per function
    triggers/          ← one .sql per trigger
    policies/          ← one .sql per table's RLS policies
    types/             ← custom types and enums
  migrations/
    YYYYMMDDHHMMSS_<description>.sql
```

## Querying the Database

```bash
# Resolve credentials (env var names come from config.json)
URL_VAR=$(jq -r .supabase_url_env_var_name .agents/skills/supabase-schema/config.json)
TOKEN_VAR=$(jq -r .supabase_access_token_env_var_name .agents/skills/supabase-schema/config.json)
DEV_REF=$(printenv "$URL_VAR" | sed -E 's|https?://([^.]+)\.supabase\.co.*|\1|')
ACCESS_TOKEN=$(printenv "$TOKEN_VAR")

# Read from dev (schema inspection, migration checks)
curl -s -X POST "https://api.supabase.com/v1/projects/${DEV_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"<SQL>\"}"

# Read from production (schema comparison only — never write)
PROD_REF="cbmdldxphadvjbydeiqq"
curl -s -X POST "https://api.supabase.com/v1/projects/${PROD_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"<SQL>\"}"
```

For multi-statement SQL (BEGIN…COMMIT), use Node to JSON-escape:

```bash
# Resolve credentials (env var names come from config.json)
URL_VAR=$(jq -r .supabase_url_env_var_name .agents/skills/supabase-schema/config.json)
TOKEN_VAR=$(jq -r .supabase_access_token_env_var_name .agents/skills/supabase-schema/config.json)
DEV_REF=$(printenv "$URL_VAR" | sed -E 's|https?://([^.]+)\.supabase\.co.*|\1|')
ACCESS_TOKEN=$(printenv "$TOKEN_VAR")

node -e "
const sql = \`BEGIN;
  -- statements here
COMMIT;\`;
console.log(JSON.stringify({query: sql}));
" | curl -s -X POST "https://api.supabase.com/v1/projects/${DEV_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @-
```

For migration files on disk:

```bash
# Resolve credentials (env var names come from config.json)
URL_VAR=$(jq -r .supabase_url_env_var_name .agents/skills/supabase-schema/config.json)
TOKEN_VAR=$(jq -r .supabase_access_token_env_var_name .agents/skills/supabase-schema/config.json)
DEV_REF=$(printenv "$URL_VAR" | sed -E 's|https?://([^.]+)\.supabase\.co.*|\1|')
ACCESS_TOKEN=$(printenv "$TOKEN_VAR")

node -e "
const fs = require('fs');
const sql = fs.readFileSync('database/migrations/<file>.sql', 'utf8');
console.log(JSON.stringify({query: sql}));
" | curl -s -X POST "https://api.supabase.com/v1/projects/${DEV_REF}/database/query" \
  -H "Authorization: Bearer ${ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @-
```

All schema extraction SQL is in `.agents/skills/supabase-schema/schema-queries.md`.

---

## Action: pull-schema

**When to run:** At the start of any task that may involve schema changes, or to sync local files with the current dev state.

**Source: dev database** (URL resolved via `supabase_url_env_var_name` from `config.json`)

**Steps:**

1. Query **dev** for each object type (queries in `schema-queries.md`).
2. Write one file per object into `database/latest-schema/<type>/`.
3. Compare with previous versions — report any differences as **schema drift** and ask the user whether to write a migration capturing them.
4. **RLS audit** — after pulling, run this query and report any findings as schema drift requiring immediate remediation:

```sql
SELECT t.tablename
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'public'
  AND (t.rowsecurity = false OR p.policyname IS NULL)
GROUP BY t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

Any table returned is either missing RLS entirely (`rowsecurity = false`) or has RLS enabled but no policies (locked out). Both states are errors. Create a migration to fix them before proceeding.

**Table DDL file format** (`database/latest-schema/tables/<table>.sql`):

```sql
-- table: <table_name>
-- pulled from dev: <ISO timestamp>

CREATE TABLE IF NOT EXISTS public.<table_name> (
  <col> <type> [GENERATED ALWAYS AS IDENTITY] [NOT NULL] [DEFAULT <expr>],
  ...
  CONSTRAINT <pk>  PRIMARY KEY (<cols>),
  CONSTRAINT <fk>  FOREIGN KEY (<col>) REFERENCES public.<ref>(<col>),
  CONSTRAINT <uq>  UNIQUE (<cols>),
  CONSTRAINT <ck>  CHECK (<expr>)
);

-- Indexes
<CREATE [UNIQUE] INDEX IF NOT EXISTS ...>;
```

For functions and triggers, write the raw `pg_get_functiondef()` / `pg_get_triggerdef()` output with a header comment. For policies, reconstruct `CREATE POLICY` statements from `pg_policies` columns.

---

## Action: create-initial-migration

**When to run:** Once, to establish the schema baseline from the current dev database state.

**Steps:**

1. Run **pull-schema** to populate `database/latest-schema/` from dev.
2. Generate `database/migrations/<timestamp>_initial_schema.sql` using the **Migration File Format with In-SQL Idempotency Guard** (see below).
   - Full `CREATE TABLE IF NOT EXISTS` for every table (constraints + indexes) via `EXECUTE`
   - All functions via `CREATE OR REPLACE FUNCTION` via `EXECUTE`
   - `ALTER TABLE … ENABLE ROW LEVEL SECURITY` + all `CREATE POLICY` statements via `EXECUTE`
   - Contents of `database/seed.sql` (enum tables + default partner/campaign) via `EXECUTE`
3. Apply to dev: `node -e … | curl …` using the migration file.
4. Verify by querying `agent_migrations` in dev.
5. Tell the user: _"Initial migration at `database/migrations/<file>`. Apply to production when ready."_

---

## Action: create-migration

**When to run:** Before implementing any feature that requires a schema change.

**Steps:**

1. Run **pull-schema** to ensure local files are current (includes RLS audit).
2. Write the migration SQL using the **Migration File Format with In-SQL Idempotency Guard** (see below).
3. **RLS requirement** — every `CREATE TABLE` in the migration body **must** be immediately followed by:
   - `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;`
   - At least one `CREATE POLICY` statement appropriate for the table's access pattern (see **RLS Policy Patterns** below).
   - A new `database/latest-schema/policies/<table>.sql` file must be created or updated to reflect these policies.
   - Do **not** rely on the `rls_auto_enable` event trigger as a substitute — always include the `ALTER TABLE … ENABLE ROW LEVEL SECURITY` explicitly in the migration.
4. Save as `database/migrations/<YYYYMMDDHHMMSS>_<short_description>.sql` (`date -u +%Y%m%d%H%M%S`).
5. Apply to dev: `node -e … | curl …` using the migration file.
6. On success, update affected `database/latest-schema/` files to reflect the new state.
7. Tell the user: _"Migration `<name>` applied to dev. Run it on production when ready."_

**Never apply migrations to production.**

---

## RLS Policy Patterns

Choose the pattern that matches the table's intended access. All use the `is_admin()` and `is_manager_or_above()` helper functions already defined in the schema.

**App data — authenticated read, manager/admin write** (e.g. partners, campaigns):
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_read" ON public.<table>
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "<table>_manager_write" ON public.<table>
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_manager_or_above()) WITH CHECK (is_manager_or_above());
```

**App data — authenticated read, admin write** (e.g. profiles):
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_read" ON public.<table>
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);
CREATE POLICY "<table>_admin_write" ON public.<table>
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
```

**Lookup / enum tables — authenticated read-only**:
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_read" ON public.<table>
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);
```

**Internal / logging tables — admin read, service-role writes** (e.g. event_logs, expense_sync_logs):
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_admin_read" ON public.<table>
  AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
-- No write policy needed: backend workers use service_role, which bypasses RLS.
```

**Per-user data — user reads/updates their own row only** (e.g. user settings):
```sql
ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
CREATE POLICY "<table>_self_read" ON public.<table>
  AS PERMISSIVE FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "<table>_self_update" ON public.<table>
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
```

If none of these patterns fit the new table exactly, document the reasoning in the migration file comment and pick the most restrictive pattern that still allows the required access.

---

## Migration File Format with In-SQL Idempotency Guard

Every migration must self-check `public.agent_migrations` and skip its body if already applied. Use this exact structure:

```sql
-- Migration: <timestamp>_<description>
-- Created:   <ISO date>
-- Description: <one-line summary>
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
  v_name text := '<timestamp>_<description>';
BEGIN
  IF EXISTS (SELECT 1 FROM public.agent_migrations WHERE migration_name = v_name) THEN
    RAISE NOTICE 'Migration % already applied, skipping.', v_name;
    RETURN;
  END IF;

  -- DDL via EXECUTE (required inside DO blocks)
  EXECUTE $sql$ CREATE TABLE IF NOT EXISTS public.<table> (...); $sql$;
  EXECUTE $sql$ CREATE INDEX IF NOT EXISTS ...; $sql$;

  -- ── RLS (required for every new table) ─────────────────────────────────
  -- Choose the policy pattern from the "RLS Policy Patterns" section that
  -- matches this table's access model. Never omit this block.
  EXECUTE $sql$ ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY; $sql$;
  EXECUTE $sql$
    DO $p$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='<table>' AND policyname='<table>_read') THEN
        CREATE POLICY "<table>_read" ON public.<table>
          AS PERMISSIVE FOR SELECT TO authenticated USING (true);
      END IF;
      -- add write policy here if required by the access pattern
    END; $p$;
  $sql$;
  -- ───────────────────────────────────────────────────────────────────────

  -- Record this migration (runs only when body was not skipped)
  INSERT INTO public.agent_migrations (migration_name) VALUES (v_name);
END;
$migration$;

COMMIT;
```

**Key rules for the DO block:**
- All DDL (`CREATE`, `ALTER`, `CREATE INDEX`, `CREATE POLICY`) must be wrapped in `EXECUTE $sql$ … $sql$;`
- Use `IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT DO NOTHING` guards on every statement
- `RETURN` inside a DO block exits only the block, not the transaction — `COMMIT` always runs
- The `INSERT INTO agent_migrations` must be the **last statement** inside the DO block (before `END`)
- Use nested dollar-quoting for function bodies: outer `$sql$…$sql$`, inner `$fn$…$fn$`
- Every `CREATE TABLE` must be followed by its RLS block (see **RLS Policy Patterns**)

---

## Action: update-seed

**When to run:** When seed data in dev has changed (new enum values, new default partner/campaign), or when asked to refresh `database/seed.sql`.

**Steps:**

1. Query **dev** for the current contents of all seed tables.
2. Rebuild `database/seed.sql` from scratch using the live data.
3. Report what changed vs the previous file.

**Seed tables and their queries (run against dev):**

```sql
-- enum tables (query each one)
SELECT <id_col>, name FROM public.<enum_table> ORDER BY <id_col>;

-- partners (only explicitly seeded rows)
SELECT partner_id, partner_uid, name, partner_type_id, postback_url, partner_status_id
FROM public.partners
WHERE partner_uid = '00000000-0000-0000-0000-000000000000'
ORDER BY partner_id;

-- campaigns (only the default all-zeros campaign)
SELECT campaign_id, campaign_uid, partner_id, campaign_external_id,
       campaign_status_id, name, description, origin, channel
FROM public.campaigns
WHERE campaign_uid = '00000000-0000-0000-0000-000000000000'
ORDER BY campaign_id;
```

**seed.sql format:**

```sql
-- =============================================================================
-- seed.sql
--
-- Reference data: enum tables + default partner and campaign.
-- Apply to a fresh dev database after running all migrations.
--
-- IDs are inserted explicitly (OVERRIDING SYSTEM VALUE) so foreign key
-- references remain stable across environments.
-- Last updated from dev: <ISO timestamp>
-- =============================================================================

-- <enum inserts — OVERRIDING SYSTEM VALUE, ON CONFLICT DO NOTHING>

-- partners (before campaigns — FK dependency)
INSERT INTO public.partners (...)
OVERRIDING SYSTEM VALUE VALUES (...)
ON CONFLICT (partner_id) DO NOTHING;

-- campaigns
INSERT INTO public.campaigns (...)
OVERRIDING SYSTEM VALUE VALUES (...)
ON CONFLICT (campaign_id) DO NOTHING;

-- Reset sequences
SELECT setval('public.<table>_<id>_seq', (SELECT MAX(<id>) FROM public.<table>));
```

---

## Action: reset-dev

**When to run:** When asked to wipe and re-seed the dev database from scratch.

**⚠️ This deletes all application data in dev. Always confirm with the user before running.**

**Steps:**

1. Confirm with the user: _"This will delete all rows from all application tables in dev and re-apply the seed data. Proceed?"_ — stop if they say no.
2. Truncate all application tables in dependency order with `RESTART IDENTITY CASCADE`:

```sql
TRUNCATE TABLE
  public.visitor_conversions,
  public.visitors,
  public.campaign_expenses,
  public.campaigns,
  public.partners,
  public.event_logs,
  public.expense_sync_logs,
  public.enum_browser_family,
  public.enum_campaign_status,
  public.enum_conversion_status,
  public.enum_device_type,
  public.enum_expense_type,
  public.enum_os_family,
  public.enum_partner_status,
  public.enum_partner_type
RESTART IDENTITY CASCADE;
```

Do **not** truncate `public.profiles` (user accounts) or `public.agent_migrations` (migration history).

3. Read `database/seed.sql` and apply it to dev in a single query call.
4. Verify the seed applied correctly:

```sql
SELECT
  (SELECT COUNT(*) FROM public.enum_conversion_status)  AS enum_conversion_status,
  (SELECT COUNT(*) FROM public.partners)                AS partners,
  (SELECT COUNT(*) FROM public.campaigns)               AS campaigns;
```

5. Report: _"Dev database reset. Row counts: enum_conversion_status=N, partners=N, campaigns=N."_

---

## Safety Rules

1. **Dev is the source of truth** — all `pull-schema` operations read from dev (URL from `supabase_url_env_var_name`). Production is read-only and only consulted for explicit comparisons.
2. **Production is read-only** — never send DDL, DML, or seed inserts to the production ref.
3. **Migrations self-guard** — every migration file must include the DO-block idempotency check against `public.agent_migrations`. The migration body must only run when not already recorded.
4. **reset-dev is dev-only** — always confirm before truncating; never run against production.
5. **Pull before you migrate** — run `pull-schema` (from dev) before `create-migration`.
6. **Idempotent guards everywhere** — use `IF NOT EXISTS` / `OR REPLACE` / `ON CONFLICT DO NOTHING` on every statement inside the DO block.
7. **Additive first** — never `DROP` or `RENAME` without explicit user approval; the database is shared.
8. **Transactions** — wrap every migration in `BEGIN; … COMMIT;`.
9. **Update latest-schema after apply** — keep local files in sync after each successful migration.
10. **RLS required on every table** — every `CREATE TABLE` in a migration must be paired with `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and at least one `CREATE POLICY` in the same migration body. Do not rely on the `rls_auto_enable` event trigger as a substitute. After applying any migration, run the RLS audit query (see `pull-schema` step 4) to confirm no table is left unprotected. A table with RLS enabled but zero policies is fully locked out — both states are errors.
