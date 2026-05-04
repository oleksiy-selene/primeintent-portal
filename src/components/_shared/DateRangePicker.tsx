import { useState, useRef, useEffect } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  type DateRange,
  type PresetKey,
  PRESET_KEYS,
  getPresetRange,
  utcIsoToLocalString,
  localStringToUtcIso,
} from "@/lib/dateRange";
import { Button } from "@/components/ui/button";

export type { DateRange };

interface DateRangePickerProps {
  value: DateRange;
  onChange: (r: DateRange) => void;
  className?: string;
}

export function DateRangePicker({ value, onChange, className }: DateRangePickerProps) {
  const { profile } = useAuth();
  const tz = profile?.timezone ?? "America/New_York";

  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(value.preset === "custom");
  const [customFrom, setCustomFrom] = useState(
    value.preset === "custom" ? utcIsoToLocalString(value.from, tz) : "",
  );
  const [customTo, setCustomTo] = useState(
    value.preset === "custom" ? utcIsoToLocalString(value.to, tz) : "",
  );
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

  function selectPreset(key: PresetKey) {
    setShowCustom(false);
    onChange(getPresetRange(key, tz));
    setOpen(false);
  }

  function openCustom() {
    setShowCustom(true);
    // Pre-fill inputs in the user's selected timezone wall-clock time.
    setCustomFrom(utcIsoToLocalString(value.from, tz));
    setCustomTo(utcIsoToLocalString(value.to, tz));
  }

  function applyCustom() {
    if (!customFrom || !customTo) return;
    // Convert wall-clock times in the selected tz to UTC ISO strings.
    const from = localStringToUtcIso(customFrom, tz);
    const to = localStringToUtcIso(customTo, tz);
    if (from >= to) return; // guard: from must be before to
    const fmt = (s: string) =>
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date(s));
    const label = `${fmt(from)} – ${fmt(to)}`;
    onChange({ from, to, preset: "custom", label });
    setOpen(false);
  }

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 px-3 py-1.5 h-9 text-sm bg-white border border-slate-200 rounded-md hover:bg-slate-50 text-slate-700 whitespace-nowrap"
      >
        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
        <span>{value.label}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[220px] py-1">
          {PRESET_KEYS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectPreset(key)}
              className={cn(
                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors",
                value.preset === key
                  ? "text-indigo-600 font-medium bg-indigo-50/60"
                  : "text-slate-700",
              )}
            >
              {label}
            </button>
          ))}
          <div className="border-t border-slate-100 mt-1 pt-1">
            <button
              type="button"
              onClick={openCustom}
              className={cn(
                "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors",
                value.preset === "custom"
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
