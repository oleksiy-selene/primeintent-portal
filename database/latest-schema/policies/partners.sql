-- policies: partners
-- pulled from dev: 2026-05-14T00:00:00Z

ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "partners_manager_write" ON public.partners
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_manager_or_above())
  WITH CHECK (is_manager_or_above());

CREATE POLICY "partners_read" ON public.partners
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);
