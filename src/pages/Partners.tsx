import { useMemo, useState, useEffect, useRef, type FormEvent } from "react";
import { cn } from "@/lib/utils";
import { DateRangePicker, type DateRange } from "@/components/_shared/DateRangePicker";
import { getPresetRange } from "@/lib/dateRange";
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useLocation } from "wouter";
import { AppLayout } from "@/components/_shared/AppLayout";
import { Header } from "@/components/_shared/Header";
import { useAuth } from "@/contexts/AuthContext";
import { num, usd, formatDate, formatTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useInfiniteScroll, PAGE_SIZE } from "@/lib/useInfiniteScroll";
import { useSortState } from "@/lib/useSortState";
import { SortableHeader } from "@/components/SortableHeader";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search, Loader2, Copy, Check } from "lucide-react";

function UidCopy({ uid }: { uid: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="inline-flex items-center gap-1 font-mono">
      {uid.slice(0, 8)}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void navigator.clipboard.writeText(uid).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          });
        }}
        className="cursor-pointer text-slate-400 hover:text-indigo-500 transition-colors"
        title="Copy full UID"
      >
        {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
      </button>
    </span>
  );
}

type PartnersSortKey = "name" | "partner_type_id" | "created_at";

interface PartnerType {
  partner_type_id: number;
  name: string;
}

interface PartnerStatus {
  partner_status_id: number;
  name: string;
}

interface PartnerRow {
  partner_id: number;
  partner_uid: string;
  name: string;
  partner_type_id: number;
  partner_status_id: number | null;
  postback_url: string | null;
  created_at: string;
  enum_partner_type: { name: string } | null;
  enum_partner_status: { name: string } | null;
  campaigns: { count: number }[] | null;
}

interface PerfTotals {
  visitors: number;
  revenue: number;
  cost: number;
}

interface PartnersFilter {
  search: string;
  typeFilter: string;
  statusFilter: string;
  sortKey: PartnersSortKey;
  sortDir: "asc" | "desc";
}

