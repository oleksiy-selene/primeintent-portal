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

function toTzMidnight(tz: string, ref: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(ref);
  const utcMidnight = new Date(ymd + "T00:00:00.000Z");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(utcMidnight);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0");
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0");
  if (h === 0 && m === 0) return utcMidnight;
  const adjMs =
    h < 12
      ? -(h * 60 + m) * 60_000
      : ((24 - h) * 60 - m) * 60_000;
  return new Date(utcMidnight.getTime() + adjMs);
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getTime() + n * 86_400_000);
}

function endOfDay(start: Date): Date {
  return new Date(start.getTime() + 86_400_000 - 1);
}

export function getPresetRange(preset: PresetKey, tz: string): DateRange {
  const now = new Date();
  const todayStart = toTzMidnight(tz, now);

  switch (preset) {
    case "today": {
      return {
        from: todayStart.toISOString(),
        to: endOfDay(todayStart).toISOString(),
        preset,
        label: "Today",
      };
    }
    case "this-week": {
      const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
      const [y, mo, d] = ymd.split("-").map(Number);
      const dow = new Date(y, mo - 1, d).getDay();
      const daysToMon = dow === 0 ? 6 : dow - 1;
      const monStart = addDays(todayStart, -daysToMon);
      return {
        from: monStart.toISOString(),
        to: endOfDay(todayStart).toISOString(),
        preset,
        label: "This Week",
      };
    }
    case "last-7": {
      const start = addDays(todayStart, -6);
      return {
        from: start.toISOString(),
        to: endOfDay(todayStart).toISOString(),
        preset,
        label: "Last 7 Days",
      };
    }
    case "this-month": {
      const ymd = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
      const [y, mo] = ymd.split("-").map(Number);
      const firstOfMonth = new Date(y, mo - 1, 1);
      const monthStart = toTzMidnight(tz, firstOfMonth);
      return {
        from: monthStart.toISOString(),
        to: endOfDay(todayStart).toISOString(),
        preset,
        label: "This Month",
      };
    }
    case "last-30": {
      const start = addDays(todayStart, -29);
      return {
        from: start.toISOString(),
        to: endOfDay(todayStart).toISOString(),
        preset,
        label: "Last 30 Days",
      };
    }
  }
}
