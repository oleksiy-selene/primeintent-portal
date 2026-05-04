import { useMemo, useState, useRef, useEffect } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/_shared/AppLayout";
import { Header } from "@/components/_shared/Header";
import { useAuth } from "@/contexts/AuthContext";
import { DateRangePicker, type DateRange } from "@/components/_shared/DateRangePicker";
import { getPresetRange } from "@/lib/dateRange";
import { num, pct, usd, formatDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { useInfiniteScroll, PAGE_SIZE } from "@/lib/useInfiniteScroll";
import { useSortState } from "@/lib/useSortState";
import { SortableHeader } from "@/components/SortableHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Download,
  Search,
  Monitor,
  Smartphone,
  Tablet,
  Filter,
  Loader2,
} from "lucide-react";

type VisitorsSortKey = "created_at" | "utm_source" | "geo_country" | "device_type_id" | "converted";

interface VisitorRow {
  visitor_id: number;
  visitor_uid: string;
  external_click_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  geo_country: string | null;
  created_at: string;
  enum_device_type: { name: string } | null;
  campaigns: { name: string } | null;
  visitor_conversions: { visitor_conversion_id: number }[] | null;
}


interface VisitorsFilter {
  campaignId: string;
  utmSource: string;
  clickId: string;
  from: string;
  to: string;
  sortKey: VisitorsSortKey;
  sortDir: "asc" | "desc";
}

