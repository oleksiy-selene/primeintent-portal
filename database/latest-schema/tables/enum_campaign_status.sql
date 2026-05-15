-- table: enum_campaign_status
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.enum_campaign_status (
  campaign_status_id smallint GENERATED ALWAYS AS IDENTITY NOT NULL,
  name               text NOT NULL,
  CONSTRAINT enum_campaign_status_pkey PRIMARY KEY (campaign_status_id),
  CONSTRAINT enum_campaign_status_name_key UNIQUE (name)
);
