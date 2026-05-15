-- table: campaigns
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.campaigns (
  campaign_id          bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  campaign_uid         uuid DEFAULT gen_random_uuid() NOT NULL,
  partner_id           bigint NOT NULL,
  campaign_external_id text,
  campaign_status_id   smallint NOT NULL,
  name                 text NOT NULL,
  description          text,
  origin               text NOT NULL,
  channel              text NOT NULL,
  created_at           timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  updated_at           timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  CONSTRAINT campaigns_pkey PRIMARY KEY (campaign_id),
  CONSTRAINT campaigns_campaign_uid_key UNIQUE (campaign_uid),
  CONSTRAINT campaigns_campaign_status_id_fkey
    FOREIGN KEY (campaign_status_id) REFERENCES public.enum_campaign_status(campaign_status_id),
  CONSTRAINT campaigns_partner_id_fkey
    FOREIGN KEY (partner_id) REFERENCES public.partners(partner_id)
);
