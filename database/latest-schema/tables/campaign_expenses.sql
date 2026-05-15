-- table: campaign_expenses
-- pulled from dev: 2026-05-14T00:00:00Z

CREATE TABLE IF NOT EXISTS public.campaign_expenses (
  campaign_expense_id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  campaign_id         bigint NOT NULL,
  expense_type_id     smallint NOT NULL,
  start_time          timestamp with time zone NOT NULL,
  end_time            timestamp with time zone NOT NULL,
  amount              numeric NOT NULL,
  created_at          timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  updated_at          timestamp with time zone DEFAULT (now() AT TIME ZONE 'UTC') NOT NULL,
  CONSTRAINT campaign_expenses_pkey PRIMARY KEY (campaign_expense_id),
  CONSTRAINT campaign_expenses_campaign_id_expense_type_id_start_time_en_key
    UNIQUE (campaign_id, expense_type_id, start_time, end_time),
  CONSTRAINT campaign_expenses_campaign_id_fkey
    FOREIGN KEY (campaign_id) REFERENCES public.campaigns(campaign_id),
  CONSTRAINT campaign_expenses_expense_type_id_fkey
    FOREIGN KEY (expense_type_id) REFERENCES public.enum_expense_type(expense_type_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_campaign_expenses_campaign_start
  ON public.campaign_expenses USING btree (campaign_id, start_time);
