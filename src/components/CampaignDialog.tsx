import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";

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

interface CampaignDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  partners: PartnerOption[];
  statuses: CampaignStatus[];
  editing: CampaignRow | null;
  preselectedPartnerId?: number;
  onSuccess?: () => void;
}

export function CampaignDialog({
  open,
  onOpenChange,
  partners,
  statuses,
  editing,
  preselectedPartnerId,
  onSuccess,
}: CampaignDialogProps) {
  const qc = useQueryClient();
  const isEdit = editing !== null;

  const initialPartnerId = editing
    ? String(editing.partner_id)
    : preselectedPartnerId != null
      ? String(preselectedPartnerId)
      : "";

  const startStep: 1 | 2 = isEdit || preselectedPartnerId != null ? 2 : 1;

  const [step, setStep] = useState<1 | 2>(startStep);
  const [partnerId, setPartnerId] = useState<string>(initialPartnerId);
  const [name, setName] = useState(editing?.name ?? "");
  const [origin, setOrigin] = useState(editing?.origin ?? "google");
  const [channel, setChannel] = useState(editing?.channel ?? "cpc");
  const [externalId, setExternalId] = useState(editing?.campaign_external_id ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [statusId, setStatusId] = useState<string>(
    String(
      editing?.campaign_status_id ??
        statuses.find((s) => s.name === "Active")?.campaign_status_id ??
        statuses[0]?.campaign_status_id ??
        "",
    ),
  );
  const [error, setError] = useState<string | null>(null);

  const partnerName =
    preselectedPartnerId != null
      ? partners.find((p) => p.partner_id === preselectedPartnerId)?.name
      : partners.find((p) => String(p.partner_id) === partnerId)?.name;

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        partner_id: Number(partnerId),
        name: name.trim(),
        origin: origin.trim(),
        channel: channel.trim(),
        campaign_external_id: externalId.trim() || null,
        description: description.trim() || null,
        campaign_status_id: Number(statusId),
      };
      if (isEdit && editing) {
        const { error: e } = await supabase
          .from("campaigns")
          .update(payload)
          .eq("campaign_id", editing.campaign_id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("campaigns").insert(payload);
        if (e) throw e;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["campaigns"] });
      onSuccess?.();
      onOpenChange(false);
    },
    onError: (err: unknown) =>
      setError(err instanceof Error ? err.message : "Save failed"),
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    save.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Campaign" : "New Campaign"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update tracking and details for this campaign."
              : preselectedPartnerId != null
                ? `Creating a campaign for ${partnerName ?? "this partner"}.`
                : `Step ${step} of 2: ${
                    step === 1
                      ? "Select a partner."
                      : "Configure tracking and details."
                  }`}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && !isEdit && preselectedPartnerId == null && (
          <div className="space-y-3 max-h-80 overflow-auto">
            {partners.length === 0 && (
              <div className="text-sm text-slate-500">
                No partners yet. Add one first.
              </div>
            )}
            {partners.map((p) => (
              <div
                key={p.partner_id}
                onClick={() => setPartnerId(String(p.partner_id))}
                className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  String(p.partner_id) === partnerId
                    ? "border-indigo-600 bg-indigo-50/30 ring-1 ring-indigo-600"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <span className="font-medium text-sm text-slate-900">
                  {p.name}
                </span>
              </div>
            ))}
            <DialogFooter className="pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={!partnerId}
                onClick={() => setStep(2)}
                className="bg-slate-900 hover:bg-slate-800 text-white"
              >
                Continue
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={onSubmit} className="space-y-4">
            {(isEdit || preselectedPartnerId != null) && (
              <div className="text-xs text-slate-500">
                Partner:{" "}
                <span className="font-medium text-slate-700">
                  {partnerName ?? "—"}
                </span>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="c-name">Campaign Name</Label>
              <Input
                id="c-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Auto Insure Q4 Search"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-origin">Origin (UTM source)</Label>
                <Input
                  id="c-origin"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-channel">Channel (UTM medium)</Label>
                <Input
                  id="c-channel"
                  required
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="c-ext">External Campaign ID</Label>
                <Input
                  id="c-ext"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  placeholder="GAds 12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-status">Status</Label>
                <Select value={statusId} onValueChange={setStatusId}>
                  <SelectTrigger id="c-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map((s) => (
                      <SelectItem
                        key={s.campaign_status_id}
                        value={String(s.campaign_status_id)}
                      >
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="c-desc">Notes (optional)</Label>
              <Textarea
                id="c-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-20 resize-none"
                placeholder="Any special terms…"
              />
            </div>
            {error && (
              <div className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-md px-3 py-2">
                {error}
              </div>
            )}
            <DialogFooter>
              {!isEdit && preselectedPartnerId == null && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
              )}
              {(isEdit || preselectedPartnerId != null) && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="submit"
                disabled={save.isPending}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {save.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isEdit ? (
                  "Save changes"
                ) : (
                  "Create Campaign"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
