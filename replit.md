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
- `src/lib/dateRange.ts` — `PresetId`/`ShiftId`/`DateRangeSelection`/`CompareSelection` types, `resolvePresetRange`, `resolveShiftedRange`, `SHIFT_OPTIONS_FOR_PRESET`, `selectionLabel`, `TIMEZONES`, `tzLabel`
- `src/lib/format.ts` — `num`, `usd`, `formatDate`, `formatTime`
- `src/hooks/useDateRangeWithTimezone.ts` — returns `{ selection, setSelection, compare, setCompare }` from context
- `src/lib/useInfiniteScroll.ts` — infinite scroll sentinel hook
- `src/lib/useSortState.ts` — sortable column state
- `src/components/_shared/AppLayout.tsx` — sidebar + main content wrapper
- `src/components/_shared/Header.tsx` — sticky header with timezone popover (saves to `profiles.timezone`)
- `src/components/_shared/DateRangePicker.tsx` — shared date range control with presets + custom mode
- `src/components/_shared/Sidebar.tsx` — nav sidebar
- `src/components/DeltaChip.tsx` — `((current−ref)/|ref|)×100` delta chip (supports `isInverse` for Cost)
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
- **DateRangePicker**: presets + Custom datetime inputs + Compare toggle (context-sensitive shift selector, "NOW" notation range display); all preset boundaries computed in user's selected IANA timezone
- **Compare mode**: toggle in DateRangePicker reveals shift selector (−24h/−7d/−30d/custom) filtered by active preset; compare state syncs to URL + `localStorage`; when enabled, a parallel reference-period query fires per page and `DeltaChip` renders `((current−ref)/|ref|)×100` beneath each metric (Revenue/Visitors/Profit: green=up; Cost: inverse)
- **Auth**: email/password login via Supabase Auth, role-based write access (admin/manager vs viewer)

## Architecture notes
- `fetchPartnerPerf` and `fetchPerformance` accept `{ from: string; to: string }` ISO range objects — not rolling `days` integers
- **Late-binding date ranges**: all pages store a `DateRangeSelection` (preset ID or custom datetime strings) and call `resolvePresetRange(selection, tz)` inside the `queryFn` at fetch time — never at render time
- All timezone-dependent queries are gated on `isProfileLoaded` from `AuthContext` so they don't fire with the default "America/New_York" fallback before the real profile loads
- `DateRangeContext` persists `DateRangeSelection` to both URL params and `localStorage`; reads on init in priority: URL → localStorage → default
- `Header` uses a manual click-outside popover (no Radix Popover) to avoid z-index conflicts with sticky positioning

## UI conventions

### Table padding
Every table must have `pl-6` on the **first** column (header + every data cell) and `pr-6` on the **last** column (header + every data cell). This gives comfortable breathing room from the table borders. When the last column is conditional (e.g. an edit-action cell that only renders for `canWrite` users), apply `pr-6` to both the conditional last column and the always-present second-to-last column using a conditional class: `className={cn("...", !canWrite && "pr-6")}`.

### Tabs
Model all tab implementations on `PartnerDetail.tsx`. Key points:
- Use shadcn/ui `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent` primitives.
- `TabsList` — full-width, left-aligned, no background, no rounding, bottom-border only: `className="flex w-full items-center justify-start gap-6 border-b border-slate-200 rounded-none bg-white p-0 h-auto px-8 pt-6"`
- `TabsTrigger` — underline-style active indicator, no pill/box background: `className="cursor-pointer pb-3 text-sm font-medium rounded-none border-b-2 shadow-none bg-transparent px-0 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-700"`
- Optional count badge on a trigger: `<span className="ml-1.5 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">{count}</span>`
- `TabsContent` — `mt-0` to remove default top margin, use flex-col + min-h-0 when the tab contains a scrollable table.
