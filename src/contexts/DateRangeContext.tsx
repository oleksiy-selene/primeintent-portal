import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  type DateRangeSelection,
  type CompareSelection,
  type PresetId,
  PRESET_IDS,
  DEFAULT_COMPARE,
  selectionFromUrlParams,
  selectionToUrlParams,
  compareFromUrlParams,
  compareToUrlParams,
  normalizeCompare,
} from "@/lib/dateRange";

const STORAGE_KEY = "drSelection";
const COMPARE_STORAGE_KEY = "drCompare";
const DEFAULT_SELECTION: DateRangeSelection = { presetId: "today" };

// ─── Helpers — selection ──────────────────────────────────────────────────────

function isValidSelection(v: unknown): v is DateRangeSelection {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  if (o.presetId === "custom") {
    return typeof o.customFrom === "string" && typeof o.customTo === "string";
  }
  return typeof o.presetId === "string" && (PRESET_IDS as string[]).includes(o.presetId as string);
}

function readSelectionFromUrl(): DateRangeSelection | null {
  try {
    return selectionFromUrlParams(new URLSearchParams(window.location.search));
  } catch {
    return null;
  }
}

function readSelectionFromStorage(): DateRangeSelection | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidSelection(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistSelection(selection: DateRangeSelection) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch { /* ignore */ }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const rangeParams = selectionToUrlParams(selection);
    urlParams.delete("range_id");
    urlParams.delete("start");
    urlParams.delete("end");
    for (const [k, v] of Object.entries(rangeParams)) {
      urlParams.set(k, v);
    }
    const newSearch = urlParams.toString();
    window.history.replaceState(null, "", newSearch ? `?${newSearch}` : window.location.pathname);
  } catch { /* ignore */ }
}

// ─── Helpers — compare ────────────────────────────────────────────────────────

function isValidCompare(v: unknown): v is CompareSelection {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.enabled === "boolean" &&
    typeof o.shiftId === "string" &&
    ["24h", "7d", "1mo", "custom"].includes(o.shiftId as string) &&
    typeof o.customDays === "number"
  );
}

function readCompareFromUrl(): CompareSelection | null {
  try {
    return compareFromUrlParams(new URLSearchParams(window.location.search));
  } catch {
    return null;
  }
}

function readCompareFromStorage(): CompareSelection | null {
  try {
    const raw = localStorage.getItem(COMPARE_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidCompare(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function persistCompare(compare: CompareSelection) {
  try {
    localStorage.setItem(COMPARE_STORAGE_KEY, JSON.stringify(compare));
  } catch { /* ignore */ }
  try {
    const urlParams = new URLSearchParams(window.location.search);
    // Remove stale compare keys
    urlParams.delete("compare");
    urlParams.delete("shift_id");
    urlParams.delete("shift_days");
    const cmpParams = compareToUrlParams(compare);
    for (const [k, v] of Object.entries(cmpParams)) {
      urlParams.set(k, v);
    }
    const newSearch = urlParams.toString();
    window.history.replaceState(null, "", newSearch ? `?${newSearch}` : window.location.pathname);
  } catch { /* ignore */ }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DateRangeContextValue {
  selection: DateRangeSelection;
  setSelection: (sel: DateRangeSelection) => void;
  compare: CompareSelection;
  setCompare: (c: CompareSelection) => void;
  // Legacy fields — kept so any remaining callers don't break immediately
  /** @deprecated Use selection + resolvePresetRange instead */
  tzInitialized: boolean;
  /** @deprecated Use selection + resolvePresetRange instead */
  setTzInitialized: (v: boolean) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

export function DateRangeProvider({ children }: { children: ReactNode }) {
  // Compute initial values once; normalise compare against selection so that
  // stale URL/localStorage state (e.g. shift_id=24h with preset=this-month)
  // is corrected before the first render.
  const [initials] = useState(() => {
    const sel = readSelectionFromUrl() ?? readSelectionFromStorage() ?? DEFAULT_SELECTION;
    const cmp = normalizeCompare(
      readCompareFromUrl() ?? readCompareFromStorage() ?? DEFAULT_COMPARE,
      sel,
    );
    return { sel, cmp };
  });

  const [selection, setSelectionState] = useState<DateRangeSelection>(initials.sel);
  const [compare, setCompareState] = useState<CompareSelection>(initials.cmp);

  // Sync URL on mount so it reflects whatever was loaded from storage
  useEffect(() => {
    persistSelection(selection);
    persistCompare(compare);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSelection = (sel: DateRangeSelection) => {
    setSelectionState(sel);
    persistSelection(sel);
    // Normalise shiftId whenever the preset changes so compare state stays valid
    setCompareState((prev) => {
      const normalised = normalizeCompare(prev, sel);
      if (normalised.shiftId !== prev.shiftId) {
        persistCompare(normalised);
        return normalised;
      }
      return prev;
    });
  };

  const setCompare = (c: CompareSelection) => {
    setCompareState(c);
    persistCompare(c);
  };

  return (
    <DateRangeContext.Provider
      value={{
        selection,
        setSelection,
        compare,
        setCompare,
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
  return readSelectionFromStorage() ?? DEFAULT_SELECTION;
}

// Re-export PresetId so callers importing from the context file keep working
export type { PresetId };
