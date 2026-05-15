-- table: enum_partner_status
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_partner_status (
  partner_status_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name              text NOT NULL,
  CONSTRAINT enum_partner_status_pkey PRIMARY KEY (partner_status_id),
  CONSTRAINT enum_partner_status_name_key UNIQUE (name)
);
