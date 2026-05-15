-- policies: visitors
-- pulled from dev: 2026-05-14T00:00:00Z

ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitors_read" ON public.visitors
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
