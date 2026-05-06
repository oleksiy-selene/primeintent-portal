import { type DateRangeSelection, type CompareSelection } from "@/lib/dateRange";
import { useDateRangeContext } from "@/contexts/DateRangeContext";

export interface DateRangeHookResult {
  selection: DateRangeSelection;
  setSelection: (sel: DateRangeSelection) => void;
  compare: CompareSelection;
  setCompare: (c: CompareSelection) => void;
}

/**
 * Returns the current date-range selection, its setter, and the compare state
 * (toggle + shift selection). Pages should call resolvePresetRange(selection, tz)
 * inside their queryFn to get the actual { from, to } UTC ISO strings at fetch time.
 *
 * When compare.enabled is true, pages can also call
 * resolveShiftedRange(selection, compare.shiftId, tz, compare.customDays)
 * to get the reference range (Task #15 wires up the second fetch).
 */
export function useDateRangeWithTimezone(): DateRangeHookResult {
  const { selection, setSelection, compare, setCompare } = useDateRangeContext();
  return { selection, setSelection, compare, setCompare };
}
