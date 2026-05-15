-- table: partners
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.partners (
  partner_id        bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  partner_uid       uuid DEFAULT gen_random_uuid() NOT NULL,
  name              text NOT NULL,
  partner_type_id   smallint NOT NULL,
  created_at        timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  postback_url      text,
  partner_status_id smallint DEFAULT 1 NOT NULL,
  CONSTRAINT partners_pkey PRIMARY KEY (partner_id),
  CONSTRAINT partners_partner_uid_key UNIQUE (partner_uid),
  CONSTRAINT partners_partner_status_id_fkey
    FOREIGN KEY (partner_status_id) REFERENCES public.enum_partner_status(partner_status_id),
  CONSTRAINT partners_partner_type_id_fkey
    FOREIGN KEY (partner_type_id) REFERENCES public.enum_partner_type(partner_type_id)
);
