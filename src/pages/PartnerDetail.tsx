import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DateRangePicker, type DateRange } from "@/components/_shared/DateRangePicker";
import { getPresetRange } from "@/lib/dateRange";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useRoute, useLocation, useSearch } from "wouter";
import { AppLayout } from "@/components/_shared/AppLayout";
import { Header } from "@/components/_shared/Header";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { PAGE_SIZE } from "@/lib/useInfiniteScroll";
import { useSortState } from "@/lib/useSortState";
import { SortableHeader } from "@/components/SortableHeader";
import { CampaignDialog } from "@/components/CampaignDialog";
import { num, usd, formatDate } from "@/lib/format";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  Plus,
  Search,
  Edit2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PartnerStatus {
  partner_status_id: number;
  name: string;
}

interface PartnerType {
  partner_type_id: number;
  name: string;
}

interface Partner {
  partner_id: number;
  partner_uid: string;
  name: string;
  partner_type_id: number;
  partner_status_id: number | null;
  postback_url: string | null;
  created_at: string;
  enum_partner_type: { name: string } | null;
  enum_partner_status: { name: string } | null;
}

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

type CampaignsSortKey = "name" | "campaign_status_id" | "created_at";

const POSTBACK_TOKENS = [
  { token: "{click_id}", desc: "Visitor click ID" },
  { token: "{payout}", desc: "Conversion payout amount" },
  { token: "{campaign_id}", desc: "Campaign numeric ID" },
  { token: "{campaign_uid}", desc: "Campaign UUID" },
  { token: "{status}", desc: "Conversion status" },
  { token: "{subid1}", desc: "Sub-ID 1 from click" },
  { token: "{subid2}", desc: "Sub-ID 2 from click" },
];


async function fetchPartner(partnerId: number): Promise<Partner> {
  const baseSelect = `
    partner_id,
    partner_uid,
    name,
    partner_type_id,
    postback_url,
    created_at,
    enum_partner_type:enum_partner_type!partners_partner_type_id_fkey ( name )
  `;
  const { data: base, error: baseErr } = await supabase
    .from("partners")
    .select(baseSelect)
    .eq("partner_id", partnerId)
    .single();
  if (baseErr) throw baseErr;

  const { data: withStatus } = await supabase
    .from("partners")
    .select("partner_status_id")
    .eq("partner_id", partnerId)
    .single();

  const statusId = (withStatus as { partner_status_id?: number } | null)?.partner_status_id ?? null;
  return { ...(base as unknown as Partner), partner_status_id: statusId, enum_partner_status: null };
}

async function fetchPartnerStatuses(): Promise<PartnerStatus[]> {
  const { data, error } = await supabase
    .from("enum_partner_status")
    .select("partner_status_id, name")
    .order("partner_status_id");
  if (error) throw error;
  return (data ?? []) as PartnerStatus[];
}

async function fetchPartnerTypes(): Promise<PartnerType[]> {
  const { data, error } = await supabase
    .from("enum_partner_type")
    .select("partner_type_id, name")
    .order("partner_type_id");
  if (error) throw error;
  return (data ?? []) as PartnerType[];
}

