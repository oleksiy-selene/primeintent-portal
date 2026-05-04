# Prime Intent Portal

A React + Vite admin portal for managing affiliate marketing partners, campaigns, and visitor conversions, backed by Supabase.

## Stack
- **Frontend**: React 19 + Vite 7 + TypeScript
- **Styling**: Tailwind CSS v4 + shadcn/ui (Radix UI primitives)
- **State**: TanStack Query v5 (server state), React useState (local)
- **Routing**: wouter
- **Backend/DB**: Supabase (PostgreSQL + Auth + RLS)
- **Package manager**: pnpm (monorepo-style, port 3000)

## Key files
- `src/App.tsx` — router setup, QueryClient, AuthProvider
- `src/contexts/AuthContext.tsx` — auth session, profile (incl. `timezone`), `setTimezone`
- `src/lib/supabase.ts` — Supabase client
- `src/lib/dateRange.ts` — `DateRange` type, `getPresetRange`, `TIMEZONES`, `tzLabel`
- `src/lib/format.ts` — `num`, `usd`, `formatDate`, `formatTime`
- `src/lib/useInfiniteScroll.ts` — infinite scroll sentinel hook
- `src/lib/useSortState.ts` — sortable column state
- `src/components/_shared/AppLayout.tsx` — sidebar + main content wrapper
- `src/components/_shared/Header.tsx` — sticky header with timezone popover (saves to `profiles.timezone`)
- `src/components/_shared/DateRangePicker.tsx` — shared date range control with presets + custom mode
- `src/components/_shared/Sidebar.tsx` — nav sidebar
- `src/components/SortableHeader.tsx` — sortable table column header
- `src/components/CampaignDialog.tsx` — create/edit campaign dialog
- `src/pages/Partners.tsx` — partner list with perf columns, date range filter
- `src/pages/PartnerDetail.tsx` — partner detail with tabs (Overview, Campaigns), campaigns date range filter
- `src/pages/Campaigns.tsx` — campaigns list
- `src/pages/Visitors.tsx` — visitor log
- `src/pages/Dashboard.tsx` — summary dashboard
- `src/pages/Users.tsx` — user management

## Database schema (Supabase)
- `profiles` — user_id, email, display_name, role, timezone (default 'America/New_York'), created_at
- `partners` — partner_id, partner_uid, name, partner_type_id, partner_status_id, postback_url, created_at
- `enum_partner_type` — partner_type_id, name
- `enum_partner_status` — partner_status_id, name
- `campaigns` — campaign_id, campaign_uid, name, partner_id, campaign_status_id, origin, channel, campaign_external_id, description, created_at
- `enum_campaign_status` — campaign_status_id, name
- `visitors` — visitor_id, click_id, campaign_id, created_at, subid1, subid2, ...
- `visitor_conversions` — conversion_id, visitor_id, payout_amount, conversion_status_id, created_at
- `enum_conversion_status` — conversion_status_id, name (approved/pending/rejected)
- `campaign_expenses` — expense_id, campaign_id, amount, start_time, end_time

## Features implemented
- **Partners list**: search, type filter, status filter, date range filter (timezone-aware), Visitors/Revenue/Cost/Profit columns, campaign count, infinite scroll, avatar with status-colored border, add/edit dialog
- **Partner detail**: overview tab (editable fields, postback URL + tokens, status/type), campaigns tab (search, status filter, date range filter, perf columns, add/edit campaign dialog), status badge in header
- **Header**: global timezone selector (popover, saves to `profiles.timezone` in Supabase), sticky across all pages
- **DateRangePicker**: presets (Today, This Week, Last 7 Days, This Month, Last 30 Days) + Custom datetime inputs; all preset boundaries computed in user's selected IANA timezone
- **Auth**: email/password login via Supabase Auth, role-based write access (admin/manager vs viewer)

## Architecture notes
- `fetchPartnerPerf` and `fetchPerformance` accept `{ from: string; to: string }` ISO range objects — not rolling `days` integers
- `DateRangePicker` reads timezone from `useAuth().profile.timezone`; initial state defaults to "America/New_York" until profile loads (see tech-debt task for fix)
- `Header` uses a manual click-outside popover (no Radix Popover) to avoid z-index conflicts with sticky positioning
