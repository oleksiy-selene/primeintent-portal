-- table: enum_conversion_status
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_conversion_status (
  conversion_status_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name                 text NOT NULL,
  CONSTRAINT enum_conversion_status_pkey PRIMARY KEY (conversion_status_id),
  CONSTRAINT enum_conversion_status_name_key UNIQUE (name)
);
