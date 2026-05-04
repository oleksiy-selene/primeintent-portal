import { useEffect } from "react";
import { type DateRange } from "@/lib/dateRange";
import { getPresetRange, type PresetKey } from "@/lib/dateRange";
import { useDateRangeContext } from "@/contexts/DateRangeContext";

export function useDateRangeWithTimezone(
  defaultPreset: PresetKey,
  timezone: string | undefined,
): [DateRange, (range: DateRange) => void] {
  const { dateRange, setDateRange, tzInitialized, setTzInitialized } =
    useDateRangeContext();

  useEffect(() => {
    if (!timezone || tzInitialized) return;
    setTzInitialized(true);
    setDateRange(getPresetRange(defaultPreset, timezone));
  }, [timezone, tzInitialized, defaultPreset, setDateRange, setTzInitialized]);

  const handleDateRangeChange = (range: DateRange) => {
    setTzInitialized(true);
    setDateRange(range);
  };

  return [dateRange, handleDateRangeChange];
}
