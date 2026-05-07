import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useDateRangeContext } from "@/contexts/DateRangeContext";
import {
  type DateRangeSelection,
  type PresetId,
  type ShiftId,
  PRESETS,
  selectionLabel,
  utcIsoToLocalString,
  localStringToUtcIso,
  resolvePresetRange,
  resolveShiftedRange,
  SHIFT_OPTIONS_FOR_PRESET,
  SHIFT_DISPLAY_LABELS,
  SHIFT_NOW_SUFFIX,
} from "@/lib/dateRange";
import { Button } from "@/components/ui/button";

export type { DateRangeSelection };

interface DateRangePickerProps {
  value: DateRangeSelection;
  onChange: (sel: DateRangeSelection) => void;
  className?: string;
}

function fmtShort(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const { profile } = useAuth();
  const tz = profile?.timezone ?? "America/New_York";
  const { compare, setCompare } = useDateRangeContext();

  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value.presetId === "custom");

  const getInitialFrom = () => {
    if (value.presetId === "custom") return utcIsoToLocalString(value.customFrom, tz);
    const { from } = resolvePresetRange(value, tz);
    return utcIsoToLocalString(from, tz);
  };
  const getInitialTo = () => {
    if (value.presetId === "custom") return utcIsoToLocalString(value.customTo, tz);
    const { to } = resolvePresetRange(value, tz);
    return utcIsoToLocalString(to, tz);
  };

  const [customFrom, setCustomFrom] = useState(getInitialFrom);
  const [customTo, setCustomTo] = useState(getInitialTo);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Shift options allowed for the current preset
  const allowedShifts: ShiftId[] = SHIFT_OPTIONS_FOR_PRESET[value.presetId];
  const effectiveShiftId: ShiftId = allowedShifts.includes(compare.shiftId)
    ? compare.shiftId
    : allowedShifts[0];

  function selectPreset(id: PresetId) {
    setShowCustom(false);
    onChange({ presetId: id });
    // Auto-correct shiftId if it is not available for the new preset
    const allowed = SHIFT_OPTIONS_FOR_PRESET[id];
    if (!allowed.includes(compare.shiftId)) {
      setCompare({ ...compare, shiftId: allowed[0] });
    }
    setOpen(false);
  }

  function openCustom() {
    setShowCustom(true);
    if (value.presetId === "custom") {
      setCustomFrom(utcIsoToLocalString(value.customFrom, tz));
      setCustomTo(utcIsoToLocalString(value.customTo, tz));
    } else {
      const { from, to } = resolvePresetRange(value, tz);
      setCustomFrom(utcIsoToLocalString(from, tz));
      setCustomTo(utcIsoToLocalString(to, tz));
    }
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    const from = localStringToUtcIso(customFrom, tz);
    const to = localStringToUtcIso(customTo, tz);
    if (from >= to) return;
    onChange({ presetId: "custom", customFrom: from, customTo: to });
    // Auto-set shift to "custom" with duration-matching days
    const durationMs = new Date(to).getTime() - new Date(from).getTime();
    const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));
    setCompare({ ...compare, shiftId: "custom", customDays: durationDays });
    setOpen(false);
  }

  function handleShiftChange(id: ShiftId) {
    setCompare({ ...compare, shiftId: id });
  }

  function handleCustomDaysChange(val: string) {
    const d = Math.max(1, Math.min(365, Number(val) || 1));
    setCompare({ ...compare, customDays: d });
  }

  function toggleCompare() {
    if (!compare.enabled && value.presetId === "custom") {
      // When enabling compare for a custom selection, auto-set customDays to
      // the duration of the custom range so the reference period matches intent.
      const durationMs =
        new Date(value.customTo).getTime() - new Date(value.customFrom).getTime();
      const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)));
      setCompare({ ...compare, enabled: true, shiftId: "custom", customDays: durationDays });
    } else {
      setCompare({ ...compare, enabled: !compare.enabled });
    }
  }

  // Resolved ranges for the display rows (only computed when compare is enabled)
  let baseFrom = "";
  let baseTo = "";
  let refFrom = "";
  let refTo = "";
  const isPreset = value.presetId !== "custom";

  if (compare.enabled) {
    try {
      const base = resolvePresetRange(value, tz);
      const ref = resolveShiftedRange(value, effectiveShiftId, tz, compare.customDays);
      baseFrom = fmtShort(base.from, tz);
      baseTo = isPreset ? "NOW" : fmtShort(base.to, tz);
      refFrom = fmtShort(ref.from, tz);
      refTo = isPreset
        ? SHIFT_NOW_SUFFIX[effectiveShiftId](compare.customDays)
        : fmtShort(ref.to, tz);
    } catch {
      // keep empty strings — display will show nothing
    }
  }

  const label = selectionLabel(value, tz);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 h-9 text-sm bg-white border rounded-md hover:bg-slate-50 text-slate-700 whitespace-nowrap",
          compare.enabled ? "border-indigo-300 bg-indigo-50/40" : "border-slate-200",
        )}
      >
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span>{label}</span>
        {compare.enabled && (
          <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-100 rounded px-1 py-0.5 leading-none">
            vs
          </span>
        )}
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[280px] py-1">

          {/* ── Presets ─────────────────────────────────────────────── */}
          {PRESETS.map(({ id, label: presetLabel }) => (
            <button
              key={id}
              type="button"
              onClick={() => selectPreset(id)}
              className={cn(
                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors",
                value.presetId === id
                  ? "text-indigo-600 font-medium bg-indigo-50/60"
                  : "text-slate-700",
              )}
            >
              {presetLabel}
            </button>
          ))}

          {/* ── Custom range ─────────────────────────────────────────── */}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={openCustom}
              className={cn(
                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors",
                value.presetId === "custom"
                  ? "text-indigo-600 font-medium bg-indigo-50/60"
                  : "text-slate-700",
              )}
            >
              Custom…
            </button>
            {showCustom && (
              <div className="px-4 pb-3 pt-2 space-y-2">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    From ({profile?.timezone ?? "America/New_York"})
                  </label>
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    To ({profile?.timezone ?? "America/New_York"})
                  </label>
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400"
                  />
                </div>
                <Button
                  size="sm"
                  onClick={applyCustom}
                  disabled={!customFrom || !customTo}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
                >
                  Apply
                </Button>
              </div>
            )}
          </div>

          {/* ── Compare section ──────────────────────────────────────── */}
          <div className="border-t border-slate-100 mt-1 pt-1">
            {/* Toggle row */}
            <div className="flex items-center justify-between px-4 py-2">
              <span className="text-sm font-medium text-slate-700">Compare</span>
              <button
                type="button"
                role="switch"
                aria-checked={compare.enabled}
                onClick={toggleCompare}
                className={cn(
                  "relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors cursor-pointer focus-visible:outline-none",
                  compare.enabled ? "bg-indigo-600" : "bg-slate-200",
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-3 w-3 rounded-full bg-white shadow-sm ring-0 transition-transform",
                    compare.enabled ? "translate-x-3" : "translate-x-0",
                  )}
                />
              </button>
            </div>

            {compare.enabled && (
              <div className="px-4 pb-3 space-y-2">
                {/* Shift selector */}
                <select
                  value={effectiveShiftId}
                  onChange={(e) => handleShiftChange(e.target.value as ShiftId)}
                  className="w-full text-xs border border-slate-200 rounded px-2 py-1.5 outline-none focus:ring-1 focus:ring-indigo-400 bg-white text-slate-700 cursor-pointer"
                >
                  {allowedShifts.map((id) => (
                    <option key={id} value={id}>
                      {SHIFT_DISPLAY_LABELS[id]}
                    </option>
                  ))}
                </select>

                {/* Custom days input */}
                {effectiveShiftId === "custom" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={365}
                      value={compare.customDays}
                      onChange={(e) => handleCustomDaysChange(e.target.value)}
                      className="w-20 text-xs border border-slate-200 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-400 text-right"
                    />
                    <span className="text-xs text-slate-500">days ago</span>
                  </div>
                )}

                {/* Resolved range display */}
                {baseFrom && (
                  <div className="pt-1 border-t border-slate-100 space-y-1.5">
                    <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      Resolved ranges
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-indigo-500 w-6 shrink-0 pt-0.5">
                        Base
                      </span>
                      <span className="text-[11px] text-slate-600 font-mono leading-tight">
                        {baseFrom} → {baseTo}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-6 shrink-0 pt-0.5">
                        vs
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono leading-tight">
                        {refFrom} → {refTo}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
