import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  type DateRangeSelection,
  type PresetId,
  PRESET_IDS,
  selectionFromUrlParams,
  selectionToUrlParams,
} from "@/lib/dateRange";

const STORAGE_KEY = "drSelection";
const DEFAULT_SELECTION: DateRangeSelection = { presetId: "today" };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidSelection(v: unknown): v is DateRangeSelection {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.presetId === "custom") {
    return typeof o.customFrom === "string" && typeof o.customTo === "string";
  }
  return typeof o.presetId === "string" && (PRESET_IDS as string[]).includes(o.presetId as string);
}

function readFromUrl(): DateRangeSelection | null {
  try {
    return selectionFromUrlParams(new URLSearchParams(window.location.search));
  } catch {
    return null;
  }
}

function readFromStorage(): DateRangeSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSelection(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persist(selection: DateRangeSelection) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch {
    // ignore
  }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const rangeParams = selectionToUrlParams(selection);
    // Remove stale range keys first
    urlParams.delete("range_id");
    urlParams.delete("start");
    urlParams.delete("end");
    for (const [k, v] of Object.entries(rangeParams)) {
      urlParams.set(k, v);
    }
    const newSearch = urlParams.toString();
    window.history.replaceState(null, "", newSearch ? `?${newSearch}` : window.location.pathname);
  } catch {
    // ignore
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DateRangeContextValue {
  selection: DateRangeSelection;
  setSelection: (sel: DateRangeSelection) => void;
  // Legacy fields — kept so any remaining callers don't break immediately
  /** @deprecated Use selection + resolvePresetRange instead */
  tzInitialized: boolean;
  /** @deprecated Use selection + resolvePresetRange instead */
  setTzInitialized: (v: boolean) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [selection, setSelectionState] = useState<DateRangeSelection>(
    () => readFromUrl() ?? readFromStorage() ?? DEFAULT_SELECTION,
  );

  // Sync URL on mount so it reflects whatever was loaded from storage
  useEffect(() => {
    persist(selection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelection = (sel: DateRangeSelection) => {
    setSelectionState(sel);
    persist(sel);
  };

  return (
    <DateRangeContext.Provider
      value={{
        selection,
        setSelection,
        // Legacy shims
        tzInitialized: true,
        setTzInitialized: () => {},
      }}
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

// Keeping the old tryLoadFromStorage export so any import doesn't crash
export function tryLoadFromStorage() {
  return readFromStorage() ?? DEFAULT_SELECTION;
}
