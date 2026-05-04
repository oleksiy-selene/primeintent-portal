export type PresetKey = "today" | "this-week" | "last-7" | "this-month" | "last-30";

export interface DateRange {
  from: string;
  to: string;
  preset: PresetKey | "custom";
  label: string;
}

export const PRESET_KEYS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this-week", label: "This Week" },
  { key: "last-7", label: "Last 7 Days" },
  { key: "this-month", label: "This Month" },
  { key: "last-30", label: "Last 30 Days" },
];

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

/**
 * Returns the UTC Date corresponding to midnight of `ymd` ("YYYY-MM-DD") in
 * the given IANA timezone.  DST-safe: we never add fixed milliseconds across a
 * day boundary; instead we adjust based on what UTC midnight looks like in `tz`.
 */
function tzMidnightFromYmd(tz: string, ymd: string): Date {
  // Create a candidate by treating ymd as UTC midnight.
  const utcMidnight = new Date(ymd + "T00:00:00.000Z");
  // Find out what hour:minute that UTC midnight maps to in the target timezone.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcMidnight);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  if (h === 0 && m === 0) return utcMidnight;
  // Positive-offset tz (ahead of UTC): UTC midnight shows as h:m that same day.
  // Negative-offset tz (behind UTC): UTC midnight shows as h:m the previous day (h ≥ 12).
  const adjMs =
    h < 12
      ? -(h * 60 + m) * 60_000
      : ((24 - h) * 60 - m) * 60_000;
  return new Date(utcMidnight.getTime() + adjMs);
}

/** Returns today's calendar date components in `tz`. */
function todayInTz(tz: string): { y: number; mo: number; d: number } {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const [y, mo, d] = ymd.split("-").map(Number);
  return { y, mo, d };
}

/**
 * Builds a "YYYY-MM-DD" string from UTC-based calendar arithmetic so that
 * day/month/year rollover is handled correctly without DST interference.
 */
function calendarYmd(y: number, mo: number, d: number): string {
  const dt = new Date(Date.UTC(y, mo - 1, d)); // handles month/year rollover
  return (
    dt.getUTCFullYear() +
    "-" +
    String(dt.getUTCMonth() + 1).padStart(2, "0") +
    "-" +
    String(dt.getUTCDate()).padStart(2, "0")
  );
}

/**
 * Formats a UTC ISO string as a "YYYY-MM-DDTHH:MM" wall-clock string in the
 * given IANA timezone, suitable for use as a `datetime-local` input value.
 */
export function utcIsoToLocalString(utcIso: string, tz: string): string {
  const d = new Date(utcIso);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  const year = get("year");
  const month = get("month");
  const day = get("day");
  // Intl can return "24" for midnight on some platforms; normalise to "00".
  const hour = get("hour") === "24" ? "00" : get("hour");
  const minute = get("minute");
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Parses a "YYYY-MM-DDTHH:MM" wall-clock string from a `datetime-local` input
 * and converts it to a UTC ISO string, treating the wall clock as being in the
 * given IANA timezone (not the browser's local timezone).
 */
export function localStringToUtcIso(localStr: string, tz: string): string {
  const [datePart, timePart] = localStr.split("T");
  if (!datePart || !timePart) return new Date(localStr).toISOString();
  const [hh, mm] = timePart.split(":").map(Number);
  // Find the UTC midnight of this calendar date in tz, then add hh:mm.
  const tzMidnight = tzMidnightFromYmd(tz, datePart);
  return new Date(tzMidnight.getTime() + (hh * 60 + mm) * 60_000).toISOString();
}

/**
 * Computes a timezone-aware DateRange for a preset key.
 *
 * `from` = start of the calendar period (midnight in `tz`).
 * `to`   = now (current UTC instant) — presets always end at "right now",
 *           never at an end-of-day boundary, so future-scheduled records are
 *           not included and DST end-of-day drift is irrelevant.
 */
export function getPresetRange(preset: PresetKey, tz: string): DateRange {
  const now = new Date();
  const nowIso = now.toISOString();
  const { y, mo, d } = todayInTz(tz);

  switch (preset) {
    case "today": {
      const start = tzMidnightFromYmd(tz, calendarYmd(y, mo, d));
      return { from: start.toISOString(), to: nowIso, preset, label: "Today" };
    }
    case "this-week": {
      // Find the day-of-week of today in tz using UTC-based date so we stay
      // in the calendar space of the target timezone (avoids local-tz leakage).
      const dow = new Date(Date.UTC(y, mo - 1, d)).getUTCDay(); // 0=Sun … 6=Sat
      const daysToMon = dow === 0 ? 6 : dow - 1;
      const start = tzMidnightFromYmd(tz, calendarYmd(y, mo, d - daysToMon));
      return { from: start.toISOString(), to: nowIso, preset, label: "This Week" };
    }
    case "last-7": {
      const start = tzMidnightFromYmd(tz, calendarYmd(y, mo, d - 6));
      return { from: start.toISOString(), to: nowIso, preset, label: "Last 7 Days" };
    }
    case "this-month": {
      const start = tzMidnightFromYmd(tz, calendarYmd(y, mo, 1));
      return { from: start.toISOString(), to: nowIso, preset, label: "This Month" };
    }
    case "last-30": {
      const start = tzMidnightFromYmd(tz, calendarYmd(y, mo, d - 29));
      return { from: start.toISOString(), to: nowIso, preset, label: "Last 30 Days" };
    }
  }
}
