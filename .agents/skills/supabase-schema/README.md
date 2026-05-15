# supabase-schema skill

An agent skill for managing Supabase database schema changes safely — pulling schema, creating migrations, seeding, and resetting the dev database — without relying on the Supabase CLI, Docker, or git submodules.

---

## How to copy this skill to another project

### 1. Copy the skill folder

Copy the entire `.agents/skills/supabase-schema/` folder into the target project at the same path:

```
.agents/skills/supabase-schema/
  SKILL.md
  README.md
  config.json
  schema-queries.md
```

### 2. Update config.json

`config.json` contains values that are specific to this project. Open it and update every field for the target project:

```json
{
  "production_project_ref": "<target project's Supabase production ref>",
  "supabase_url_env_var_name": "<name of the env var holding the Supabase project URL>",
  "supabase_access_token_env_var_name": "<name of the env var holding the personal access token>",
  "migration_tracking_table": "agent_migrations",
  "latest_schema_dir": "database/latest-schema",
  "migrations_dir": "database/migrations",
  "seed_file": "database/seed.sql"
}
```

- `production_project_ref` — find this in the Supabase dashboard under Project Settings > General. It is the alphanumeric string in your project URL (`https://supabase.com/dashboard/project/<ref>`).
- `supabase_url_env_var_name` — the **name** of the env var whose value is the Supabase project URL. Different projects may expose this under different names (e.g. `SUPABASE_URL`, `VITE_SUPABASE_URL`). The dev project ref is extracted from the URL value at runtime.
- `supabase_access_token_env_var_name` — the **name** of the env var whose value is the Supabase personal access token. Again, projects may name this differently (e.g. `SUPABASE_ACCESS_TOKEN`, `SUPABASE_TOKEN`).
- The path fields (`latest_schema_dir`, `migrations_dir`, `seed_file`) only need changing if the target project uses a different directory layout.
- `migration_tracking_table` can stay as `agent_migrations` unless the target project already uses that table name for something else.

### 3. Set the required environment variables

The skill reads two env vars at runtime — their **names** are configured in `config.json` under `supabase_url_env_var_name` and `supabase_access_token_env_var_name`. Make sure both are set in the target project's secrets/environment:

| config.json key | What the env var must contain |
|---|---|
| `supabase_url_env_var_name` | The dev project's Supabase URL (`https://<dev-ref>.supabase.co`) |
| `supabase_access_token_env_var_name` | A Supabase personal access token (see below for how to generate one) |

The dev project ref is derived automatically from the URL value, so no extra configuration is needed for dev.

#### How to generate a Supabase Personal Access Token

The access token is a Personal Access Token with a `sbp_` prefix. It is used specifically for authenticating with the Supabase Management API (managing projects, organizations, CI/CD workflows — not for querying your database as an end user).

1. **Go to Account Settings** — click your avatar / profile icon at the very bottom-left of the Supabase dashboard sidebar.
2. **Select Access Tokens** — in the account menu sidebar, click **Access Tokens**.
3. **Generate a new token** — click **Generate new token**, give it a descriptive name (e.g. `Replit Agent`), then click **Confirm**.
4. **Copy the token immediately** — it is only shown once. Store it as a secret in your project (it will look like `sbp_xxxxxxxx...`).

### 4. Add a reference in replit.md

Adding a line in the target project's `replit.md` tells the agent to load this skill whenever schema work comes up. Without it the skill still works, but the agent may not reach for it automatically.

Add something like this under a "Database management" section:

```
# Database management

All schema changes use the `supabase-schema` skill — read `.agents/skills/supabase-schema/SKILL.md` before any schema operation.
```

### 5. Create the database directory structure (first time only)

If the target project does not yet have the database directories, create them:

```
database/
  seed.sql
  latest-schema/
  migrations/
```

The agent will populate `latest-schema/` and `migrations/` when you ask it to pull the schema or create the first migration.

---

## Files in this folder

| File | Purpose |
|---|---|
| `SKILL.md` | The agent's instruction file — do not rename or move this |
| `config.json` | Project-specific configuration (refs, paths) |
| `schema-queries.md` | SQL queries used to extract schema from the database |
| `README.md` | This file — human documentation only, ignored by the agent |
