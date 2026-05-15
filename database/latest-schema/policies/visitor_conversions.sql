-- policies: visitor_conversions
-- pulled from dev: 2026-05-14T00:00:00Z

ALTER TABLE public.visitor_conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_conversions_read" ON public.visitor_conversions
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
