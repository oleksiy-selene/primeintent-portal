-- policies: enum_* tables (all read-only for authenticated)
-- pulled from dev: 2026-05-14T00:00:00Z

ALTER TABLE public.enum_browser_family ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_browser_family_read" ON public.enum_browser_family
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE public.enum_campaign_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_campaign_status_read" ON public.enum_campaign_status
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE public.enum_conversion_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_conversion_status_read" ON public.enum_conversion_status
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE public.enum_device_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_device_type_read" ON public.enum_device_type
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE public.enum_expense_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_expense_type_read" ON public.enum_expense_type
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE public.enum_os_family ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_os_family_read" ON public.enum_os_family
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE public.enum_partner_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_partner_status_read" ON public.enum_partner_status
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);

ALTER TABLE public.enum_partner_type ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enum_partner_type_read" ON public.enum_partner_type
  AS PERMISSIVE FOR SELECT TO authenticated USING (true);
