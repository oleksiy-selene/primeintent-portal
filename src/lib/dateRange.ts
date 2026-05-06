import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
} from "date-fns";

// ─── Typed IDs ────────────────────────────────────────────────────────────────

export type PresetId = "today" | "this-week" | "last-7" | "this-month" | "last-30";

/** Backward-compat alias — prefer PresetId in new code */
export type PresetKey = PresetId;

export type ShiftId = "24h" | "7d" | "1mo" | "custom";

// ─── Selection (what lives in state / localStorage / URL) ─────────────────────

export type DateRangeSelection =
  | { presetId: PresetId }
  | { presetId: "custom"; customFrom: string; customTo: string };

// ─── Resolved range (what goes to Supabase) ──────────────────────────────────

export interface ResolvedRange {
  from: string;
  to: string;
}

// ─── Legacy DateRange type (kept for backward compat with remaining callers) ──

export interface DateRange extends ResolvedRange {
  preset: PresetId | "custom";
  label: string;
}

// ─── Preset metadata ──────────────────────────────────────────────────────────

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "this-week", label: "This Week" },
  { id: "last-7", label: "Last 7 Days" },
  { id: "this-month", label: "This Month" },
  { id: "last-30", label: "Last 30 Days" },
];

/** Backward-compat alias */
export const PRESET_KEYS: { key: PresetKey; label: string }[] = PRESETS.map((p) => ({
  key: p.id,
  label: p.label,
}));

export const PRESET_IDS = PRESETS.map((p) => p.id);

// ─── Timezone list ────────────────────────────────────────────────────────────

export const TIMEZONES: { value: string; label: string }[] = [
  { value: "America/New_York", label: "Eastern Time (ET)" },
  { value: "America/Chicago", label: "Central Time (CT)" },
  { value: "America/Denver", label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles", label: "Pacific Time (PT)" },
  { value: "America/Anchorage", label: "Alaska Time (AKT)" },
  { value: "Pacific/Honolulu", label: "Hawaii Time (HT)" },
  { value: "UTC", label: "UTC" },
];

export function tzLabel(tz: string): string {
  return TIMEZONES.find((t) => t.value === tz)?.label ?? tz;
}

// ─── Core: Late-Binding Resolution ──────────────────────────────────────────

/**
 * Resolves a DateRangeSelection to UTC ISO strings at the moment of the call
 * (late-binding). Uses the 4-step algorithm:
 *  1. Get current UTC instant
 *  2. Convert to target tz
 *  3. Compute period start in that tz
 *  4. Convert start back to UTC; end = now
 *
 * Design note: The function accepts a full `DateRangeSelection` (not just a
 * `PresetId`) so that custom ranges (which carry their own UTC ISO strings)
 * are handled uniformly by the same resolver. Callers never need to branch on
 * preset-vs-custom — they always call `resolvePresetRange(selection, tz)`.
 */
export function resolvePresetRange(
  selection: DateRangeSelection,
  tz: string,
): ResolvedRange {
  if (selection.presetId === "custom") {
    return { from: selection.customFrom, to: selection.customTo };
  }

  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);

  let startZoned: Date;
  switch (selection.presetId) {
    case "today":
      startZoned = startOfDay(nowZoned);
      break;
    case "this-week":
      startZoned = startOfWeek(nowZoned, { weekStartsOn: 1 });
      break;
    case "last-7":
      startZoned = startOfDay(subDays(nowZoned, 6));
      break;
    case "this-month":
      startZoned = startOfMonth(nowZoned);
      break;
    case "last-30":
      startZoned = startOfDay(subDays(nowZoned, 29));
      break;
  }

  return {
    from: fromZonedTime(startZoned, tz).toISOString(),
    to: nowUtc.toISOString(),
  };
}

/** Backward-compat alias — new code should use resolvePresetRange */
export function getPresetRange(preset: PresetId, tz: string): DateRange {
  const { from, to } = resolvePresetRange({ presetId: preset }, tz);
  const label = PRESETS.find((p) => p.id === preset)?.label ?? preset;
  return { from, to, preset, label };
}

// ─── Display label ────────────────────────────────────────────────────────────

export function selectionLabel(selection: DateRangeSelection, tz: string): string {
  if (selection.presetId === "custom") {
    const fmt = (s: string) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(s));
    return `${fmt(selection.customFrom)} – ${fmt(selection.customTo)}`;
  }
  return PRESETS.find((p) => p.id === selection.presetId)?.label ?? selection.presetId;
}

// ─── URL serialisation ────────────────────────────────────────────────────────

export function selectionToUrlParams(selection: DateRangeSelection): Record<string, string> {
  if (selection.presetId === "custom") {
    return { range_id: "custom", start: selection.customFrom, end: selection.customTo };
  }
  return { range_id: selection.presetId };
}

export function selectionFromUrlParams(
  params: URLSearchParams,
): DateRangeSelection | null {
  const rangeId = params.get("range_id");
  if (!rangeId) return null;
  if (rangeId === "custom") {
    const start = params.get("start");
    const end = params.get("end");
    if (start && end) return { presetId: "custom", customFrom: start, customTo: end };
    return null;
  }
  if ((PRESET_IDS as string[]).includes(rangeId)) {
    return { presetId: rangeId as PresetId };
  }
  return null;
}

// ─── Timezone URL sync ───────────────────────────────────────────────────────

/**
 * Writes (or updates) the `?tz=` URL param to reflect the current timezone.
 * Called by AuthContext after the profile loads and after setTimezone succeeds.
 * Safe to call at any time — does not touch range_id/start/end params.
 */
export function writeTzToUrl(tz: string): void {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("tz", tz);
    const newSearch = urlParams.toString();
    window.history.replaceState(
      null,
      "",
      newSearch ? `?${newSearch}` : window.location.pathname,
    );
  } catch {
    // ignore — URL writes are best-effort
  }
}

// ─── datetime-local helpers ──────────────────────────────────────────────────

/**
 * Formats a UTC ISO string as "YYYY-MM-DDTHH:MM" wall-clock string in the
 * given IANA timezone, suitable for use as a `datetime-local` input value.
 */
export function utcIsoToLocalString(utcIso: string, tz: string): string {
  const d = new Date(utcIso);
  const zoned = toZonedTime(d, tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    zoned.getFullYear() +
    "-" +
    pad(zoned.getMonth() + 1) +
    "-" +
    pad(zoned.getDate()) +
    "T" +
    pad(zoned.getHours()) +
    ":" +
    pad(zoned.getMinutes())
  );
}

/**
 * Parses a "YYYY-MM-DDTHH:MM" wall-clock string from a `datetime-local` input
 * and converts it to a UTC ISO string, treating the wall clock as being in the
 * given IANA timezone.
 */
export function localStringToUtcIso(localStr: string, tz: string): string {
  if (!localStr) return new Date().toISOString();
  const [datePart, timePart] = localStr.split("T");
  if (!datePart || !timePart) return new Date(localStr).toISOString();
  const [hh, mm] = timePart.split(":").map(Number);
  const [year, month, day] = datePart.split("-").map(Number);
  // Build a Date in the zoned representation then convert to UTC
  const zonedDate = new Date(year, month - 1, day, hh, mm, 0, 0);
  return fromZonedTime(zonedDate, tz).toISOString();
}
