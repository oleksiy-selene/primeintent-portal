import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/_shared/AppLayout";
import { Header } from "@/components/_shared/Header";
import { usd, num, formatDateTime } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";

interface KpiData {
  visitors: number;
  conversions: number;
  revenue: number;
  cost: number;
}

const RANGE_OPTIONS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
];

function rangeStartIso(days: number) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

async function fetchKpis(days: number): Promise<KpiData> {
  const since = rangeStartIso(days);

  const [visitorsRes, conversionsRes, expensesRes] = await Promise.all([
    supabase
      .from("visitors")
      .select("visitor_id", { count: "exact", head: true })
      .gte("created_at", since),
    // Revenue counts only `approved` conversions per spec.
    supabase
      .from("visitor_conversions")
      .select("payout_amount, created_at, enum_conversion_status!inner(name)")
      .gte("created_at", since),
    supabase
      .from("campaign_expenses")
      .select("amount, start_time")
      .gte("start_time", since),
  ]);

  if (visitorsRes.error) throw visitorsRes.error;
  if (conversionsRes.error) throw conversionsRes.error;
  if (expensesRes.error) throw expensesRes.error;

  const allConversions = (conversionsRes.data ?? []) as unknown as Array<{
    payout_amount: number;
    enum_conversion_status: { name: string } | null;
  }>;
  const approved = allConversions.filter(
    (r) => r.enum_conversion_status?.name === "approved",
  );
  const expenses = expensesRes.data ?? [];

  return {
    visitors: visitorsRes.count ?? 0,
    conversions: approved.length,
    revenue: approved.reduce((s, r) => s + Number(r.payout_amount ?? 0), 0),
    cost: expenses.reduce(
      (s, r) => s + Number((r as { amount: number }).amount ?? 0),
      0,
    ),
  };
}

interface RecentConversion {
  visitor_conversion_id: number;
  payout_amount: number;
  created_at: string;
  enum_conversion_status: { name: string } | null;
  visitors: {
    campaigns: {
      name: string;
      partners: { name: string } | null;
    } | null;
  } | null;
}

async function fetchRecentConversions(
  _days: number,
): Promise<RecentConversion[]> {
  const { data, error } = await supabase
    .from("visitor_conversions")
    .select(
      `
      visitor_conversion_id,
      payout_amount,
      created_at,
      enum_conversion_status:enum_conversion_status!visitor_conversions_conversion_status_id_fkey ( name ),
      visitors!visitor_conversions_visitor_id_fkey (
        campaigns!visitors_campaign_id_fkey (
          name,
          partners!campaigns_partner_id_fkey ( name )
        )
      )
    `,
    )
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data ?? []) as unknown as RecentConversion[];
}

interface TopCampaign {
  campaign_id: number;
  name: string;
  partner: string;
  revenue: number;
}

async function fetchTopCampaigns(days: number): Promise<TopCampaign[]> {
  const since = rangeStartIso(days);
  const { data, error } = await supabase
    .from("visitor_conversions")
    .select(
      `
      payout_amount,
      enum_conversion_status!inner ( name ),
      visitors!visitor_conversions_visitor_id_fkey (
        campaign_id,
        campaigns!visitors_campaign_id_fkey (
          campaign_id,
          name,
          partners!campaigns_partner_id_fkey ( name )
        )
      )
    `,
    )
    .eq("enum_conversion_status.name", "approved")
    .gte("created_at", since);

  if (error) throw error;

  const map = new Map<number, TopCampaign>();
  for (const row of (data ?? []) as unknown as Array<{
    payout_amount: number;
    visitors: {
      campaigns: {
        campaign_id: number;
        name: string;
        partners: { name: string } | null;
      } | null;
    } | null;
  }>) {
    const camp = row.visitors?.campaigns;
    if (!camp) continue;
    const existing = map.get(camp.campaign_id) ?? {
      campaign_id: camp.campaign_id,
      name: camp.name,
      partner: camp.partners?.name ?? "—",
      revenue: 0,
    };
    existing.revenue += Number(row.payout_amount ?? 0);
    map.set(camp.campaign_id, existing);
  }

  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}

function KpiCard({
  title,
  value,
  range,
}: {
  title: string;
  value: string | number;
  range: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <h3 className="text-sm font-medium text-slate-500">{title}</h3>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-slate-900">{value}</span>
      </div>
      <div className="mt-4 text-xs text-slate-400">{range}</div>
    </div>
  );
}

