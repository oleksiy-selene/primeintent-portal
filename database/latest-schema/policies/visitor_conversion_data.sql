-- policies: visitor_conversion_data
-- pulled from dev: 2026-05-15T22:26:00Z
--
-- Contains hashed PII fields. Backend workers write via service_role
-- (bypasses RLS). Authenticated users have read-only access gated on
-- is_admin().

ALTER TABLE public.visitor_conversion_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "visitor_conversion_data_admin_read" ON public.visitor_conversion_data
  AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
