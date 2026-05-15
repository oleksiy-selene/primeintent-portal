---
name: daterange-late-binding
description: Governs all date-range logic in the Prime Intent Portal. Use whenever implementing or modifying date-range selection, timezone handling, comparison periods, URL sync, or data fetching gating in this project.
---

# Date-Range Late-Binding System

## Core Philosophy

Absolute UTC boundaries (`from`/`to`) are **never stored in state**. They are computed **at the moment of the data fetch** using the user's current timezone. This ensures data is always fresh (no stale midnight boundaries) and comparison periods are always balanced.

---

## 1. Late-Binding Calculation (4-Step Algorithm)

1. **Get Base Time** — `const nowUtc = new Date()`
2. **Offset to Target** — `const nowZoned = toZonedTime(nowUtc, tz)` (via `date-fns-tz`)
3. **Boundary Calculation** — compute `startZoned` using `date-fns` helpers (`startOfDay`, `startOfWeek`, `startOfMonth`, `subDays`) on `nowZoned`
4. **Revert to UTC** — `from = fromZonedTime(startZoned, tz).toISOString()`, `to = nowUtc.toISOString()`

End boundary is always **"right now"** (current UTC instant), never end-of-day. This ensures that when you compare "Today" vs "Yesterday" you compare the same fractional day.

---

## 2. Core Types

```ts
// Permanent typed preset IDs — use these everywhere, never string labels
export type PresetId = "today" | "this-week" | "last-7" | "this-month" | "last-30";

// Shift IDs for comparison periods (Task #14 — not yet implemented)
export type ShiftId = "24h" | "7d" | "1mo" | "custom";

// What is stored in state/localStorage/URL — never timestamps
export type DateRangeSelection =
  | { presetId: PresetId }
  | { presetId: "custom"; customFrom: string; customTo: string }; // customFrom/To = UTC ISO
```

---

## 3. State & Storage Logic (Implemented)

- **Store**: `DateRangeSelection` (presetId + optional customFrom/customTo) — never `{ from, to }` timestamps
- **localStorage key**: `"drSelection"` — stores `DateRangeSelection` as JSON
- **URL params** (all currently active):
  - `?range_id=today` (or any PresetId)
  - `?range_id=custom&start=ISO&end=ISO` (custom only)
  - `?tz=America/New_York` (reflects current timezone — written by `AuthContext` after profile load and timezone change)

> **Future (Task #14)**: `?compare=true&shift_id=7d` will be added when the comparison toggle is built.

---

## 4. Profile Timezone Gating (The "Gating" Principle)

**All data-fetching queries must remain idle until the user's timezone is resolved from the database.**

- `AuthContext` exposes `isProfileLoaded: boolean` — set to `true` after the profile fetch settles (even if profile is null)
- Every TanStack Query that depends on timezone uses `enabled: ... && isProfileLoaded`
- This prevents the "double-fetch" race condition (default-tz query → tz-loaded → re-fetch with correct tz)

---

## 5. Fetch-Time Resolution Pattern

```ts
// In page component:
const { profile, isProfileLoaded } = useAuth();
const tz = profile?.timezone ?? "America/New_York";
const [selection, setSelection] = useDateRangeWithTimezone();

const perfQuery = useQuery({
  queryKey: ["perf", ids, selection, tz],
  queryFn: () => {
    const { from, to } = resolvePresetRange(selection, tz); // late-binding here
    return fetchPerf(ids, { from, to });
  },
  enabled: ids.length > 0 && isProfileLoaded,
  staleTime: 60_000,
});
```

---

## 6. Key Utility Functions (`src/lib/dateRange.ts`)

| Function | Purpose | Status |
|---|---|---|
| `resolvePresetRange(selection, tz)` | Late-binding → returns `{ from, to }` UTC ISO strings | ✅ Implemented |
| `resolvePresetRangeById(presetId, tz)` | Thin wrapper — same as above but takes just a `PresetId` | ✅ Implemented |
| `selectionLabel(selection, tz)` | Human-readable label for display in the picker button | ✅ Implemented |
| `selectionToUrlParams(selection)` | Serialises selection to URL search params | ✅ Implemented |
| `selectionFromUrlParams(params)` | Deserialises selection from URL search params | ✅ Implemented |
| `writeTzToUrl(tz)` | Writes `?tz=IANA` to URL — called by `AuthContext` | ✅ Implemented |
| `utcIsoToLocalString(utcIso, tz)` | UTC ISO → `datetime-local` input value in tz | ✅ Implemented |
| `localStringToUtcIso(localStr, tz)` | `datetime-local` value → UTC ISO string | ✅ Implemented |
| `resolveShiftedRange(selection, shiftId, tz)` | Reference period for comparison toggle | 🔜 Task #14 |

---

## 7. Technical Constraints

- **Libraries**: `date-fns` + `date-fns-tz` (both installed, v3-compatible)
- **TypeScript**: `PresetId` and `ShiftId` are strict literal unions — never use raw strings
- **Parallel Fetching**: Base + Reference queries use `Promise.all` / parallel TanStack Query keys
- **No redundant imports**: Import `toZonedTime`/`fromZonedTime` from `date-fns-tz`; import `startOfDay`, `startOfWeek`, `startOfMonth`, `subDays` from `date-fns`

---

## 8. Files to Check

- `src/lib/dateRange.ts` — all types, resolvers, helpers
- `src/contexts/AuthContext.tsx` — `isProfileLoaded` flag, `writeTzToUrl` calls
- `src/contexts/DateRangeContext.tsx` — stores `DateRangeSelection`, URL+localStorage sync
- `src/hooks/useDateRangeWithTimezone.ts` — thin wrapper over context
- `src/components/_shared/DateRangePicker.tsx` — picker UI

---

## 9. Future Work (Task #14 — Compare Toggle)

The comparison toggle will add:
- `DateRangePicker` compare toggle UI
- `resolveShiftedRange(selection, shiftId, tz)` in `dateRange.ts`
- URL params: `?compare=true&shift_id=7d`
- Parallel TanStack Query for the reference period in each page
- Delta rendering (Task #15)
