-- policies: campaign_expenses
-- pulled from dev: 2026-05-14T00:00:00Z

ALTER TABLE public.campaign_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaign_expenses_read" ON public.campaign_expenses
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
