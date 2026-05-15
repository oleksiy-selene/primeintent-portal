-- policies: campaigns
-- pulled from dev: 2026-05-14T00:00:00Z

ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "campaigns_manager_write" ON public.campaigns
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

CREATE POLICY "campaigns_read" ON public.campaigns
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
