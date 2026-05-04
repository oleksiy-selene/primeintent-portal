import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { getPresetRange } from "@/lib/dateRange";
import type { DateRange } from "@/lib/dateRange";

const STORAGE_KEY = "globalDateRange";

interface DateRangeContextValue {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  tzInitialized: boolean;
  setTzInitialized: (v: boolean) => void;
  hasPersistedRange: boolean;
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

function tryLoadFromStorage(): { range: DateRange; persisted: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DateRange>;
      if (parsed.from && parsed.to && parsed.preset && parsed.label) {
        return { range: parsed as DateRange, persisted: true };
      }
    }
  } catch {
  }
  return {
    range: getPresetRange("today", "America/New_York"),
    persisted: false,
  };
}

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [{ range: initial, persisted }] = useState(tryLoadFromStorage);
  const [dateRange, setDateRangeState] = useState<DateRange>(initial);
  const [hasPersistedRange] = useState(persisted);
  const [tzInitialized, setTzInitialized] = useState(persisted);

  const setDateRange = (range: DateRange) => {
    setDateRangeState(range);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(range));
    } catch {
    }
  };

  return (
    <DateRangeContext.Provider
      value={{ dateRange, setDateRange, tzInitialized, setTzInitialized, hasPersistedRange }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRangeContext(): DateRangeContextValue {
  const ctx = useContext(DateRangeContext);
  if (!ctx) throw new Error("useDateRangeContext must be used inside DateRangeProvider");
  return ctx;
}
