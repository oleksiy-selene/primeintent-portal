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
  "migration_tracking_table": "agent_migrations",
  "latest_schema_dir": "database/latest-schema",
  "migrations_dir": "database/migrations",
  "seed_file": "database/seed.sql"
}
```

- `production_project_ref` — find this in the Supabase dashboard under Project Settings > General. It is the alphanumeric string in your project URL (`https://supabase.com/dashboard/project/<ref>`).
- The path fields (`latest_schema_dir`, `migrations_dir`, `seed_file`) only need changing if the target project uses a different directory layout.
- `migration_tracking_table` can stay as `agent_migrations` unless the target project already uses that table name for something else.

### 3. Set the required environment variables

The skill reads two env vars at runtime. Make sure both are set in the target project's secrets/environment:

| Variable | Description |
|---|---|
| `SUPABASE_URL` | The dev project's Supabase URL (`https://<dev-ref>.supabase.co`) |
| `SUPABASE_ACCESS_TOKEN` | A Supabase personal access token (create one at supabase.com/dashboard/account/tokens) |

The dev project ref is derived automatically from `SUPABASE_URL`, so no extra configuration is needed for dev.

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
