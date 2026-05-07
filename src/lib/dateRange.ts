import { toZonedTime, fromZonedTime } from "date-fns-tz";
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  startOfMonth,
  subDays,
  subMonths,
} from "date-fns";

// ─── Typed IDs ────────────────────────────────────────────────────────────────

export type PresetId = "today" | "yesterday" | "this-week" | "last-7" | "this-month" | "last-30";

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
  { id: "yesterday", label: "Yesterday" },
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
 * Resolves a date-range selection to UTC ISO strings at the moment of the call
 * (late-binding). Supports two calling conventions:
 *
 *   resolvePresetRange(presetId, tz)   — takes a PresetId string directly
 *   resolvePresetRange(selection, tz)  — takes a full DateRangeSelection
 *
 * Uses the 4-step algorithm:
 *  1. Get current UTC instant
 *  2. Convert to target tz
 *  3. Compute period start in that tz
 *  4. Convert start back to UTC; end = now
 *
 * Custom ranges return their stored UTC ISO strings as-is (no boundary
 * calculation needed — the user chose explicit boundaries).
 */
export function resolvePresetRange(presetId: PresetId, tz: string): ResolvedRange;
export function resolvePresetRange(selection: DateRangeSelection, tz: string): ResolvedRange;
export function resolvePresetRange(
  selectionOrPreset: DateRangeSelection | PresetId,
  tz: string,
): ResolvedRange {
  const selection: DateRangeSelection =
    typeof selectionOrPreset === "string"
      ? { presetId: selectionOrPreset }
      : selectionOrPreset;

  if (selection.presetId === "custom") {
    return { from: selection.customFrom, to: selection.customTo };
  }

  const nowUtc = new Date();
  const nowZoned = toZonedTime(nowUtc, tz);

  if (selection.presetId === "yesterday") {
    const yd = subDays(nowZoned, 1);
    return {
      from: fromZonedTime(startOfDay(yd), tz).toISOString(),
      to: fromZonedTime(endOfDay(yd), tz).toISOString(),
    };
  }

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

/** Convenience alias for `resolvePresetRange(presetId, tz)` — both forms are identical. */
export const resolvePresetRangeById = (presetId: PresetId, tz: string): ResolvedRange =>
  resolvePresetRange(presetId, tz);

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

// ─── Compare / Reference Range ────────────────────────────────────────────────

/** Describes the comparison toggle state stored in context / URL / localStorage. */
export interface CompareSelection {
  enabled: boolean;
  shiftId: ShiftId;
  /** Only used when shiftId === "custom" */
  customDays: number;
}

export const DEFAULT_COMPARE: CompareSelection = {
  enabled: false,
  shiftId: "7d",
  customDays: 7,
};

/**
 * Which shift options are available for each preset (or for a custom selection).
 * The first entry in the array is the auto-selected default when switching presets.
 */
export const SHIFT_OPTIONS_FOR_PRESET: Record<PresetId | "custom", ShiftId[]> = {
  "today":      ["24h", "7d", "1mo", "custom"],
  "yesterday":  ["24h", "7d", "1mo", "custom"],
  "this-week":  ["7d", "1mo", "custom"],
  "last-7":     ["7d", "1mo", "custom"],
  "this-month": ["1mo", "custom"],
  "last-30":    ["1mo", "custom"],
  "custom":     ["custom"],
};

/** Human-readable labels for each shift option shown in the picker dropdown. */
export const SHIFT_DISPLAY_LABELS: Record<ShiftId, string> = {
  "24h": "Prior day",
  "7d":  "Prior week",
  "1mo": "Prior month",
  "custom": "Custom period",
};

/** Short display suffix for the "NOW −" notation in the resolved-range row. */
export const SHIFT_NOW_SUFFIX: Record<ShiftId, (customDays: number) => string> = {
  "24h":    () => "NOW − 24h",
  "7d":     () => "NOW − 7d",
  "1mo":    () => "NOW − 30d",
  "custom": (d) => `NOW − ${d}d`,
};

function shiftToMs(shiftId: ShiftId, customDays: number): number {
  switch (shiftId) {
    case "24h":    return 24 * 60 * 60 * 1000;
    case "7d":     return 7  * 24 * 60 * 60 * 1000;
    case "1mo":    return 30 * 24 * 60 * 60 * 1000;
    case "custom": return customDays * 24 * 60 * 60 * 1000;
  }
}

/**
 * Resolves the reference (comparison) range by shifting the base range backward
 * by the given ShiftId amount. The reference range has the same duration as the
 * base range, just offset into the past.
 */
export function resolveShiftedRange(
  selection: DateRangeSelection,
  shiftId: ShiftId,
  tz: string,
  customDays: number = 7,
): ResolvedRange {
  const base = resolvePresetRange(selection, tz);
  // "1mo" uses calendar-month subtraction (not a fixed 30-day ms offset) so
  // the reference period aligns with actual month boundaries regardless of
  // month length (28/29/30/31 days).
  if (shiftId === "1mo") {
    return {
      from: subMonths(new Date(base.from), 1).toISOString(),
      to:   subMonths(new Date(base.to),   1).toISOString(),
    };
  }
  const ms = shiftToMs(shiftId, customDays);
  return {
    from: new Date(new Date(base.from).getTime() - ms).toISOString(),
    to:   new Date(new Date(base.to).getTime()  - ms).toISOString(),
  };
}

/**
 * Normalizes a CompareSelection against the active DateRangeSelection, returning
 * a corrected copy if the stored shiftId is not valid for the current preset.
 * This is the authoritative normalization point — call it on context init and
 * whenever the selection changes.
 */
export function normalizeCompare(
  compare: CompareSelection,
  selection: DateRangeSelection,
): CompareSelection {
  const allowed = SHIFT_OPTIONS_FOR_PRESET[selection.presetId];
  if (!allowed.includes(compare.shiftId)) {
    return { ...compare, shiftId: allowed[0] };
  }
  return compare;
}

// ─── Compare URL / localStorage serialisation ─────────────────────────────────

const VALID_SHIFT_IDS: ShiftId[] = ["24h", "7d", "1mo", "custom"];

export function compareToUrlParams(compare: CompareSelection): Record<string, string> {
  if (!compare.enabled) return {};
  const params: Record<string, string> = {
    compare: "true",
    shift_id: compare.shiftId,
  };
  if (compare.shiftId === "custom") {
    params.shift_days = String(compare.customDays);
  }
  return params;
}

export function compareFromUrlParams(params: URLSearchParams): CompareSelection | null {
  if (params.get("compare") !== "true") return null;
  const shiftId = params.get("shift_id") as ShiftId | null;
  if (!shiftId || !(VALID_SHIFT_IDS as string[]).includes(shiftId)) return null;
  const rawDays = Number(params.get("shift_days") ?? "7");
  const customDays = Number.isFinite(rawDays) && rawDays > 0 ? rawDays : 7;
  return { enabled: true, shiftId, customDays };
}
