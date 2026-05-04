import { useMemo, useState, useRef, useEffect } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { AppLayout } from "@/components/_shared/AppLayout";
import { Header } from "@/components/_shared/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PAGE_SIZE } from "@/lib/useInfiniteScroll";
import { useSortState } from "@/lib/useSortState";
import { SortableHeader } from "@/components/SortableHeader";
import { CampaignDialog } from "@/components/CampaignDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Loader2, Edit2 } from "lucide-react";
import { num, usd, formatDate } from "@/lib/format";

type CampaignsSortKey = "name" | "partner_id" | "campaign_status_id" | "created_at";

interface CampaignRow {
  campaign_id: number;
  campaign_uid: string;
  name: string;
  description: string | null;
  origin: string;
  channel: string;
  campaign_external_id: string | null;
  campaign_status_id: number;
  partner_id: number;
  created_at: string;
  partners: { partner_id: number; name: string } | null;
  enum_campaign_status: { name: string } | null;
}

interface CampaignStatus {
  campaign_status_id: number;
  name: string;
}

interface PartnerOption {
  partner_id: number;
  name: string;
}

interface PerfTotals {
  visitors: number;
  revenue: number;
  cost: number;
}

interface CampaignsFilter {
  partnerFilter: string;
  search: string;
  statusFilter: string;
  sortKey: CampaignsSortKey;
  sortDir: "asc" | "desc";
}

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function rangeStartIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchCampaignsPage(
  filter: CampaignsFilter,
  pageIndex: number,
): Promise<{ rows: CampaignRow[]; hasMore: boolean }> {
  const from = pageIndex * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("campaigns")
    .select(
      `
      campaign_id,
      campaign_uid,
      name,
      description,
      origin,
      channel,
      campaign_external_id,
      campaign_status_id,
      partner_id,
      created_at,
      partners!campaigns_partner_id_fkey ( partner_id, name ),
      enum_campaign_status:enum_campaign_status!campaigns_campaign_status_id_fkey ( name )
    `,
    )
    .range(from, to);

  if (filter.sortKey === "partner_id") {
    query = query.order("name", {
      foreignTable: "partners",
      ascending: filter.sortDir === "asc",
    });
  } else if (filter.sortKey === "campaign_status_id") {
    query = query.order("name", {
      foreignTable: "enum_campaign_status",
      ascending: filter.sortDir === "asc",
    });
  } else {
    query = query.order(filter.sortKey, { ascending: filter.sortDir === "asc" });
  }

  if (filter.partnerFilter !== "all") {
    query = query.eq("partner_id", Number(filter.partnerFilter));
  }
  if (filter.search.trim()) {
    query = query.ilike("name", `%${filter.search.trim()}%`);
  }
  if (filter.statusFilter !== "all") {
    query = query.eq("enum_campaign_status.name", filter.statusFilter);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as CampaignRow[];
  return { rows, hasMore: rows.length === PAGE_SIZE };
}

async function fetchPerformance(
  campaignIds: number[],
  days: number,
): Promise<Map<number, PerfTotals>> {
  const result = new Map<number, PerfTotals>();
  campaignIds.forEach((id) =>
    result.set(id, { visitors: 0, revenue: 0, cost: 0 }),
  );
  if (campaignIds.length === 0) return result;
  const since = rangeStartIso(days);

  const [visitorsRes, conversionsRes, expensesRes] = await Promise.all([
    supabase
      .from("visitors")
      .select("campaign_id")
      .in("campaign_id", campaignIds)
      .gte("created_at", since),
    supabase
      .from("visitor_conversions")
      .select(
        `
        payout_amount,
        enum_conversion_status!inner ( name ),
        visitors!inner ( campaign_id )
      `,
      )
      .eq("enum_conversion_status.name", "approved")
      .in("visitors.campaign_id", campaignIds)
      .gte("created_at", since),
    supabase
      .from("campaign_expenses")
      .select("campaign_id, amount")
      .in("campaign_id", campaignIds)
      .gte("start_time", since),
  ]);

  if (visitorsRes.error) throw visitorsRes.error;
  if (conversionsRes.error) throw conversionsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  for (const v of (visitorsRes.data ?? []) as Array<{ campaign_id: number }>) {
    const t = result.get(v.campaign_id);
    if (t) t.visitors += 1;
  }
  const conversions = (conversionsRes.data ?? []) as unknown as Array<{
    payout_amount: number;
    visitors: { campaign_id: number } | null;
  }>;
  for (const c of conversions) {
    const cid = c.visitors?.campaign_id;
    if (cid == null) continue;
    const t = result.get(cid);
    if (t) t.revenue += Number(c.payout_amount ?? 0);
  }
  for (const e of (expensesRes.data ?? []) as Array<{
    campaign_id: number;
    amount: number;
  }>) {
    const t = result.get(e.campaign_id);
    if (t) t.cost += Number(e.amount ?? 0);
  }
  return result;
}

async function fetchStatuses(): Promise<CampaignStatus[]> {
  const { data, error } = await supabase
    .from("enum_campaign_status")
    .select("campaign_status_id, name")
    .order("campaign_status_id");
  if (error) throw error;
  return (data ?? []) as CampaignStatus[];
}

async function fetchPartnerOptions(): Promise<PartnerOption[]> {
  const { data, error } = await supabase
    .from("partners")
    .select("partner_id, name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as PartnerOption[];
}

export default function Campaigns() {
  const { profile } = useAuth();
  const canWrite =
    profile?.role === "admin" || profile?.role === "manager";
  const qc = useQueryClient();

  const [partnerFilter, setPartnerFilter] = useState("all");
  const [rangeDays, setRangeDays] = useState("30");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CampaignRow | null>(null);

  const days = Number(rangeDays);

  const { sortKey, sortDir, toggleSort, resetSort } = useSortState<CampaignsSortKey>(
    "created_at",
    "desc",
  );

  const filter: CampaignsFilter = {
    partnerFilter,
    search,
    statusFilter,
    sortKey: sortKey ?? "created_at",
    sortDir,
  };

  const campaigns = useInfiniteQuery({
    queryKey: ["campaigns", filter],
    queryFn: ({ pageParam = 0 }) =>
      fetchCampaignsPage(filter, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length : undefined,
  });

  const statuses = useQuery({
    queryKey: ["campaign-statuses"],
    queryFn: fetchStatuses,
  });
  const partners = useQuery({
    queryKey: ["partner-options"],
    queryFn: fetchPartnerOptions,
  });

  const rows = useMemo(
    () => (campaigns.data?.pages ?? []).flatMap((p) => p.rows),
    [campaigns.data],
  );

  const visibleIds = useMemo(
    () => rows.map((c) => c.campaign_id),
    [rows],
  );

  const performance = useQuery({
    queryKey: ["campaign-performance", visibleIds, days],
    queryFn: () => fetchPerformance(visibleIds, days),
    enabled: visibleIds.length > 0,
  });

  const perfFor = (id: number) =>
    performance.data?.get(id) ?? { visitors: 0, revenue: 0, cost: 0 };

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && campaigns.hasNextPage && !campaigns.isFetchingNextPage) {
          void campaigns.fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [campaigns]);

  return (
    <AppLayout active="campaigns">
      <Header
        title="Campaigns"
        subtitle="Manage and track partner marketing campaigns"
        right={
          canWrite ? (
            <Button
              onClick={() => {
                setEditing(null);
                setOpen(true);
              }}
              className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Plus className="w-4 h-4" />
              New Campaign
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 p-8 space-y-6 flex flex-col min-h-0">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={partnerFilter} onValueChange={(v) => { setPartnerFilter(v); if (v === "all") resetSort(); }}>
            <SelectTrigger className="w-[220px] bg-white">
              <SelectValue placeholder="Partner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Partners</SelectItem>
              {partners.data?.map((p) => (
                <SelectItem key={p.partner_id} value={String(p.partner_id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={rangeDays} onValueChange={setRangeDays}>
            <SelectTrigger className="w-[160px] bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => { setSearch(e.target.value); if (e.target.value === "") resetSort(); }}
              placeholder="Search campaigns..."
              className="pl-9 bg-white"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); if (v === "all") resetSort(); }}>
            <SelectTrigger className="w-32 bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              {statuses.data?.map((s) => (
                <SelectItem key={s.campaign_status_id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
          <div className="overflow-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10">
                <TableRow className="border-slate-200">
                  <SortableHeader
                    label="Campaign"
                    sortKey="name"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as CampaignsSortKey)}
                    className="font-medium"
                  />
                  <SortableHeader
                    label="Partner"
                    sortKey="partner_id"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as CampaignsSortKey)}
                    className="font-medium"
                  />
                  <TableHead className="font-medium text-right">Visitors</TableHead>
                  <TableHead className="font-medium text-right">Revenue</TableHead>
                  <TableHead className="font-medium text-right">Cost</TableHead>
                  <TableHead className="font-medium text-right">Profit</TableHead>
                  <SortableHeader
                    label="Status"
                    sortKey="campaign_status_id"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as CampaignsSortKey)}
                    className="font-medium"
                  />
                  <SortableHeader
                    label="Created"
                    sortKey="created_at"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as CampaignsSortKey)}
                    className="font-medium"
                  />
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {campaigns.isLoading && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading…
                    </TableCell>
                  </TableRow>
                )}
                {!campaigns.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="px-4 py-10 text-center text-slate-400"
                    >
                      No campaigns match your filters.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((c) => {
                  const status = c.enum_campaign_status?.name ?? "—";
                  const p = perfFor(c.campaign_id);
                  const profit = p.revenue - p.cost;
                  return (
                    <TableRow
                      key={c.campaign_id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <TableCell>
                        <div className="font-medium text-slate-900">{c.name}</div>
                        <div className="text-xs text-slate-500 mt-0.5 font-mono">
                          {c.campaign_uid.slice(0, 8)}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {c.partners?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-slate-700 text-right tabular-nums">
                        {performance.isFetching ? "…" : num(p.visitors)}
                      </TableCell>
                      <TableCell className="text-slate-700 text-right tabular-nums">
                        {performance.isFetching ? "…" : usd(p.revenue)}
                      </TableCell>
                      <TableCell className="text-slate-700 text-right tabular-nums">
                        {performance.isFetching ? "…" : usd(p.cost)}
                      </TableCell>
                      <TableCell
                        className={`text-right tabular-nums font-medium ${
                          profit >= 0 ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {performance.isFetching ? "…" : usd(profit)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            status === "Active"
                              ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200"
                              : status === "Paused"
                                ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200"
                                : "text-slate-600 bg-slate-50 border-slate-200"
                          }
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                        {formatDate(c.created_at)}
                      </TableCell>
                      <TableCell>
                        {canWrite && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Edit campaign"
                            onClick={() => {
                              setEditing(c);
                              setOpen(true);
                            }}
                            className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {campaigns.hasNextPage && (
                  <TableRow ref={sentinelRef}>
                    <TableCell colSpan={9} className="py-4 text-center text-slate-400 text-xs">
                      {campaigns.isFetchingNextPage ? (
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

      {open && (
        <CampaignDialog
          open={open}
          onOpenChange={(v) => {
            setOpen(v);
            if (!v) setEditing(null);
          }}
          partners={partners.data ?? []}
          statuses={statuses.data ?? []}
          editing={editing}
          onSuccess={() => {
            void qc.invalidateQueries({ queryKey: ["campaigns"] });
          }}
        />
      )}
    </AppLayout>
  );
}
