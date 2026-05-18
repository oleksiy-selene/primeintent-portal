-- =============================================================================
-- seed.sql
--
-- Reference data: enum_ tables + default partner and campaign.
-- Run this against a fresh database branch after applying migrations:
--
--   psql <connection-string> -f supabase/seed.sql
--
-- IDs are inserted explicitly (OVERRIDING SYSTEM VALUE) so foreign key
-- references in application code remain stable across environments.
-- All data sourced from the production database.
-- =============================================================================

-- enum_browser_family
INSERT INTO public.enum_browser_family (browser_family_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Unknown'),
  (2, 'Chrome'),
  (3, 'Chrome Headless'),
  (4, 'Mobile Chrome'),
  (5, 'Mobile Safari'),
  (6, 'Firefox'),
  (7, 'Samsung Internet')
ON CONFLICT (browser_family_id) DO NOTHING;

-- enum_campaign_status
INSERT INTO public.enum_campaign_status (campaign_status_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Active'),
  (2, 'Paused'),
  (3, 'Archived')
ON CONFLICT (campaign_status_id) DO NOTHING;

-- enum_conversion_status
INSERT INTO public.enum_conversion_status (conversion_status_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'pending'),
  (2, 'approved'),
  (3, 'rejected'),
  (4, 'reversed')
ON CONFLICT (conversion_status_id) DO NOTHING;

-- enum_device_type
INSERT INTO public.enum_device_type (device_type_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Mobile'),
  (2, 'Desktop'),
  (3, 'Tablet'),
  (4, 'Bot')
ON CONFLICT (device_type_id) DO NOTHING;

-- enum_expense_type
INSERT INTO public.enum_expense_type (expense_type_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'google_ads')
ON CONFLICT (expense_type_id) DO NOTHING;

-- enum_os_family
INSERT INTO public.enum_os_family (os_family_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Unknown'),
  (2, 'macOS'),
  (3, 'Linux'),
  (4, 'Android'),
  (5, 'iOS'),
  (6, 'Chrome OS'),
  (7, 'Windows')
ON CONFLICT (os_family_id) DO NOTHING;

-- enum_partner_status
INSERT INTO public.enum_partner_status (partner_status_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Active'),
  (2, 'Inactive')
ON CONFLICT (partner_status_id) DO NOTHING;

-- enum_partner_type
INSERT INTO public.enum_partner_type (partner_type_id, name)
OVERRIDING SYSTEM VALUE
VALUES
  (1, 'Internal'),
  (2, 'Affiliate')
ON CONFLICT (partner_type_id) DO NOTHING;

-- partners (must precede campaigns due to FK)
INSERT INTO public.partners (partner_id, partner_uid, name, partner_type_id, postback_url, partner_status_id)
OVERRIDING SYSTEM VALUE
VALUES
  (1, '00000000-0000-0000-0000-000000000000', 'Default Partner', 2, 'https://test.com?cid={subid2}{click_id}', 1)
ON CONFLICT (partner_id) DO NOTHING;

-- campaigns
INSERT INTO public.campaigns (campaign_id, campaign_uid, partner_id, campaign_external_id, campaign_status_id, name, description, origin, channel)
OVERRIDING SYSTEM VALUE
VALUES
  (3, '00000000-0000-0000-0000-000000000000', 1, NULL, 1, 'Default Campaign', NULL, 'test', 'test')
ON CONFLICT (campaign_id) DO NOTHING;

-- visitors
INSERT INTO public.visitors (visitor_id, visitor_uid, campaign_id, ip_address, user_agent)
OVERRIDING SYSTEM VALUE
VALUES
  (1, '00000000-0000-0000-0000-000000000000', 3, '0.0.0.0', 'default')
ON CONFLICT (visitor_id) DO UPDATE SET
  visitor_uid = EXCLUDED.visitor_uid,
  campaign_id = EXCLUDED.campaign_id,
  ip_address  = EXCLUDED.ip_address,
  user_agent  = EXCLUDED.user_agent;

-- Reset sequences so future inserts continue from the right value
SELECT setval('public.enum_browser_family_browser_family_id_seq', (SELECT MAX(browser_family_id) FROM public.enum_browser_family));
SELECT setval('public.enum_campaign_status_campaign_status_id_seq', (SELECT MAX(campaign_status_id) FROM public.enum_campaign_status));
SELECT setval('public.enum_conversion_status_conversion_status_id_seq', (SELECT MAX(conversion_status_id) FROM public.enum_conversion_status));
SELECT setval('public.enum_device_type_device_type_id_seq', (SELECT MAX(device_type_id) FROM public.enum_device_type));
SELECT setval('public.enum_expense_type_expense_type_id_seq', (SELECT MAX(expense_type_id) FROM public.enum_expense_type));
SELECT setval('public.enum_os_family_os_family_id_seq', (SELECT MAX(os_family_id) FROM public.enum_os_family));
SELECT setval('public.enum_partner_status_partner_status_id_seq', (SELECT MAX(partner_status_id) FROM public.enum_partner_status));
SELECT setval('public.enum_partner_type_partner_type_id_seq', (SELECT MAX(partner_type_id) FROM public.enum_partner_type));
SELECT setval('public.partners_partner_id_seq', (SELECT MAX(partner_id) FROM public.partners));
SELECT setval('public.campaigns_campaign_id_seq', (SELECT MAX(campaign_id) FROM public.campaigns));
SELECT setval('public.visitors_visitor_id_seq', (SELECT MAX(visitor_id) FROM public.visitors));
