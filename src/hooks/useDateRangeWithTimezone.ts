import { type DateRangeSelection } from "@/lib/dateRange";
import { useDateRangeContext } from "@/contexts/DateRangeContext";

/**
 * Returns the current date-range selection and a setter.
 * Pages should call resolvePresetRange(selection, tz) inside their queryFn
 * to get the actual { from, to } UTC ISO strings at fetch time.
 */
export function useDateRangeWithTimezone(): [DateRangeSelection, (sel: DateRangeSelection) => void] {
  const { selection, setSelection } = useDateRangeContext();
  return [selection, setSelection];
}
