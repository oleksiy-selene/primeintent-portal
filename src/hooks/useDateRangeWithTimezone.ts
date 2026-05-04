import { useState, useRef, useEffect } from "react";
import { type DateRange } from "@/components/_shared/DateRangePicker";
import { getPresetRange, type PresetKey } from "@/lib/dateRange";

export function useDateRangeWithTimezone(
  defaultPreset: PresetKey,
  timezone: string | undefined,
): [DateRange, (range: DateRange) => void] {
  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getPresetRange(defaultPreset, timezone ?? "America/New_York"),
  );
  const tzInitializedRef = useRef(false);
  const userTouchedRef = useRef(false);

  const handleDateRangeChange = (range: DateRange) => {
    userTouchedRef.current = true;
    setDateRange(range);
  };

  useEffect(() => {
    const tz = timezone;
    if (!tz || tzInitializedRef.current || userTouchedRef.current) return;
    tzInitializedRef.current = true;
    setDateRange(getPresetRange(defaultPreset, tz));
  }, [timezone, defaultPreset]);

  return [dateRange, handleDateRangeChange];
}
