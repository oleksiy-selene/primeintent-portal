import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  type DateRangeSelection,
  type PresetId,
  PRESETS,
  selectionLabel,
  utcIsoToLocalString,
  localStringToUtcIso,
  resolvePresetRange,
} from "@/lib/dateRange";
import { Button } from "@/components/ui/button";

export type { DateRangeSelection };

interface DateRangePickerProps {
  value: DateRangeSelection;
  onChange: (sel: DateRangeSelection) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const { profile } = useAuth();
  const tz = profile?.timezone ?? "America/New_York";

  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value.presetId === "custom");

  // For the custom inputs, initialise from current selection
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

  function selectPreset(id: PresetId) {
    setShowCustom(false);
    onChange({ presetId: id });
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
    setOpen(false);
  }

  const label = selectionLabel(value, tz);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 h-9 text-sm bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 whitespace-nowrap"
      >
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span>{label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[220px] py-1">
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
        </div>
      )}
    </div>
  );
}