async function fetchCampaignsForPartner(
  partnerId: number,
  filter: { search: string; statusFilter: string; sortKey: CampaignsSortKey; sortDir: "asc" | "desc" },
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
    .eq("partner_id", partnerId)
    .range(from, to);

  if (filter.sortKey === "campaign_status_id") {
    query = query.order("name", { foreignTable: "enum_campaign_status", ascending: filter.sortDir === "asc" });
  } else {
    query = query.order(filter.sortKey, { ascending: filter.sortDir === "asc" });
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

async function fetchPerformance(campaignIds: number[], range: { from: string; to: string }): Promise<Map<number, PerfTotals>> {
  const result = new Map<number, PerfTotals>();
  campaignIds.forEach((id) => result.set(id, { visitors: 0, revenue: 0, cost: 0 }));
  if (campaignIds.length === 0) return result;

  const [visitorsRes, conversionsRes, expensesRes] = await Promise.all([
    supabase.from("visitors").select("campaign_id").in("campaign_id", campaignIds).gte("created_at", range.from).lte("created_at", range.to),
    supabase
      .from("visitor_conversions")
      .select(`payout_amount, enum_conversion_status!inner ( name ), visitors!inner ( campaign_id )`)
      .eq("enum_conversion_status.name", "approved")
      .in("visitors.campaign_id", campaignIds)
      .gte("created_at", range.from)
      .lte("created_at", range.to),
    supabase.from("campaign_expenses").select("campaign_id, amount").in("campaign_id", campaignIds).gte("start_time", range.from).lte("start_time", range.to),
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
  for (const e of (expensesRes.data ?? []) as Array<{ campaign_id: number; amount: number }>) {
    const t = result.get(e.campaign_id);
    if (t) t.cost += Number(e.amount ?? 0);
  }
  return result;
}

async function fetchCampaignStatuses(): Promise<CampaignStatus[]> {
  const { data, error } = await supabase
    .from("enum_campaign_status")
    .select("campaign_status_id, name")
    .order("campaign_status_id");
  if (error) throw error;
  return (data ?? []) as CampaignStatus[];
}

function FieldRow({
  label,
  dirty,
  readOnly,
  children,
}: {
  label: string;
  dirty?: boolean;
  readOnly?: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-start py-4 px-8 border-b border-slate-100 transition-colors group",
        dirty ? "bg-amber-50/50" : readOnly ? "" : "hover:bg-slate-50/50",
      )}
    >
      <div className="w-[200px] shrink-0 pt-2 text-sm font-medium text-slate-500 flex items-center gap-2">
        {label}
        {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
      </div>
      <div className="flex-1 max-w-2xl">{children}</div>
    </div>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="ml-1.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
      title="Copy to clipboard"
    >
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

interface DetailsFormProps {
  partner: Partner;
  partnerStatuses: PartnerStatus[];
  partnerTypes: PartnerType[];
  canWrite: boolean;
  onSaved: () => void;
}

function PartnerDetailsForm({
  partner,
  partnerStatuses,
  partnerTypes,
  canWrite,
  onSaved,
}: DetailsFormProps) {
  const [formName, setFormName] = useState(partner.name);
  const [formTypeId, setFormTypeId] = useState(String(partner.partner_type_id));
  const [formStatusId, setFormStatusId] = useState(String(partner.partner_status_id ?? ""));
  const [formPostbackUrl, setFormPostbackUrl] = useState(partner.postback_url ?? "");

  const postbackInputRef = useRef<HTMLInputElement>(null);

  function insertToken(token: string) {
    const el = postbackInputRef.current;
    if (!el) {
      setFormPostbackUrl((prev) => prev + token);
      return;
    }
    const start = el.selectionStart ?? formPostbackUrl.length;
    const end = el.selectionEnd ?? formPostbackUrl.length;
    const next = formPostbackUrl.slice(0, start) + token + formPostbackUrl.slice(end);
    setFormPostbackUrl(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + token.length, start + token.length);
    });
  }

  const qc = useQueryClient();
  const { toast } = useToast();

  const statusDirty = formStatusId !== String(partner.partner_status_id ?? "");
  const nameDirty = formName !== partner.name;
  const typeDirty = formTypeId !== String(partner.partner_type_id);
  const postbackDirty = formPostbackUrl !== (partner.postback_url ?? "");

  const isDirty = statusDirty || nameDirty || typeDirty || postbackDirty;
  const dirtyCount = [statusDirty, nameDirty, typeDirty, postbackDirty].filter(Boolean).length;

  const savePartner = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        name: formName.trim(),
        partner_type_id: Number(formTypeId),
        postback_url: formPostbackUrl.trim() || null,
      };
      if (formStatusId) {
        payload.partner_status_id = Number(formStatusId);
      }
      const { error } = await supabase
        .from("partners")
        .update(payload)
        .eq("partner_id", partner.partner_id);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["partner", partner.partner_id] });
      void qc.invalidateQueries({ queryKey: ["partners"] });
      toast({ title: "Partner saved", description: "Changes have been applied." });
      onSaved();
    },
    onError: (err: unknown) => {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  function handleDiscard() {
    setFormName(partner.name);
    setFormTypeId(String(partner.partner_type_id));
    setFormStatusId(String(partner.partner_status_id ?? ""));
    setFormPostbackUrl(partner.postback_url ?? "");
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto">
        {/* ── Read-only identifiers — grey background ── */}
        <div className="border-b border-slate-200 bg-slate-50">
          <FieldRow label="Partner ID" readOnly>
            <div className="flex items-center py-1 font-mono text-sm text-slate-700">
              {partner.partner_id}
              <CopyButton value={String(partner.partner_id)} />
            </div>
          </FieldRow>

          <FieldRow label="Partner UID" readOnly>
            <div className="flex items-center py-1 font-mono text-sm text-slate-700 break-all">
              {partner.partner_uid}
              <CopyButton value={partner.partner_uid} />
            </div>
          </FieldRow>

          <FieldRow label="Created Date" readOnly>
            <div className="py-1 text-sm text-slate-700">{formatDate(partner.created_at)}</div>
          </FieldRow>
        </div>

        {/* ── Editable fields — white background ── */}
        <div className="border-b border-slate-200">
          {partnerStatuses.length > 0 && (
            <FieldRow label="Status" dirty={statusDirty}>
              <Select value={formStatusId} onValueChange={setFormStatusId} disabled={!canWrite}>
                <SelectTrigger className={cn("w-[240px]", statusDirty && "border-amber-300 bg-amber-50/30")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {partnerStatuses.map((s) => (
                    <SelectItem key={s.partner_status_id} value={String(s.partner_status_id)}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldRow>
          )}

          <FieldRow label="Name" dirty={nameDirty}>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              disabled={!canWrite}
              className={cn(nameDirty && "border-amber-300 bg-amber-50/30")}
            />
          </FieldRow>

          <FieldRow label="Partner Type" dirty={typeDirty}>
            <Select value={formTypeId} onValueChange={setFormTypeId} disabled={!canWrite}>
              <SelectTrigger className={cn("w-[240px]", typeDirty && "border-amber-300 bg-amber-50/30")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {partnerTypes.map((t) => (
                  <SelectItem key={t.partner_type_id} value={String(t.partner_type_id)}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FieldRow>

          <FieldRow label="Postback URL" dirty={postbackDirty}>
            <div className="space-y-4 py-2">
              <Input
                ref={postbackInputRef}
                value={formPostbackUrl}
                onChange={(e) => setFormPostbackUrl(e.target.value)}
                placeholder="https://partner.example.com/postback?cid={click_id}"
                disabled={!canWrite}
                className={cn("font-mono text-sm", postbackDirty && "border-amber-300 bg-amber-50/30")}
              />
              <div className="bg-slate-50 border border-slate-200 rounded-md p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Available Tokens
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {POSTBACK_TOKENS.map(({ token, desc }) => (
                    <div key={token} className="flex items-center gap-2 text-sm">
                      <button
                        type="button"
                        disabled={!canWrite}
                        onClick={() => insertToken(token)}
                        className="text-xs bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono hover:bg-indigo-100 hover:text-indigo-700 active:bg-indigo-200 transition-colors cursor-pointer disabled:cursor-default disabled:opacity-50"
                        title={`Insert ${token}`}
                      >
                        {token}
                      </button>
                      <span className="text-slate-500 text-xs truncate">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FieldRow>
        </div>
      </div>

      {/* Bottom action bar — slides in when there are unsaved changes */}
      {canWrite && (
        <div
          className={cn(
            "shrink-0 border-t border-slate-200 bg-white flex items-center justify-between px-8 transition-all duration-200 overflow-hidden",
            isDirty ? "h-16 opacity-100" : "h-0 opacity-0 pointer-events-none",
          )}
        >
          <div className="flex items-center gap-3">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
              {dirtyCount}
            </span>
            <span className="text-sm font-medium text-slate-700">Unsaved changes</span>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={handleDiscard}
              className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              Discard
            </Button>
            <Button
              onClick={() => savePartner.mutate()}
              disabled={!isDirty || savePartner.isPending}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {savePartner.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PartnerDetail() {
  const [, params] = useRoute("/partners/:partnerId");
  const [, navigate] = useLocation();
  const search = useSearch();
  const defaultTab = new URLSearchParams(search).get("tab") === "campaigns" ? "campaigns" : "details";
  const { profile } = useAuth();
  const canWrite = profile?.role === "admin" || profile?.role === "manager";
  const qc = useQueryClient();

  const partnerId = Number(params?.partnerId);

  const partnerQ = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: () => fetchPartner(partnerId),
    enabled: !isNaN(partnerId),
  });

  const partnerStatusesQ = useQuery({
    queryKey: ["partner-statuses"],
    queryFn: fetchPartnerStatuses,
  });

  const partnerTypesQ = useQuery({
    queryKey: ["partner-types"],
    queryFn: fetchPartnerTypes,
  });

  const campaignStatusesQ = useQuery({
    queryKey: ["campaign-statuses"],
    queryFn: fetchCampaignStatuses,
  });

  const partner = partnerQ.data;

  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<CampaignRow | null>(null);

  const { sortKey: campSortKey, sortDir: campSortDir, toggleSort: campToggleSort, resetSort: campResetSort } =
    useSortState<CampaignsSortKey>("created_at", "desc");

  const campaignFilter = {
    search: campaignSearch,
    statusFilter: campaignStatusFilter,
    sortKey: campSortKey ?? "created_at",
    sortDir: campSortDir,
  };

  const campaignsQ = useInfiniteQuery({
    queryKey: ["partner-campaigns", partnerId, campaignFilter],
    queryFn: ({ pageParam = 0 }) =>
      fetchCampaignsForPartner(partnerId, campaignFilter, pageParam as number),
    initialPageParam: 0,
    getNextPageParam: (last, pages) => (last.hasMore ? pages.length : undefined),
    enabled: !isNaN(partnerId),
  });

  const campaignRows = useMemo(
    () => (campaignsQ.data?.pages ?? []).flatMap((p) => p.rows),
    [campaignsQ.data],
  );

  const visibleIds = useMemo(() => campaignRows.map((c) => c.campaign_id), [campaignRows]);

  const [dateRange, setDateRange] = useState<DateRange>(() =>
    getPresetRange("today", "America/New_York"),
  );

  const performanceQ = useQuery({
    queryKey: ["partner-campaign-performance", visibleIds, dateRange.from, dateRange.to],
    queryFn: () => fetchPerformance(visibleIds, dateRange),
    enabled: visibleIds.length > 0,
  });

  const perfFor = (id: number) =>
    performanceQ.data?.get(id) ?? { visitors: 0, revenue: 0, cost: 0 };

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && campaignsQ.hasNextPage && !campaignsQ.isFetchingNextPage) {
          void campaignsQ.fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [campaignsQ]);

  const partnerOptionsQ = useQuery({
    queryKey: ["partner-options"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("partner_id, name").order("name");
      if (error) throw error;
      return (data ?? []) as PartnerOption[];
    },
  });

  if (partnerQ.isLoading) {
    return (
      <AppLayout active="partners">
        <div className="flex-1 flex items-center justify-center text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          Loading partner…
        </div>
      </AppLayout>
    );
  }

  if (partnerQ.isError || !partner) {
    return (
      <AppLayout active="partners">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-slate-500">Partner not found.</p>
            <Button variant="outline" onClick={() => navigate("/partners")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Partners
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const savedStatus = partnerStatusesQ.data?.find(
    (s) => s.partner_status_id === partner.partner_status_id,
  );

  function statusBadgeClass(name: string | undefined) {
    if (!name) return null;
    const s = name.toLowerCase();
    if (s === "active") return "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200";
    if (s === "paused") return "bg-amber-50 text-amber-700 hover:bg-amber-100 border-amber-200";
    return "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200";
  }

  const badgeClasses = statusBadgeClass(savedStatus?.name);

  return (
    <AppLayout active="partners">
      <Header
        title={partner.name}
        titleBadge={
          savedStatus && badgeClasses ? (
            <Badge className={badgeClasses}>
              {savedStatus.name}
            </Badge>
          ) : undefined
        }
        subtitle={
          <button
            onClick={() => navigate("/partners")}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Partners
          </button>
        }
      />

      <div className="flex-1 min-h-0 flex flex-col bg-white">
        <Tabs defaultValue={defaultTab} className="flex-1 flex flex-col min-h-0">
          {/* Tab bar — px-8 aligns tabs with content rows, justify-start overrides shadcn's default justify-center */}
          <TabsList className="flex w-full items-center justify-start gap-6 border-b border-slate-200 rounded-none bg-white p-0 h-auto px-8 pt-6">
            <TabsTrigger
              value="details"
              className="cursor-pointer pb-3 text-sm font-medium rounded-none border-b-2 shadow-none bg-transparent px-0 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-700"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              className="cursor-pointer pb-3 text-sm font-medium rounded-none border-b-2 shadow-none bg-transparent px-0 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-700"
            >
              Campaigns
              {campaignRows.length > 0 && (
                <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">
                  {campaignRows.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Details Tab ── */}
          <TabsContent value="details" className="flex-1 mt-0 flex flex-col min-h-0">
            <PartnerDetailsForm
              partner={partner}
              partnerStatuses={partnerStatusesQ.data ?? []}
              partnerTypes={partnerTypesQ.data ?? []}
              canWrite={canWrite}
              onSaved={() => void partnerQ.refetch()}
            />
          </TabsContent>

          {/* ── Campaigns Tab ── */}
          <TabsContent value="campaigns" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 flex flex-col gap-4 min-h-0 p-8">
              {/* Toolbar */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-64">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={campaignSearch}
                      onChange={(e) => {
                        setCampaignSearch(e.target.value);
                        if (e.target.value === "") campResetSort();
                      }}
                      placeholder="Search campaigns…"
                      className="pl-9 bg-white"
                    />
                  </div>
                  <Select
                    value={campaignStatusFilter}
                    onValueChange={(v) => {
                      setCampaignStatusFilter(v);
                      if (v === "all") campResetSort();
                    }}
                  >
                    <SelectTrigger className="w-32 bg-white">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      {campaignStatusesQ.data?.map((s) => (
                        <SelectItem key={s.campaign_status_id} value={s.name}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <DateRangePicker value={dateRange} onChange={setDateRange} />
                </div>
                {canWrite && (
                  <Button
                    onClick={() => {
                      setEditingCampaign(null);
                      setCampaignDialogOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    New Campaign
                  </Button>
                )}
              </div>

              {/* Table */}
              <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 min-h-0 flex flex-col">
                <div className="overflow-auto flex-1">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow className="border-slate-200">
                        <SortableHeader
                          label="Campaign"
                          sortKey="name"
                          activeSortKey={campSortKey}
                          activeSortDir={campSortDir}
                          onSort={(k) => campToggleSort(k as CampaignsSortKey)}
                          className="font-medium"
                        />
                        <TableHead className="font-medium text-right">Visitors</TableHead>
                        <TableHead className="font-medium text-right">Revenue</TableHead>
                        <TableHead className="font-medium text-right">Cost</TableHead>
                        <TableHead className="font-medium text-right">Profit</TableHead>
                        <SortableHeader
                          label="Status"
                          sortKey="campaign_status_id"
                          activeSortKey={campSortKey}
                          activeSortDir={campSortDir}
                          onSort={(k) => campToggleSort(k as CampaignsSortKey)}
                          className="font-medium"
                        />
                        <SortableHeader
                          label="Created"
                          sortKey="created_at"
                          activeSortKey={campSortKey}
                          activeSortDir={campSortDir}
                          onSort={(k) => campToggleSort(k as CampaignsSortKey)}
                          className="font-medium"
                        />
                        {canWrite && <TableHead className="w-[60px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {campaignsQ.isLoading && (
                        <TableRow>
                          <TableCell colSpan={canWrite ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Loading…
                          </TableCell>
                        </TableRow>
                      )}
                      {!campaignsQ.isLoading && campaignRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={canWrite ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                            No campaigns for this partner yet.
                          </TableCell>
                        </TableRow>
                      )}
                      {campaignRows.map((c) => {
                        const status = c.enum_campaign_status?.name ?? "—";
                        const p = perfFor(c.campaign_id);
                        const profit = p.revenue - p.cost;
                        return (
                          <TableRow key={c.campaign_id} className="hover:bg-slate-50/50 transition-colors">
                            <TableCell>
                              <div className="font-medium text-slate-900">{c.name}</div>
                              <div className="text-xs text-slate-500 mt-0.5 font-mono">
                                {c.campaign_uid.slice(0, 8)}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-700 text-right tabular-nums">
                              {performanceQ.isFetching ? "…" : num(p.visitors)}
                            </TableCell>
                            <TableCell className="text-slate-700 text-right tabular-nums">
                              {performanceQ.isFetching ? "…" : usd(p.revenue)}
                            </TableCell>
                            <TableCell className="text-slate-700 text-right tabular-nums">
                              {performanceQ.isFetching ? "…" : usd(p.cost)}
                            </TableCell>
                            <TableCell
                              className={`text-right tabular-nums font-medium ${
                                profit >= 0 ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {performanceQ.isFetching ? "…" : usd(profit)}
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
                            {canWrite && (
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  title="Edit campaign"
                                  onClick={() => {
                                    setEditingCampaign(c);
                                    setCampaignDialogOpen(true);
                                  }}
                                  className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                      {campaignsQ.hasNextPage && (
                        <TableRow ref={sentinelRef}>
                          <TableCell colSpan={canWrite ? 8 : 7} className="py-4 text-center text-slate-400 text-xs">
                            {campaignsQ.isFetchingNextPage ? (
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
          </TabsContent>
        </Tabs>
      </div>

      {campaignDialogOpen && (
        <CampaignDialog
          open={campaignDialogOpen}
          onOpenChange={(v) => {
            setCampaignDialogOpen(v);
            if (!v) setEditingCampaign(null);
          }}
          partners={partnerOptionsQ.data ?? []}
          statuses={campaignStatusesQ.data ?? []}
          editing={editingCampaign}
          preselectedPartnerId={editingCampaign == null ? partnerId : undefined}
          onSuccess={() => {
            void qc.invalidateQueries({ queryKey: ["partner-campaigns", partnerId] });
            void qc.invalidateQueries({ queryKey: ["partners"] });
          }}
        />
      )}
    </AppLayout>
  );
}