async function fetchVisitorsPage(
  filter: VisitorsFilter,
  pageIndex: number,
): Promise<{ rows: VisitorRow[]; hasMore: boolean }> {
  const from = pageIndex * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;
  let query = supabase
    .from("visitors")
    .select(
      `
      visitor_id,
      visitor_uid,
      external_click_id,
      utm_source,
      utm_medium,
      geo_country,
      created_at,
      enum_device_type:enum_device_type!visitors_device_type_id_fkey ( name ),
      campaigns!visitors_campaign_id_fkey ( name ),
      visitor_conversions!visitor_conversions_visitor_id_fkey ( visitor_conversion_id )
    `,
    )
    .gte("created_at", filter.from)
    .lte("created_at", filter.to)
    .range(from, to);

  if (filter.sortKey === "device_type_id") {
    query = query.order("name", {
      foreignTable: "enum_device_type",
      ascending: filter.sortDir === "asc",
    });
  } else if (filter.sortKey === "converted") {
    query = query.order("visitor_conversion_id", {
      foreignTable: "visitor_conversions",
      ascending: filter.sortDir === "asc",
      nullsFirst: filter.sortDir === "desc",
    });
  } else {
    query = query.order(filter.sortKey, { ascending: filter.sortDir === "asc" });
  }

  if (filter.campaignId !== "all") {
    query = query.eq("campaign_id", Number(filter.campaignId));
  }
  if (filter.utmSource.trim()) {
    query = query.ilike("utm_source", `%${filter.utmSource.trim()}%`);
  }
  if (filter.clickId.trim()) {
    query = query.ilike("external_click_id", `%${filter.clickId.trim()}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as VisitorRow[];
  return { rows, hasMore: rows.length === PAGE_SIZE };
}

async function fetchCampaignFilterOptions() {
  const { data, error } = await supabase
    .from("campaigns")
    .select("campaign_id, name")
    .order("name");
  if (error) throw error;
  return (data ?? []) as { campaign_id: number; name: string }[];
}

async function fetchVisitorStats() {
  const sinceMidnight = new Date();
  sinceMidnight.setHours(0, 0, 0, 0);
  const iso = sinceMidnight.toISOString();

  const [v, c] = await Promise.all([
    supabase
      .from("visitors")
      .select("visitor_id", { count: "exact", head: true })
      .gte("created_at", iso),
    supabase
      .from("visitor_conversions")
      .select("payout_amount, enum_conversion_status!inner(name), created_at")
      .gte("created_at", iso),
  ]);
  if (v.error) throw v.error;
  if (c.error) throw c.error;

  const allConversions = (c.data ?? []) as unknown as Array<{
    payout_amount: number;
    enum_conversion_status: { name: string } | null;
  }>;
  const approved = allConversions.filter(
    (r) => r.enum_conversion_status?.name === "approved",
  );
  const visitorsToday = v.count ?? 0;
  const revenueToday = approved.reduce(
    (s, r) => s + Number(r.payout_amount ?? 0),
    0,
  );
  return {
    visitors: visitorsToday,
    conversions: approved.length,
    rate:
      visitorsToday > 0 ? (approved.length / visitorsToday) * 100 : 0,
    avgRevenue: approved.length > 0 ? revenueToday / approved.length : 0,
  };
}

function DeviceIcon({ device }: { device: string | null | undefined }) {
  const d = (device ?? "").toLowerCase();
  if (d.includes("mobile"))
    return <Smartphone className="w-4 h-4 text-slate-500" />;
  if (d.includes("tablet"))
    return <Tablet className="w-4 h-4 text-slate-500" />;
  return <Monitor className="w-4 h-4 text-slate-500" />;
}

export default function Visitors() {
  const { profile } = useAuth();
  const [campaignFilter, setCampaignFilter] = useState("all");
  const [utmSource, setUtmSource] = useState("");
  const [clickId, setClickId] = useState("");

  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getPresetRange("last-7", profile?.timezone ?? "America/New_York"),
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

  const { sortKey, sortDir, toggleSort, resetSort } = useSortState<VisitorsSortKey>(
    "created_at",
    "desc",
  );

  const filter: VisitorsFilter = {
    campaignId: campaignFilter,
    utmSource,
    clickId,
    from: dateRange.from,
    to: dateRange.to,
    sortKey: sortKey ?? "created_at",
    sortDir,
  };

  const stats = useQuery({
    queryKey: ["visitor-stats"],
    queryFn: fetchVisitorStats,
  });

  const visitors = useInfiniteQuery({
    queryKey: ["visitors", filter],
    queryFn: ({ pageParam = 0 }) =>
      fetchVisitorsPage(filter, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last, pages) =>
      last.hasMore ? pages.length : undefined,
  });

  const campaignOpts = useQuery({
    queryKey: ["visitor-campaign-opts"],
    queryFn: fetchCampaignFilterOptions,
  });

  const rows = useMemo(
    () => (visitors.data?.pages ?? []).flatMap((p) => p.rows),
    [visitors.data],
  );

  const sentinelRef = useInfiniteScroll<HTMLTableRowElement>({
    hasMore: !!visitors.hasNextPage,
    isLoading: visitors.isFetchingNextPage,
    onLoadMore: () => void visitors.fetchNextPage(),
  });

  const STATS = [
    {
      label: "Visitors Today",
      value: stats.isLoading ? "—" : num(stats.data?.visitors ?? 0),
    },
    {
      label: "Approved Today",
      value: stats.isLoading ? "—" : num(stats.data?.conversions ?? 0),
    },
    {
      label: "Conversion Rate",
      value: stats.isLoading ? "—" : pct(stats.data?.rate ?? 0),
    },
    {
      label: "Avg Revenue",
      value: stats.isLoading ? "—" : usd(stats.data?.avgRevenue ?? 0),
    },
  ];

  return (
    <AppLayout active="visitors">
      <Header
        title="Visitors Log"
        subtitle="Real-time stream of all incoming clicks and conversion events."
        right={
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        }
      />
      <div className="flex-1 p-6 space-y-6 max-w-full overflow-hidden flex flex-col">
        <div className="flex items-center gap-4 border border-slate-200 rounded-lg bg-white p-2 shadow-sm">
          {STATS.map((stat, i) => (
            <div key={stat.label} className="flex items-center flex-1">
              <div className="flex-1 px-4 py-2 flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                  {stat.label}
                </span>
                <span className="text-xl font-semibold text-slate-900">
                  {stat.value}
                </span>
              </div>
              {i < STATS.length - 1 && (
                <div className="w-px h-10 bg-slate-200" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-white p-3 rounded-lg border border-slate-200 shadow-sm flex-wrap">
          <div className="flex items-center gap-2 px-2 border-r border-slate-200 text-slate-400">
            <Filter className="w-4 h-4" />
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500 mr-2">
              Filters
            </span>
          </div>

          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <Input
              value={clickId}
              onChange={(e) => { setClickId(e.target.value); if (e.target.value === "") resetSort(); }}
              placeholder="Search Click ID..."
              className="h-8 pl-8 text-xs font-mono"
            />
          </div>

          <Select value={campaignFilter} onValueChange={(v) => { setCampaignFilter(v); if (v === "all") resetSort(); }}>
            <SelectTrigger className="w-[200px] h-8 text-xs">
              <SelectValue placeholder="Campaign" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Campaigns</SelectItem>
              {campaignOpts.data?.map((c) => (
                <SelectItem key={c.campaign_id} value={String(c.campaign_id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={utmSource}
            onChange={(e) => { setUtmSource(e.target.value); if (e.target.value === "") resetSort(); }}
            placeholder="UTM source (e.g. google)"
            className="w-[200px] h-8 text-xs"
          />

          <div className="flex-1" />

          <DateRangePicker value={dateRange} onChange={setDateRange} />
        </div>

        <div className="flex-1 border border-slate-200 rounded-lg bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto flex-1">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow>
                  <SortableHeader
                    label="Timestamp"
                    sortKey="created_at"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as VisitorsSortKey)}
                    className="w-[180px] text-xs pl-6"
                  />
                  <TableHead className="w-[200px] text-xs">Campaign</TableHead>
                  <SortableHeader
                    label="UTM Source"
                    sortKey="utm_source"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as VisitorsSortKey)}
                    className="w-[160px] text-xs"
                  />
                  <TableHead className="w-[160px] text-xs">Click ID</TableHead>
                  <SortableHeader
                    label="Device"
                    sortKey="device_type_id"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as VisitorsSortKey)}
                    className="w-[80px] text-center text-xs"
                  />
                  <SortableHeader
                    label="Country"
                    sortKey="geo_country"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as VisitorsSortKey)}
                    className="w-[100px] text-xs"
                  />
                  <SortableHeader
                    label="Status"
                    sortKey="converted"
                    activeSortKey={sortKey}
                    activeSortDir={sortDir}
                    onSort={(k) => toggleSort(k as VisitorsSortKey)}
                    className="w-[120px] text-right text-xs pr-6"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visitors.isLoading && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading visitors…
                    </TableCell>
                  </TableRow>
                )}
                {!visitors.isLoading && rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-slate-400">
                      No visitors found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((v) => {
                  const converted = (v.visitor_conversions?.length ?? 0) > 0;
                  return (
                    <TableRow key={v.visitor_id} className="hover:bg-slate-50/50">
                      <TableCell className="text-xs text-slate-500 font-mono tracking-tight pl-6">
                        {formatDateTime(v.created_at)}
                      </TableCell>
                      <TableCell className="text-xs font-medium text-slate-900 truncate max-w-[200px]">
                        {v.campaigns?.name ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-slate-500 truncate max-w-[160px]">
                        {v.utm_source ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-slate-500 truncate max-w-[160px]">
                        {v.external_click_id ?? "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <DeviceIcon device={v.enum_device_type?.name} />
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">
                        {v.geo_country ?? "—"}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        {converted ? (
                          <Badge className="bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 border-emerald-200/50 text-[10px] px-2 py-0 uppercase tracking-wider font-semibold rounded-sm">
                            Converted
                          </Badge>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200/50 text-[10px] px-2 py-0 uppercase tracking-wider font-semibold rounded-sm"
                          >
                            Visited
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {visitors.hasNextPage && (
                  <TableRow ref={sentinelRef}>
                    <TableCell colSpan={7} className="py-4 text-center text-slate-400 text-xs">
                      {visitors.isFetchingNextPage ? (
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
    </AppLayout>
  );
}
