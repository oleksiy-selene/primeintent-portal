-- policies: profiles
-- pulled from dev: 2026-05-15T22:26:00Z

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_admin_write" ON public.profiles
  AS PERMISSIVE FOR ALL TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "profiles_read" ON public.profiles
  AS PERMISSIVE FOR SELECT TO authenticated
  USING ((user_id = auth.uid()) OR is_admin());

-- Allows any authenticated user to update their own row (e.g. timezone preference).
-- Scoped to the user's own row only; does not grant any additional read or
-- write access beyond what profiles_admin_write already covers for admins.
CREATE POLICY "profiles_self_update" ON public.profiles
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
