-- policies: internal / logging tables
-- pulled from dev: 2026-05-15T22:26:00Z
--
-- These tables are used by backend workers (service_role bypasses RLS).
-- Authenticated users have read-only access gated on is_admin() so that
-- future admin tooling can inspect them via the anon key + JWT.

ALTER TABLE public.agent_migrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "agent_migrations_admin_read" ON public.agent_migrations
  AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());

ALTER TABLE public.event_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "event_logs_admin_read" ON public.event_logs
  AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());

ALTER TABLE public.expense_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expense_sync_logs_admin_read" ON public.expense_sync_logs
  AS PERMISSIVE FOR SELECT TO authenticated USING (is_admin());
