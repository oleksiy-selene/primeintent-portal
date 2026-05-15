-- table: event_logs
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.event_logs (
  event_log_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  type         text,
  payload      jsonb,
  message      text,
  created_at   timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  CONSTRAINT event_logs_pkey PRIMARY KEY (event_log_id)
);
