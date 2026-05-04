import { Link } from "wouter";
import {
  LayoutDashboard,
  Users as UsersIcon,
  Megaphone,
  Activity,
  UserCog,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { key: "partners", label: "Partners", icon: UsersIcon, href: "/partners" },
  {
    key: "campaigns",
    label: "Campaigns",
    icon: Megaphone,
    href: "/campaigns",
  },
  { key: "visitors", label: "Visitors", icon: Activity, href: "/visitors" },
  { key: "users", label: "Users", icon: UserCog, href: "/users" },
];

export function Sidebar({ active }: { active: string }) {
  const { profile, user, signOut } = useAuth();
  const email = profile?.email ?? user?.email ?? "";
  const displayName = profile?.display_name ?? email.split("@")[0] ?? "User";
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="w-60 shrink-0 bg-slate-950 text-slate-200 flex flex-col h-screen sticky top-0 border-r border-slate-900">
      <div className="px-5 py-5 flex items-center border-b border-slate-900">
        <img
          src="/prime-intent-logo.png"
          alt="Prime Intent"
          className="h-8 w-auto object-contain brightness-0 invert"
        />
      </div>
      <nav className="flex-1 p-3 space-y-0.5">
        {NAV.map(({ key, label, icon: Icon, href }) => {
          const isActive = key === active;
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-slate-800 text-white"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {isActive && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-400" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-slate-900">
        <button
          type="button"
          onClick={() => void signOut()}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-slate-900 cursor-pointer text-left"
          title="Sign out"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-xs font-semibold text-white">
            {initials || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-white truncate">{displayName}</div>
            <div className="text-[11px] text-slate-500 truncate">{email}</div>
          </div>
          <LogOut className="w-4 h-4 text-slate-500" />
        </button>
      </div>
    </aside>
  );
}
