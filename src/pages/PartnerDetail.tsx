import { useMemo, useState, useEffect, useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
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
import { Label } from "@/components/ui/label";
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

type Partner = {
  partner_id: number;
  partner_uid: string;
  name: string;
  partner_type_id: number;
  partner_status_id: number | null;
  postback_url: string | null;
  created_at: string;
  enum_partner_status?: { name: string } | null;
  enum_partner_type?: { name: string } | null;
};

type PartnerStatus = {
  partner_status_id: number;
  name: string;
};

type PartnerType = {
  partner_type_id: number;
  name: string;
};

type Campaign = {
  campaign_id: number;
  campaign_uid: string;
  name: string;
  campaign_status_id: number;
  created_at: string;
  enum_campaign_status?: { name: string } | null;
};

type CampaignPerformance = {
  campaign_id: number;
  visitors: number;
  revenue: number;
  cost: number;
};

type CampaignsSortKey = "name" | "campaign_status_id" | "created_at";

type DetailsFormProps = {
  partner: Partner;
  partnerStatuses: PartnerStatus[];
  partnerTypes: PartnerType[];
  canWrite: boolean;
  onSaved: () => void;
};

const POSTBACK_TOKENS = [
  { token: "{click_id}", desc: "Unique click identifier" },
  { token: "{campaign_id}", desc: "Campaign ID" },
  { token: "{sub1}", desc: "Custom sub-parameter 1" },
  { token: "{sub2}", desc: "Custom sub-parameter 2" },
  { token: "{sub3}", desc: "Custom sub-parameter 3" },
  { token: "{sub4}", desc: "Custom sub-parameter 4" },
  { token: "{aff_id}", desc: "Affiliate ID" },
];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      }}
      className="ml-1.5 inline-flex items-center text-slate-400 hover:text-indigo-600"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
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
          "flex items-start py-4 px-8 border-b border-slate-100 transition-colors",
          dirty ? "bg-amber-50/50" : readOnly ? "bg-slate-50" : "",
        )}
      >
        <div className="w-[200px] shrink-0 pt-[7px] text-sm font-medium text-slate-500 flex items-center gap-2">
          {label}
          {dirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />}
        </div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 overflow-y-auto">
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

          <FieldRow label="Created" readOnly>
            <div className="py-1 text-sm text-slate-700">{formatDate(partner.created_at)}</div>
          </FieldRow>
        </div>

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
              className={cn("max-w-[400px]", nameDirty && "border-amber-300 bg-amber-50/30")}
            />
          </FieldRow>

          <FieldRow label="Type" dirty={typeDirty}>
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
            <div className="space-y-3 py-1">
              <Input
                value={formPostbackUrl}
                onChange={(e) => setFormPostbackUrl(e.target.value)}
                placeholder="https://partner.example.com/postback?cid={click_id}"
                disabled={!canWrite}
                className={cn("font-mono text-sm", postbackDirty && "border-amber-300 bg-amber-50/30")}
              />
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-md p-3 space-y-1.5">
                <p className="font-medium text-slate-600">Supported tokens:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  {POSTBACK_TOKENS.map(({ token, desc }) => (
                    <div key={token} className="flex items-center gap-1.5">
                      <code className="text-indigo-700 bg-indigo-50 px-1 rounded text-[11px]">
                        {token}
                      </code>
                      <span className="text-slate-400 text-[11px] truncate">{desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FieldRow>
        </div>
      </div>

      {canWrite && (
        <div
          className={cn(
            "shrink-0 border-t border-slate-200 bg-white flex items-center justify-between px-6 transition-all duration-200 overflow-hidden",
            isDirty ? "h-16 opacity-100" : "h-0 opacity-0 pointer-events-none",
          )}
        >
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-[11px] font-bold text-white">
              {dirtyCount}
            </span>
            Unsaved changes
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={handleDiscard}
              className="text-slate-600 hover:text-slate-900"
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

function PartnerDetailPage() {
  const [match, params] = useRoute("/partners/:partnerId");
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const partnerId = Number(params?.partnerId);

  const partnerQ = useQuery({
    queryKey: ["partner", partnerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*")
        .eq("partner_id", partnerId)
        .maybeSingle();
      if (error) throw error;
      return data as Partner | null;
    },
    enabled: !!match && Number.isFinite(partnerId),
  });

  const partnerStatusesQ = useQuery({
    queryKey: ["partner-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_statuses").select("*").order("name");
      if (error) throw error;
      return data as PartnerStatus[];
    },
  });

  const partnerTypesQ = useQuery({
    queryKey: ["partner-types"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partner_types").select("*").order("name");
      if (error) throw error;
      return data as PartnerType[];
    },
  });

  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("all");
  const [campaignDialogOpen, setCampaignDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const {
    sortKey: campaignSortKey,
    sortDir: campaignSortDir,
    toggleSort: campToggleSort,
    resetSort: campResetSort,
  } = useSortState<CampaignsSortKey>("created_at");
  const [campaignRows, setCampaignRows] = useState<Campaign[]>([]);
  const [campaignPerf, setCampaignPerf] = useState<Record<number, CampaignPerformance>>({});

  const canWrite = !!user;

  useEffect(() => {
    document.title = partnerQ.data?.name ? `${partnerQ.data.name} | Prime Intent Portal` : "Prime Intent Portal";
  }, [partnerQ.data?.name]);

  const campaignStatusesQ = useQuery({
    queryKey: ["campaign-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("campaign_statuses").select("*").order("name");
      if (error) throw error;
      return data as { campaign_status_id: number; name: string }[];
    },
  });

  const campaignRowsQ = useInfiniteQuery({
    queryKey: ["partner-campaigns", partnerId, campaignSearch, campaignStatusFilter, campaignSortKey, campaignSortDir],
    queryFn: async () => ({ pages: [] as Campaign[][], pageParams: [] }),
    initialPageParam: 0,
    getNextPageParam: () => undefined,
    enabled: false,
  });

  useEffect(() => {
    setCampaignRows([]);
  }, [campaignSearch, campaignStatusFilter, campaignSortKey, campaignSortDir]);

  const performanceQ = useQuery({
    queryKey: ["campaign-perf", campaignRows.map((c) => c.campaign_id).join(",")],
    queryFn: async () => {
      const perf: Record<number, CampaignPerformance> = {};
      for (const c of campaignRows) perf[c.campaign_id] = { campaign_id: c.campaign_id, visitors: 0, revenue: 0, cost: 0 };
      return perf;
    },
    enabled: false,
  });

  const perfFor = (campaignId: number) => campaignPerf[campaignId] ?? { campaign_id: campaignId, visitors: 0, revenue: 0, cost: 0 };

  const sentinelRef = useRef<HTMLTableRowElement | null>(null);

  if (!match) return null;
  if (partnerQ.isLoading) return <div />;
  if (!partnerQ.data) {
    return (
      <AppLayout active="partners">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <p className="text-slate-500">Partner not found.</p>
            <Button variant="outline" onClick={() => navigate("/partners")}>Back</Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  const partner = partnerQ.data;

  return (
    <AppLayout active="partners">
      <Header title={partner.name} subtitle={<button onClick={() => navigate("/partners")}>Back to Partners</button>} />
      <div className="flex-1 min-h-0 flex flex-col">
        <Tabs defaultValue="details" className="flex-1 flex flex-col min-h-0">
          <TabsList className="flex w-full items-center justify-start gap-6 border-b border-slate-200 rounded-none bg-transparent p-0 h-auto pt-6">
            <TabsTrigger
              value="details"
              className="pb-3 text-sm font-medium rounded-none border-b-2 shadow-none bg-transparent px-0 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-700"
            >
              Details
            </TabsTrigger>
            <TabsTrigger
              value="campaigns"
              className="pb-3 text-sm font-medium rounded-none border-b-2 shadow-none bg-transparent px-0 data-[state=active]:border-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:bg-transparent data-[state=inactive]:border-transparent data-[state=inactive]:text-slate-500 hover:text-slate-700"
            >
              Campaigns
              {campaignRows.length > 0 && (
                <span className="ml-1.5 text-xs bg-slate-200 text-slate-600 rounded-full px-1.5 py-0.5">
                  {campaignRows.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="flex-1 mt-0 flex flex-col min-h-0">
            <PartnerDetailsForm
              partner={partner}
              partnerStatuses={partnerStatusesQ.data ?? []}
              partnerTypes={partnerTypesQ.data ?? []}
              canWrite={canWrite}
              onSaved={() => void partnerQ.refetch()}
            />
          </TabsContent>

          <TabsContent value="campaigns" className="flex-1 flex flex-col min-h-0 mt-0">
            <div className="flex-1 flex flex-col gap-4 min-h-0 p-8">
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

              <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 min-h-0 flex flex-col">
                <div className="overflow-auto flex-1">
                  <Table>
                    <TableHeader className="bg-slate-50 sticky top-0 z-10">
                      <TableRow className="border-slate-200">
                        <SortableHeader
                          label="Campaign"
                          sortKey="name"
                          activeSortKey={campaignSortKey}
                          activeSortDir={campaignSortDir}
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
                          activeSortKey={campaignSortKey}
                          activeSortDir={campaignSortDir}
                          onSort={(k) => campToggleSort(k as CampaignsSortKey)}
                          className="font-medium"
                        />
                        <SortableHeader
                          label="Created"
                          sortKey="created_at"
                          activeSortKey={campaignSortKey}
                          activeSortDir={campaignSortDir}
                          onSort={(k) => campToggleSort(k as CampaignsSortKey)}
                          className="font-medium"
                        />
                        {canWrite && <TableHead className="w-[60px]" />}
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-100">
                      {campaignRowsQ.isLoading && (
                        <TableRow>
                          <TableCell colSpan={canWrite ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                            Loading…
                          </TableCell>
                        </TableRow>
                      )}
                      {!campaignRowsQ.isLoading && campaignRows.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={canWrite ? 8 : 7} className="px-4 py-10 text-center text-slate-400">
                            No campaigns for this partner yet.
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
    </AppLayout>
  );
}

export default PartnerDetailPage;
