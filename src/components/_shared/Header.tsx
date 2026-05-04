import { useState, useRef, useEffect, type ReactNode } from "react";
import { Search, Bell, ChevronDown, Globe, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { TIMEZONES, tzLabel } from "@/lib/dateRange";
import { cn } from "@/lib/utils";

const TIMEZONE_OFFSETS: Record<string, string> = {
  "America/New_York": "-5",
  "America/Chicago": "-6",
  "America/Denver": "-7",
  "America/Los_Angeles": "-8",
  "America/Anchorage": "-9",
  "Pacific/Honolulu": "-10",
  UTC: "+0",
};

export function Header({
  title,
  subtitle,
  right,
  titleBadge,
}: {
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
  titleBadge?: ReactNode;
}) {
  const { profile, setTimezone } = useAuth();
  const tz = profile?.timezone ?? "America/New_York";

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSelectTz(value: string) {
    if (value === tz) {
      setOpen(false);
      return;
    }
    setSaving(true);
    try {
      await setTimezone(value);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-6">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">
            {title}
          </h1>
          {titleBadge}
        </div>
        {subtitle && (
          <div className="text-sm text-slate-500 mt-0.5">{subtitle}</div>
        )}
      </div>

      <div ref={popoverRef} className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          disabled={saving}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-60"
        >
          <Globe className="w-4 h-4 text-slate-500" />
          <span>{tzLabel(tz)}</span>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        </button>

        {open && (
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-slate-200 rounded-xl shadow-lg min-w-[320px] p-2">
            <div className="px-2 pb-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
              Timezone
            </div>
            <div className="max-h-80 overflow-auto space-y-1">
              {TIMEZONES.map((t) => {
                const offset = TIMEZONE_OFFSETS[t.value] ?? "+0";
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => void handleSelectTz(t.value)}
                    className={cn(
                      "w-full flex items-center justify-between gap-4 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-slate-50",
                      t.value === tz
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-700",
                    )}
                  >
                    <span className="min-w-0 flex items-center gap-2">
                      <span className="truncate">{t.label}</span>
                      <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                        GMT{offset}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0 text-xs text-slate-400">
                      <span className="tabular-nums">{offset}h</span>
                      {t.value === tz && (
                        <Check className="w-3.5 h-3.5 text-indigo-600" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {right}
    </header>
  );
}
