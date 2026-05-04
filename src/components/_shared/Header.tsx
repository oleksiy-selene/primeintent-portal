import type { ReactNode } from "react";
import { Search, Bell, ChevronDown, Globe } from "lucide-react";

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
  return (
    <header className="sticky top-0 z-10 bg-white border-b border-slate-200 px-8 py-4 flex items-center gap-6">
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
      <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md w-72">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          className="bg-transparent outline-none text-sm flex-1 placeholder:text-slate-400"
          placeholder="Search…"
        />
        <kbd className="text-[10px] text-slate-400 border border-slate-200 rounded px-1.5 py-0.5">
          ⌘K
        </kbd>
      </div>
      <button className="flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50">
        <Globe className="w-4 h-4 text-slate-500" />
        <span>Eastern Time (ET)</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>
      <button className="relative p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-50 rounded-md">
        <Bell className="w-4 h-4" />
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-rose-500" />
      </button>
      {right}
    </header>
  );
}
