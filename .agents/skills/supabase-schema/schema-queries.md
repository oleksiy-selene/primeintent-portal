# Schema Extraction Queries

All queries run against the **production** project ref via the Management API.
Replace `<TABLE>` with the actual table name where shown.

---

## List all user tables

```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

---

## Column definitions for a table

```sql
SELECT
  a.attname                                                        AS column_name,
  pg_catalog.format_type(a.atttypid, a.atttypmod)                 AS data_type,
  NOT a.attnotnull                                                 AS is_nullable,
  pg_catalog.pg_get_expr(d.adbin, d.adrelid)                      AS column_default,
  CASE a.attidentity
    WHEN 'a' THEN 'ALWAYS'
    WHEN 'd' THEN 'BY DEFAULT'
    ELSE NULL
  END                                                              AS identity_generation
FROM pg_catalog.pg_attribute a
LEFT JOIN pg_catalog.pg_attrdef d
       ON a.attrelid = d.adrelid AND a.attnum = d.adnum
WHERE a.attrelid = 'public.<TABLE>'::regclass
  AND a.attnum > 0
  AND NOT a.attisdropped
ORDER BY a.attnum;
```

---

## Constraints for a table

```sql
SELECT
  conname                          AS constraint_name,
  pg_get_constraintdef(oid, true)  AS constraint_def,
  contype                          AS constraint_type
FROM pg_constraint
WHERE conrelid = 'public.<TABLE>'::regclass
ORDER BY contype, conname;
```

`contype` values: `p` = primary key, `f` = foreign key, `u` = unique, `c` = check.

---

## Indexes for a table (excluding primary keys)

```sql
SELECT
  pi.indexname,
  pg_get_indexdef(i.indexrelid) AS index_def
FROM pg_indexes pi
JOIN pg_class   c ON c.relname   = pi.indexname
JOIN pg_index   i ON i.indexrelid = c.oid
WHERE pi.schemaname = 'public'
  AND pi.tablename  = '<TABLE>'
  AND NOT i.indisprimary
ORDER BY pi.indexname;
```

---

## All views

```sql
SELECT
  viewname,
  pg_get_viewdef(viewname::regclass, true) AS view_def
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
```

---

## All functions (public schema)

```sql
SELECT
  p.proname                  AS func_name,
  pg_get_functiondef(p.oid)  AS func_def
FROM pg_proc       p
JOIN pg_namespace  n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY p.proname;
```

---

## All triggers (non-internal)

```sql
SELECT
  t.tgname                     AS trigger_name,
  c.relname                    AS table_name,
  pg_get_triggerdef(t.oid)     AS trigger_def
FROM pg_trigger    t
JOIN pg_class      c ON c.oid        = t.tgrelid
JOIN pg_namespace  n ON n.oid        = c.relnamespace
WHERE n.nspname        = 'public'
  AND NOT t.tgisinternal
ORDER BY c.relname, t.tgname;
```

---

## All RLS policies

```sql
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual       AS using_expr,
  with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

Reconstruct as:

```sql
CREATE POLICY "<policyname>" ON public.<tablename>
  AS <permissive>         -- PERMISSIVE or RESTRICTIVE
  FOR <cmd>               -- ALL / SELECT / INSERT / UPDATE / DELETE
  TO <roles>
  USING (<using_expr>)
  WITH CHECK (<check_expr>);
```

Omit `USING` / `WITH CHECK` clauses when the value is NULL.

---

## Custom types and enums

```sql
SELECT
  t.typname   AS type_name,
  t.typtype   AS type_kind,
  CASE t.typtype
    WHEN 'e' THEN array_to_string(
                    array_agg(e.enumlabel ORDER BY e.enumsortorder), ', ')
    ELSE NULL
  END         AS enum_values
FROM pg_type       t
LEFT JOIN pg_enum  e ON e.enumtypid = t.oid
JOIN pg_namespace  n ON n.oid       = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typtype IN ('e', 'c', 'd')
  AND t.typname NOT LIKE '\_%'
GROUP BY t.typname, t.typtype
ORDER BY t.typname;
```

---

## Check which migrations have been applied (dev)

```sql
SELECT migration_name, applied_at
FROM public.agent_migrations
ORDER BY applied_at;
```

---

## Ensure migration tracking table exists (run on dev before anything else)

```sql
CREATE TABLE IF NOT EXISTS public.agent_migrations (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  migration_name  text NOT NULL UNIQUE,
  applied_at      timestamptz DEFAULT now() NOT NULL
);
```
