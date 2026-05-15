-- policies: profiles
-- pulled from dev: 2026-05-14T00:00:00Z

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_admin_write" ON public.profiles
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "profiles_read" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR is_admin());
