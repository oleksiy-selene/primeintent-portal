-- table: visitor_conversion_data
-- pulled from dev: 2026-05-15T00:40:00Z

CREATE TABLE IF NOT EXISTS public.visitor_conversion_data (
  visitor_conversion_id  bigint NOT NULL,
  event_time_unix        bigint,
  call_duration_seconds  numeric,
  city                   text,
  city_meta              text,
  currently_insured      boolean,
  hashed_birth_date      text,
  hashed_city_meta       text,
  hashed_email           text,
  hashed_first_name      text,
  hashed_last_name       text,
  hashed_phone_e164      text,
  hashed_phone_meta      text,
  homeowner              boolean,
  person_age             numeric,
  postal_state           text,
  referer_domain         text,
  subid                  text,
  vertical               text,
  zip_code               text,
  CONSTRAINT visitor_conversion_data_pkey
    PRIMARY KEY (visitor_conversion_id),
  CONSTRAINT visitor_conversion_data_visitor_conversion_id_fkey
    FOREIGN KEY (visitor_conversion_id)
    REFERENCES public.visitor_conversions(visitor_conversion_id)
    ON DELETE CASCADE
);
