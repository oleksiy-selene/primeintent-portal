-- table: visitor_conversions
-- pulled from dev: 2026-05-15T00:40:00Z

CREATE TABLE IF NOT EXISTS public.visitor_conversions (
  visitor_conversion_id  bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  visitor_conversion_uid uuid DEFAULT gen_random_uuid() NOT NULL,
  visitor_id             bigint NOT NULL,
  payout                 numeric NOT NULL,
  conversion_status_id   smallint NOT NULL,
  external_conversion_id text,
  conversion_time        timestamp with time zone,
  created_at             timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  CONSTRAINT visitor_conversions_pkey PRIMARY KEY (visitor_conversion_id),
  CONSTRAINT visitor_conversions_visitor_conversion_uid_key UNIQUE (visitor_conversion_uid),
  CONSTRAINT visitor_conversions_payout_check CHECK (payout >= 0),
  CONSTRAINT visitor_conversions_conversion_status_id_fkey
    FOREIGN KEY (conversion_status_id) REFERENCES public.enum_conversion_status(conversion_status_id),
  CONSTRAINT visitor_conversions_visitor_id_fkey
    FOREIGN KEY (visitor_id) REFERENCES public.visitors(visitor_id)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_conversion_idempotency
  ON public.visitor_conversions USING btree (visitor_id, external_conversion_id)
  WHERE external_conversion_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_visitor_conversions_visitor_id
  ON public.visitor_conversions USING btree (visitor_id);
