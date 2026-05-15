-- table: expense_sync_logs
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.expense_sync_logs (
  expense_sync_log_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  started_at          timestamp with time zone,
  completed_at        timestamp with time zone,
  status              text,
  last_synced_hour    timestamp with time zone,
  error_message       text,
  created_at          timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  CONSTRAINT expense_sync_logs_pkey PRIMARY KEY (expense_sync_log_id)
);
