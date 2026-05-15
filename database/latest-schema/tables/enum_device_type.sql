-- table: enum_device_type
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_device_type (
  device_type_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name           text NOT NULL,
  CONSTRAINT enum_device_type_pkey PRIMARY KEY (device_type_id),
  CONSTRAINT enum_device_type_name_key UNIQUE (name)
);
