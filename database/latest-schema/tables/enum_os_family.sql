-- table: enum_os_family
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_os_family (
  os_family_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name         text NOT NULL,
  CONSTRAINT enum_os_family_pkey PRIMARY KEY (os_family_id),
  CONSTRAINT enum_os_family_name_key UNIQUE (name)
);
