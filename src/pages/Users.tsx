import { useMemo, useState, type FormEvent } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout } from "@/components/_shared/AppLayout";
import { Header } from "@/components/_shared/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { inviteUser } from "@/lib/api";
import { useSortState } from "@/lib/useSortState";
import { SortableHeader } from "@/components/SortableHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  UserPlus,
  Shield,
  CheckCircle2,
  Search,
  Loader2,
} from "lucide-react";
import { formatDate, relativeTime } from "@/lib/format";

type UsersSortKey = "display_name" | "role" | "created_at" | "last_sign_in_at";

interface ProfileRow {
  user_id: string;
  email: string;
  display_name: string | null;
  role: "admin" | "manager" | "viewer";
  created_at: string;
  last_sign_in_at: string | null;
}

const ROLE_ORDER: Record<string, number> = { admin: 0, manager: 1, viewer: 2 };

async function fetchProfiles(): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("user_id, email, display_name, role, created_at, last_sign_in_at");
  if (error) throw error;
  return (data ?? []) as ProfileRow[];
}

function avatarFor(name: string) {
  return name
    .split(/[\s@.]+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function sortProfiles(
  rows: ProfileRow[],
  sortKey: UsersSortKey | null,
  sortDir: "asc" | "desc",
): ProfileRow[] {
  if (!sortKey) return rows;
  return [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortKey === "display_name") {
      const aName = (a.display_name ?? a.email).toLowerCase();
      const bName = (b.display_name ?? b.email).toLowerCase();
      cmp = aName.localeCompare(bName);
    } else if (sortKey === "role") {
      cmp = (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99);
    } else if (sortKey === "created_at") {
      cmp = a.created_at.localeCompare(b.created_at);
    } else if (sortKey === "last_sign_in_at") {
      const aVal = a.last_sign_in_at ?? "";
      const bVal = b.last_sign_in_at ?? "";
      cmp = aVal.localeCompare(bVal);
    }
    return sortDir === "asc" ? cmp : -cmp;
  });
}

function InviteDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "manager" | "viewer">("viewer");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: () => inviteUser(email.trim(), role),
    onSuccess: () => {
      setSuccess(`Invitation sent to ${email}`);
      setEmail("");
      void qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (e: unknown) =>
      setError(e instanceof Error ? e.message : "Invite failed"),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    invite.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="w-10 h-10 bg-indigo-50 rounded-lg flex items-center justify-center mb-3 border border-indigo-100">
            <UserPlus className="w-5 h-5 text-indigo-600" />
          </div>
          <DialogTitle>Invite a new user</DialogTitle>
          <DialogDescription>
            They will receive an email with a link to set up their account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="invite-email">Email address</Label>
            <Input
              id="invite-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
            />
          </div>

          <div className="space-y-3">
            <Label>Role</Label>
            <RadioGroup
              value={role}
              onValueChange={(v) =>
                setRole(v as "admin" | "manager" | "viewer")
              }
              className="grid gap-3"
            >
              <Label
                htmlFor="role-admin"
                className="flex flex-col gap-1 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 [&:has([data-state=checked])]:border-indigo-600 [&:has([data-state=checked])]:bg-indigo-50/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="admin"
                    id="role-admin"
                    className="text-indigo-600 border-slate-300"
                  />
                  <span className="font-semibold text-slate-900">Admin</span>
                </div>
                <span className="text-sm text-slate-500 ml-6">
                  Full access including inviting and managing users.
                </span>
              </Label>

              <Label
                htmlFor="role-manager"
                className="flex flex-col gap-1 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 [&:has([data-state=checked])]:border-indigo-600 [&:has([data-state=checked])]:bg-indigo-50/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="manager"
                    id="role-manager"
                    className="text-indigo-600 border-slate-300"
                  />
                  <span className="font-semibold text-slate-900">Manager</span>
                </div>
                <span className="text-sm text-slate-500 ml-6">
                  Create and edit partners and campaigns. Cannot manage users.
                </span>
              </Label>

              <Label
                htmlFor="role-viewer"
                className="flex flex-col gap-1 p-4 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 [&:has([data-state=checked])]:border-indigo-600 [&:has([data-state=checked])]:bg-indigo-50/50 transition-all"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    value="viewer"
                    id="role-viewer"
                    className="text-indigo-600 border-slate-300"
                  />
                  <span className="font-semibold text-slate-900">Viewer</span>
                </div>
                <span className="text-sm text-slate-500 ml-6">
                  Read-only access to dashboards and reports.
                </span>
              </Label>
            </RadioGroup>
          </div>

          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
              {success}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Close
            </Button>
            <Button
              type="submit"
              disabled={invite.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {invite.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Send invite"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Users() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const profiles = useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });

  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const { sortKey, sortDir, toggleSort, resetSort } = useSortState<UsersSortKey>(
    "created_at",
    "desc",
  );

  const rows = useMemo(() => {
    const filtered = (profiles.data ?? []).filter((p) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        p.email.toLowerCase().includes(q) ||
        (p.display_name ?? "").toLowerCase().includes(q)
      );
    });
    return sortProfiles(filtered, sortKey, sortDir);
  }, [profiles.data, search, sortKey, sortDir]);

  return (
    <AppLayout active="users">
      <Header
        title="Team Members"
        subtitle="Manage your team members and their account permissions here."
        right={
          isAdmin ? (
            <Button
              onClick={() => setOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <UserPlus className="w-4 h-4" />
              Invite User
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 p-8 space-y-8 bg-slate-50/50">
        <div className="flex items-center gap-4 bg-white border border-slate-200 rounded-lg p-1 shadow-sm w-fit">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value === "") resetSort(); }}
              placeholder="Search users..."
              className="pl-9 pr-4 py-1.5 text-sm outline-none w-64 bg-transparent"
            />
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/80">
              <TableRow className="border-slate-200 hover:bg-transparent">
                <SortableHeader
                  label="User"
                  sortKey="display_name"
                  activeSortKey={sortKey}
                  activeSortDir={sortDir}
                  onSort={(k) => toggleSort(k as UsersSortKey)}
                  className="font-medium text-slate-600"
                />
                <SortableHeader
                  label="Role"
                  sortKey="role"
                  activeSortKey={sortKey}
                  activeSortDir={sortDir}
                  onSort={(k) => toggleSort(k as UsersSortKey)}
                  className="font-medium text-slate-600"
                />
                <TableHead className="font-medium text-slate-600">
                  Status
                </TableHead>
                <SortableHeader
                  label="Joined"
                  sortKey="created_at"
                  activeSortKey={sortKey}
                  activeSortDir={sortDir}
                  onSort={(k) => toggleSort(k as UsersSortKey)}
                  className="font-medium text-slate-600"
                />
                <SortableHeader
                  label="Last active"
                  sortKey="last_sign_in_at"
                  activeSortKey={sortKey}
                  activeSortDir={sortDir}
                  onSort={(k) => toggleSort(k as UsersSortKey)}
                  className="font-medium text-slate-600"
                />
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.isLoading && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-slate-400 py-10"
                  >
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading users…
                  </TableCell>
                </TableRow>
              )}
              {!profiles.isLoading && rows.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-slate-400 py-10"
                  >
                    No users found.
                  </TableCell>
                </TableRow>
              )}
              {rows.map((u) => {
                const name = u.display_name ?? u.email.split("@")[0];
                return (
                  <TableRow
                    key={u.user_id}
                    className="border-slate-100 hover:bg-slate-50/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-100">
                          <AvatarFallback className="bg-slate-100 text-slate-600 text-xs font-medium">
                            {avatarFor(name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-900">
                            {name}
                          </span>
                          <span className="text-xs text-slate-500">
                            {u.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {u.role === "admin" && (
                        <Badge className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 border border-indigo-100/50 font-medium gap-1 px-2 py-0.5">
                          <Shield className="w-3 h-3" />
                          Admin
                        </Badge>
                      )}
                      {u.role === "manager" && (
                        <Badge className="bg-violet-50 text-violet-700 hover:bg-violet-50 border border-violet-100/50 font-medium px-2 py-0.5">
                          Manager
                        </Badge>
                      )}
                      {u.role === "viewer" && (
                        <Badge
                          variant="outline"
                          className="text-slate-600 border-slate-200 bg-slate-50 font-normal px-2 py-0.5"
                        >
                          Viewer
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-emerald-600 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="font-medium">Active</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {formatDate(u.created_at)}
                    </TableCell>
                    <TableCell className="text-sm text-slate-600">
                      {relativeTime(u.last_sign_in_at)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>

      {open && <InviteDialog open={open} onOpenChange={setOpen} />}
    </AppLayout>
  );
}
