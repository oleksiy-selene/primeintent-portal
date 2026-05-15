-- table: enum_partner_type
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_partner_type (
  partner_type_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name            text NOT NULL,
  CONSTRAINT enum_partner_type_pkey PRIMARY KEY (partner_type_id),
  CONSTRAINT enum_partner_type_name_key UNIQUE (name)
);
