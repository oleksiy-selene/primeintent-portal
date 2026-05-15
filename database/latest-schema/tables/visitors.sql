-- table: visitors
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.visitors (
  visitor_id        bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  visitor_uid       uuid DEFAULT gen_random_uuid() NOT NULL,
  campaign_id       bigint NOT NULL,
  external_click_id text,
  subid1            text,
  subid2            text,
  subid3            text,
  subid4            text,
  created_at        timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  ip_address        inet NOT NULL,
  user_agent        text NOT NULL,
  device_type_id    smallint,
  browser_family_id smallint,
  os_family_id      smallint,
  referrer_url      text,
  landing_page_url  text,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  utm_term          text,
  geo_state         character(2),
  geo_country       character(2),
  is_bot            boolean DEFAULT false NOT NULL,
  extra_data        jsonb,
  CONSTRAINT visitors_pkey PRIMARY KEY (visitor_id),
  CONSTRAINT visitors_visitor_uid_key UNIQUE (visitor_uid),
  CONSTRAINT visitors_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(campaign_id),
  CONSTRAINT visitors_browser_family_id_fkey
    FOREIGN KEY (browser_family_id) REFERENCES public.enum_browser_family(browser_family_id),
  CONSTRAINT visitors_device_type_id_fkey
    FOREIGN KEY (device_type_id) REFERENCES public.enum_device_type(device_type_id),
  CONSTRAINT visitors_os_family_id_fkey
    FOREIGN KEY (os_family_id) REFERENCES public.enum_os_family(os_family_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_visitors_campaign_created
  ON public.visitors USING btree (campaign_id, created_at);

CREATE INDEX IF NOT EXISTS idx_visitors_campaign_id
  ON public.visitors USING btree (campaign_id);

CREATE INDEX IF NOT EXISTS idx_visitors_created_at
  ON public.visitors USING btree (created_at);

CREATE INDEX IF NOT EXISTS idx_visitors_external_click_id
  ON public.visitors USING btree (external_click_id);
