import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";

export function AppLayout({
  active,
  children,
}: {
  active: string;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans antialiased">
      <Sidebar active={active} />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
