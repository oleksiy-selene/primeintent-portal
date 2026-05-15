-- table: enum_browser_family
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_browser_family (
  browser_family_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name              text NOT NULL,
  CONSTRAINT enum_browser_family_pkey PRIMARY KEY (browser_family_id),
  CONSTRAINT enum_browser_family_name_key UNIQUE (name)
);