export default function Dashboard() {
  const [rangeDays, setRangeDays] = useState("30");
  const days = Number(rangeDays);
  const kpis = useQuery({
    queryKey: ["dashboard-kpis", days],
    queryFn: () => fetchKpis(days),
  });
  const recent = useQuery({
    queryKey: ["dashboard-recent", days],
    queryFn: () => fetchRecentConversions(days),
  });
  const top = useQuery({
    queryKey: ["dashboard-top", days],
    queryFn: () => fetchTopCampaigns(days),
  });
  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.value === rangeDays)?.label ?? "Last 30 days";

  const profit = (kpis.data?.revenue ?? 0) - (kpis.data?.cost ?? 0);
  const maxRevenue = Math.max(1, ...(top.data ?? []).map((c) => c.revenue));

  return (
    <AppLayout active="dashboard">
      <Header
        title="Dashboard"
        subtitle="Overview of your lead generation network"
        right={
          <div className="flex items-center gap-3">
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
          </div>
        }
      />

      <div className="flex-1 p-8 space-y-6 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Total Visitors"
            value={kpis.isLoading ? "—" : num(kpis.data?.visitors ?? 0)}
            range={rangeLabel}
          />
          <KpiCard
            title="Approved Conversions"
            value={kpis.isLoading ? "—" : num(kpis.data?.conversions ?? 0)}
            range={rangeLabel}
          />
          <KpiCard
            title="Revenue"
            value={kpis.isLoading ? "—" : usd(kpis.data?.revenue ?? 0)}
            range={rangeLabel}
          />
          <KpiCard
            title="Profit"
            value={kpis.isLoading ? "—" : usd(profit)}
            range={rangeLabel}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Performance over time
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Revenue vs acquisition cost
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-indigo-500" />
                  <span className="text-xs font-medium text-slate-600">
                    Revenue
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-sm bg-slate-400" />
                  <span className="text-xs font-medium text-slate-600">
                    Cost
                  </span>
                </div>
              </div>
            </div>
            <div className="flex-1 mt-6 grid grid-cols-2 gap-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Revenue ({rangeLabel.toLowerCase()})
                </div>
                <div className="text-3xl font-semibold text-indigo-600">
                  {usd(kpis.data?.revenue ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                  Cost ({rangeLabel.toLowerCase()})
                </div>
                <div className="text-3xl font-semibold text-slate-700">
                  {usd(kpis.data?.cost ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col">
            <h3 className="text-base font-semibold text-slate-900">
              Top campaigns
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Highest grossing campaigns this period
            </p>

            <div className="mt-6 space-y-5 flex-1">
              {top.isLoading && (
                <div className="text-sm text-slate-400 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading…
                </div>
              )}
              {top.data?.length === 0 && !top.isLoading && (
                <div className="text-sm text-slate-400">No data yet.</div>
              )}
              {top.data?.map((c) => (
                <div key={c.campaign_id} className="flex flex-col gap-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-sm font-medium text-slate-900 truncate">
                      {c.name}
                    </span>
                    <span className="text-sm font-semibold text-slate-900">
                      {usd(c.revenue)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 w-24 truncate">
                      {c.partner}
                    </span>
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500 rounded-full"
                        style={{
                          width: `${(c.revenue / maxRevenue) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-900">
              Recent conversions
            </h3>
            <p className="text-sm text-slate-500 mt-1">
              Latest successful and pending leads
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-4 border-b border-slate-200">Date</th>
                  <th className="px-6 py-4 border-b border-slate-200">
                    Campaign
                  </th>
                  <th className="px-6 py-4 border-b border-slate-200">
                    Partner
                  </th>
                  <th className="px-6 py-4 border-b border-slate-200">
                    Revenue
                  </th>
                  <th className="px-6 py-4 border-b border-slate-200">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.isLoading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-slate-400"
                    >
                      <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                      Loading…
                    </td>
                  </tr>
                )}
                {recent.data?.length === 0 && !recent.isLoading && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-10 text-center text-slate-400"
                    >
                      No conversions yet.
                    </td>
                  </tr>
                )}
                {recent.data?.map((cv) => {
                  const status = cv.enum_conversion_status?.name ?? "pending";
                  return (
                    <tr
                      key={cv.visitor_conversion_id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      <td className="px-6 py-4 text-slate-500 font-medium">
                        {formatDateTime(cv.created_at)}
                      </td>
                      <td className="px-6 py-4 text-slate-900 font-medium">
                        {cv.visitors?.campaigns?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {cv.visitors?.campaigns?.partners?.name ?? "—"}
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {usd(Number(cv.payout_amount))}
                      </td>
                      <td className="px-6 py-4">
                        {status === "approved" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/50">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Approved
                          </span>
                        )}
                        {status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200/50">
                            <Clock className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        )}
                        {(status === "rejected" || status === "reversed") && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200/50">
                            <XCircle className="w-3.5 h-3.5" />
                            {status === "rejected" ? "Rejected" : "Reversed"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