async function fetchPartnersPage(
  filter: PartnersFilter,
  pageIndex: number,
): Promise<{ rows: PartnerRow[]; hasMore: boolean }> {
  const from = pageIndex * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("partners")
    .select(
      `
      partner_id,
      partner_uid,
      name,
      partner_type_id,
      partner_status_id,
      postback_url,
      created_at,
      enum_partner_type:enum_partner_type!partners_partner_type_id_fkey ( name ),
      enum_partner_status:enum_partner_status!partners_partner_status_id_fkey ( name ),
      campaigns!campaigns_partner_id_fkey ( count )
    `,
    )
    .range(from, to);

  if (filter.sortKey === "partner_type_id") {
    query = query.order("name", {
      foreignTable: "enum_partner_type",
      ascending: filter.sortDir === "asc",
    });
  } else {
    query = query.order(filter.sortKey, { ascending: filter.sortDir === "asc" });
  }

  if (filter.search.trim()) {
    query = query.ilike("name", `%${filter.search.trim()}%`);
  }
  if (filter.typeFilter !== "all") {
    query = query.eq("partner_type_id", Number(filter.typeFilter));
  }
  if (filter.statusFilter !== "all") {
    query = query.eq("partner_status_id", Number(filter.statusFilter));
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as PartnerRow[];
  return { rows, hasMore: rows.length === PAGE_SIZE };
}

async function fetchPartnerTypes(): Promise<PartnerType[]> {
  const { data, error } = await supabase
    .from("enum_partner_type")
    .select("partner_type_id, name")
    .order("partner_type_id");
  if (error) throw error;
  return (data ?? []) as PartnerType[];
}

async function fetchPartnerStatuses(): Promise<PartnerStatus[]> {
  const { data, error } = await supabase
    .from("enum_partner_status")
    .select("partner_status_id, name")
    .order("partner_status_id");
  if (error) throw error;
  return (data ?? []) as PartnerStatus[];
}

async function fetchPartnerPerf(
  partnerIds: number[],
  range: { from: string; to: string },
): Promise<Map<number, PerfTotals>> {
  const result = new Map<number, PerfTotals>();
  partnerIds.forEach((id) => result.set(id, { visitors: 0, revenue: 0, cost: 0 }));
  if (partnerIds.length === 0) return result;

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("campaign_id, partner_id")
    .in("partner_id", partnerIds);

  if (!campaigns || campaigns.length === 0) return result;

  const campaignIds = (campaigns as { campaign_id: number; partner_id: number }[]).map(
    (c) => c.campaign_id,
  );
  const campaignToPartner = new Map(
    (campaigns as { campaign_id: number; partner_id: number }[]).map((c) => [
      c.campaign_id,
      c.partner_id,
    ]),
  );

  const [visitorsRes, conversionsRes, expensesRes] = await Promise.all([
    supabase
      .from("visitors")
      .select("campaign_id")
      .in("campaign_id", campaignIds)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    supabase
      .from("visitor_conversions")
      .select(
        `payout_amount, enum_conversion_status!inner ( name ), visitors!inner ( campaign_id )`,
      )
      .eq("enum_conversion_status.name", "approved")
      .in("visitors.campaign_id", campaignIds)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    supabase
      .from("campaign_expenses")
      .select("campaign_id, amount")
      .in("campaign_id", campaignIds)
      .gte("start_time", range.from)
      .lte("start_time", range.to),
  ]);

  for (const v of (visitorsRes.data ?? []) as Array<{ campaign_id: number }>) {
    const pid = campaignToPartner.get(v.campaign_id);
    if (pid != null) {
      const t = result.get(pid);
      if (t) t.visitors += 1;
    }
  }

  for (const c of (conversionsRes.data ?? []) as Array<{
    payout_amount: number;
    visitors: { campaign_id: number };
  }>) {
    const cid = c.visitors?.campaign_id;
    const pid = cid != null ? campaignToPartner.get(cid) : undefined;
    if (pid != null) {
      const t = result.get(pid);
      if (t) t.revenue += Number(c.payout_amount ?? 0);
    }
  }

  for (const e of (expensesRes.data ?? []) as Array<{
    campaign_id: number;
    amount: number;
  }>) {
    const pid = campaignToPartner.get(e.campaign_id);
    if (pid != null) {
      const t = result.get(pid);
      if (t) t.cost += Number(e.amount ?? 0);
    }
  }

  return result;
}

function avatarFor(name: string) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function statusBorderClass(statusName: string | null | undefined): string {
  if (!statusName) return "border-slate-200";
  const s = statusName.toLowerCase();
  if (s === "active") return "border-emerald-400";
  if (s === "paused") return "border-amber-400";
  return "border-slate-300";
}

function PartnerDialog({
  open,
  onOpenChange,
  partner,
  partnerTypes,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partner: PartnerRow | null;
  partnerTypes: PartnerType[];
}) {
  const qc = useQueryClient();
  const [name, setName] = useState(partner?.name ?? "");
  const [typeId, setTypeId] = useState<string>(
    String(partner?.partner_type_id ?? partnerTypes[0]?.partner_type_id ?? ""),
  );
  const [postbackUrl, setPostbackUrl] = useState(partner?.postback_url ?? "");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        partner_type_id: Number(typeId),
        postback_url: postbackUrl.trim() || null,
      };
      if (partner) {
        const { error: e } = await supabase
          .from("partners")
          .update(payload)
          .eq("partner_id", partner.partner_id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("partners").insert(payload);
        if (e) throw e;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["partners"] });
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      setError(err instanceof Error ? err.message : "Save failed");
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {partner ? "Edit Partner" : "Add Partner"}
          </DialogTitle>
          <DialogDescription>
            {partner
              ? "Update partner details and postback URL."
              : "Add a new lead-buying partner to your network."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="p-name">Partner Name</Label>
            <Input
              id="p-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Acme Insurance"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-type">Type</Label>
            <Select value={typeId} onValueChange={setTypeId}>
              <SelectTrigger id="p-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {partnerTypes.map((t) => (
                  <SelectItem
                    key={t.partner_type_id}
                    value={String(t.partner_type_id)}
                  >
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="p-pb">Postback URL (optional)</Label>
            <Input
              id="p-pb"
              type="url"
              value={postbackUrl}
              onChange={(e) => setPostbackUrl(e.target.value)}
              placeholder="https://partner.example.com/postback?cid={click_id}"
            />
            <p className="text-xs text-slate-500">
              S2S postback fired on conversion. Tokens like{" "}
              <code className="text-xs">{"{click_id}"}</code> will be
              substituted.
            </p>
          </div>
          {error && (
            <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={save.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {save.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : partner ? (
                "Save changes"
              ) : (
                "Create partner"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function Partners() {
  const { profile } = useAuth();
  const canWrite =
    profile?.role === "admin" || profile?.role === "manager";

  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { sortKey, sortDir, toggleSort, resetSort } = useSortState<PartnersSortKey>(
    "created_at",
    "desc",
  );

  const filter: PartnersFilter = {
    search,
    typeFilter,
    statusFilter,
    sortKey: sortKey ?? "created_at",
    sortDir,
  };

  const partners = useInfiniteQuery({
    queryKey: ["partners", filter],
    queryFn: ({ pageParam = 0 }) =>
      fetchPartnersPage(filter, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length : undefined,
  });

  const partnerTypes = useQuery({
    queryKey: ["partner-types"],
    queryFn: fetchPartnerTypes,
  });

  const partnerStatuses = useQuery({
    queryKey: ["partner-statuses"],
    queryFn: fetchPartnerStatuses,
  });

  const rows = useMemo(
    () => (partners.data?.pages ?? []).flatMap((p) => p.rows),
    [partners.data],
  );

  const partnerIds = useMemo(() => rows.map((r) => r.partner_id), [rows]);

  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getPresetRange("today", profile?.timezone ?? "America/New_York"),
  );
  const prevTzRef = useRef<string | null>(null);
  useEffect(() => {
    const tz = profile?.timezone;
    if (!tz || tz === prevTzRef.current) return;
    prevTzRef.current = tz;
    setDateRange((prev) =>
      prev.preset === "custom" ? prev : getPresetRange(prev.preset as import("@/lib/dateRange").PresetKey, tz),
    );
  }, [profile?.timezone]);

  const perf = useQuery({
    queryKey: ["partner-perf", partnerIds, dateRange.from, dateRange.to],
    queryFn: () => fetchPartnerPerf(partnerIds, dateRange),
    enabled: partnerIds.length > 0,
    staleTime: 60_000,
  });

  const sentinelRef = useInfiniteScroll<HTMLTableRowElement>({
    hasMore: !!partners.hasNextPage,
    isLoading: partners.isFetchingNextPage,
    onLoadMore: () => void partners.fetchNextPage(),
  });

  const COLS = 8;

  return (
    <AppLayout active="partners">
      <Header
        title="Partners"
        subtitle="Manage your carriers, networks, and direct buyers."
        right={
          canWrite ? (
            <Button
              onClick={() => {
                setDialogOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Partner
            </Button>
          ) : undefined
        }
      />
      <div className="flex-1 p-8 min-h-0 flex flex-col gap-6">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                if (e.target.value === "") resetSort();
              }}
              placeholder="Search partners..."
              className="pl-9 bg-white"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              if (v === "all") resetSort();
            }}
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {partnerTypes.data?.map((t) => (
                <SelectItem
                  key={t.partner_type_id}
                  value={String(t.partner_type_id)}
                >
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v)}
          >
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {partnerStatuses.data?.map((s) => (
                <SelectItem
                  key={s.partner_status_id}
                  value={String(s.partner_status_id)}
                >
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <p className="ml-auto text-sm text-slate-500 whitespace-nowrap">
            Showing{" "}
            <span className="font-medium text-slate-900">{rows.length}</span>{" "}
            partner{rows.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow>
                  <SortableHeader
                    label="Created"
                    sortKey="created_at"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as PartnersSortKey)}
                    className="w-[120px] pl-6"
                  />
                  <SortableHeader
                    label="Partner"
                    sortKey="name"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as PartnersSortKey)}
                    className="w-[260px]"
                  />
                  <SortableHeader
                    label="Type"
                    sortKey="partner_type_id"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as PartnersSortKey)}
                    className="w-[120px]"
                  />
                  <TableHead className="text-right w-[100px]">Visitors</TableHead>
                  <TableHead className="text-right w-[100px]">Revenue</TableHead>
                  <TableHead className="text-right w-[100px]">Cost</TableHead>
                  <TableHead className="text-right w-[100px]">Profit</TableHead>
                  <TableHead className="text-right w-[160px] pr-6">Campaigns</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {partners.isLoading && (
                  <TableRow>
                    <TableCell colSpan={COLS} className="text-center text-slate-400 py-10">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading partners…
                    </TableCell>
                  </TableRow>
                )}
                {!partners.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={COLS} className="text-center text-slate-400 py-10">
                      No partners match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((p) => {
                  const perf_ = perf.data?.get(p.partner_id) ?? { visitors: 0, revenue: 0, cost: 0 };
                  const profit = perf_.revenue - perf_.cost;
                  const campaignCount = p.campaigns?.[0]?.count ?? 0;
                  return (
                    <TableRow
                      key={p.partner_id}
                      className="group hover:bg-slate-50/80 cursor-pointer transition-colors"
                      onClick={() => navigate(`/partners/${p.partner_id}`)}
                    >
                      <TableCell className="text-xs text-slate-500 pl-6">
                        <div>{formatDate(p.created_at)}</div>
                        <div className="mt-0.5">{formatTime(p.created_at)}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar
                            className={cn(
                              "w-9 h-9 shrink-0 border-2",
                              statusBorderClass(p.enum_partner_status?.name),
                            )}
                          >
                            <AvatarFallback className="bg-slate-100 text-slate-600 font-medium text-xs">
                              {avatarFor(p.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-slate-900 truncate">
                              {p.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              <UidCopy uid={p.partner_uid} />
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className="font-normal text-xs bg-slate-100 text-slate-700 hover:bg-slate-100"
                        >
                          {p.enum_partner_type?.name ?? "—"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-700">
                        {perf.isLoading ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          num(perf_.visitors)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-700">
                        {perf.isLoading ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          usd(perf_.revenue)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm text-slate-700">
                        {perf.isLoading ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          usd(perf_.cost)
                        )}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {perf.isLoading ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          <span className={profit >= 0 ? "text-emerald-600" : "text-rose-500"}>
                            {usd(profit)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/partners/${p.partner_id}?tab=campaigns`);
                            }}
                            className="cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity text-xs text-slate-400 hover:text-purple-600 font-medium whitespace-nowrap mr-3"
                          >
                            View campaigns
                          </button>
                          <span className="font-medium text-slate-700 tabular-nums w-6 text-right">
                            {num(campaignCount)}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {partners.hasNextPage && (
                  <TableRow ref={sentinelRef}>
                    <TableCell colSpan={COLS} className="py-4 text-center text-slate-400 text-xs">
                      {partners.isFetchingNextPage ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2" />
                          Loading more…
                        </>
                      ) : (
                        "Scroll to load more"
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {dialogOpen && (
        <PartnerDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          partner={null}
          partnerTypes={partnerTypes.data ?? []}
        />
      )}
    </AppLayout>
  );
}
