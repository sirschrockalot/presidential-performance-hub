"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import {
  useDeal,
  useUpdateDealStatus,
  useAddDealNote,
} from "@/features/deals/hooks/use-deals";
import { useAuthz } from "@/lib/auth/authz-context";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { MetricCard } from "@/components/shared/MetricCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { DEAL_STATUS_CONFIG, DealStatus } from "@/types";
import { checkDrawEligibilityFromDeal } from "@/features/deals/lib/draw-eligibility";
import { DealEditSheet } from "@/features/deals/components/DealEditSheet";
import {
  ArrowLeft,
  DollarSign,
  User,
  Building2,
  FileText,
  ShieldCheck,
  ShieldX,
  Paperclip,
  Clock,
  TrendingUp,
  Percent,
  Banknote,
  Trophy,
  Loader2,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { format } from "date-fns";
import { toast } from "sonner";

const PIPELINE_STATUSES: DealStatus[] = [
  "lead",
  "under_contract",
  "marketed",
  "buyer_committed",
  "emd_received",
  "assigned",
  "closed_funded",
];

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2 border-b border-border/50 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}

function DealStatusUpdater({
  dealId,
  currentStatus,
}: {
  dealId: string;
  currentStatus: DealStatus;
}) {
  const [status, setStatus] = useState<DealStatus>(currentStatus);
  const [note, setNote] = useState("");
  const mut = useUpdateDealStatus(dealId);

  useEffect(() => {
    setStatus(currentStatus);
  }, [currentStatus]);

  const onSave = async () => {
    if (status === currentStatus) {
      toast.message("No change to status");
      return;
    }
    try {
      await mut.mutateAsync({ status, note: note.trim() || null });
      toast.success("Status updated");
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    }
  };

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold">Update status</h3>
      <p className="text-xs text-muted-foreground">
        Changes are saved to the deal and recorded in history.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>New status</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as DealStatus)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DEAL_STATUS_CONFIG) as DealStatus[]).map((key) => (
                <SelectItem key={key} value={key}>
                  {DEAL_STATUS_CONFIG[key].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Note (optional)</Label>
          <Textarea
            rows={2}
            placeholder="Reason or context for this transition…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>
      <Button type="button" size="sm" onClick={onSave} disabled={mut.isPending}>
        {mut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
        Save status
      </Button>
    </div>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const { data: deal, isLoading, isFetching } = useDeal(id);
  const [editOpen, setEditOpen] = useState(false);
  const { can } = useAuthz();
  const [noteDraft, setNoteDraft] = useState("");
  const addNote = useAddDealNote(id);

  const eligibility = useMemo(
    () =>
      deal
        ? checkDrawEligibilityFromDeal({
            status: deal.status,
            buyerEmdReceived: deal.buyerEmdReceived,
          })
        : { eligible: false, reason: "" },
    [deal]
  );

  const statusIdx = deal ? PIPELINE_STATUSES.indexOf(deal.status) : -1;
  const showPipeline = deal && deal.status !== "canceled";

  if (isLoading && !deal) {
    return <LoadingState variant="detail" className="max-w-[1200px] mx-auto" />;
  }
  if (!deal) {
    return (
      <EmptyState
        title="Deal not found"
        description="The deal you're looking for doesn't exist or you don't have access."
      />
    );
  }

  const margin =
    deal.assignmentFee && deal.contractPrice
      ? ((deal.assignmentFee / deal.contractPrice) * 100).toFixed(1)
      : null;

  const onAddNote = async () => {
    const body = noteDraft.trim();
    if (!body) return;
    try {
      await addNote.mutateAsync(body);
      setNoteDraft("");
      toast.success("Note added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add note");
    }
  };

  return (
    <div className="space-y-6 max-w-[1200px] mx-auto relative">
      {isFetching && (
        <div className="absolute right-0 top-0 text-xs text-muted-foreground flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" /> Syncing…
        </div>
      )}
      <Link
        href="/deals"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Deals
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{deal.propertyAddress}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Seller: {deal.sellerName}
            {deal.buyerName && <> · Buyer: {deal.buyerName}</>}
          </p>
        </div>
        <div className="flex flex-col items-stretch sm:items-end gap-3">
          <div className="flex items-center gap-3 flex-wrap justify-end">
            {eligibility.eligible ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 rounded-full px-2.5 py-1">
                <ShieldCheck className="h-3.5 w-3.5" /> Draw eligible
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-muted rounded-full px-2.5 py-1">
                <ShieldX className="h-3.5 w-3.5" /> {eligibility.reason}
              </span>
            )}
            <StatusBadge status={deal.status} className="text-sm px-3 py-1" />
            {can("deal:edit") && (
              <Button variant="outline" size="sm" type="button" onClick={() => setEditOpen(true)}>
                Edit deal
              </Button>
            )}
          </div>
          {can("deal:edit") && <DealStatusUpdater dealId={deal.id} currentStatus={deal.status} />}
        </div>
      </div>

      {deal.status === "canceled" && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive font-medium">
          This deal is canceled.
        </div>
      )}

      {showPipeline && (
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
            Deal progress
          </h3>
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {PIPELINE_STATUSES.map((s, i) => {
              const reached = statusIdx >= 0 && i <= statusIdx;
              return (
                <div key={s} className="flex items-center gap-1 min-w-0">
                  <div
                    className={`flex items-center justify-center h-7 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {DEAL_STATUS_CONFIG[s].label}
                  </div>
                  {i < PIPELINE_STATUSES.length - 1 && (
                    <div
                      className={`w-6 h-0.5 rounded-full ${reached && i < statusIdx ? "bg-primary" : "bg-border"}`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MetricCard title="Contract Price" value={`$${deal.contractPrice.toLocaleString()}`} icon={DollarSign} />
        <MetricCard
          title="Assignment Price"
          value={deal.assignmentPrice ? `$${deal.assignmentPrice.toLocaleString()}` : "—"}
          icon={DollarSign}
        />
        <MetricCard
          title="Assignment Fee"
          value={deal.assignmentFee ? `$${deal.assignmentFee.toLocaleString()}` : "—"}
          icon={TrendingUp}
          variant={deal.assignmentFee ? "success" : "default"}
        />
        <MetricCard title="Margin" value={margin ? `${margin}%` : "—"} icon={Percent} />
        <MetricCard
          title="Buyer EMD"
          value={deal.buyerEmdReceived ? `$${(deal.buyerEmdAmount || 0).toLocaleString()}` : "Not received"}
          variant={deal.buyerEmdReceived ? "info" : "warning"}
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="draws">Draws ({deal.draws.length})</TabsTrigger>
          <TabsTrigger value="points">Points ({deal.pointEvents.length})</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <User className="h-4 w-4" /> Team assignment
              </h3>
              <InfoRow label="Acquisitions Rep" value={deal.acquisitionsRepName} />
              <InfoRow label="Dispo Rep" value={deal.dispoRepName || "Unassigned"} />
              <InfoRow label="Transaction Coordinator" value={deal.tcName || "Unassigned"} />
            </div>
            <div className="rounded-lg border bg-card p-5">
              <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4" /> Deal details
              </h3>
              <InfoRow label="Title Company" value={deal.titleCompany} />
              <InfoRow label="Buyer" value={deal.buyerName || "TBD"} />
              <InfoRow label="Contract Date" value={deal.contractDate} />
              <InfoRow label="Inspection End" value={deal.inspectionEndDate || "—"} />
              <InfoRow label="Assigned Date" value={deal.assignedDate || "—"} />
              <InfoRow label="Closed Date" value={deal.closedFundedDate || "—"} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="rounded-lg border bg-card p-5">
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <DollarSign className="h-4 w-4" /> Financial summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <InfoRow label="Contract Price" value={`$${deal.contractPrice.toLocaleString()}`} />
                <InfoRow
                  label="Assignment Price"
                  value={deal.assignmentPrice ? `$${deal.assignmentPrice.toLocaleString()}` : "—"}
                />
                <InfoRow
                  label="Assignment Fee (Spread)"
                  value={deal.assignmentFee ? `$${deal.assignmentFee.toLocaleString()}` : "—"}
                />
                <InfoRow label="Margin" value={margin ? `${margin}%` : "—"} />
              </div>
              <div>
                <InfoRow
                  label="Buyer EMD Amount"
                  value={deal.buyerEmdAmount ? `$${deal.buyerEmdAmount.toLocaleString()}` : "—"}
                />
                <InfoRow label="EMD Received" value={deal.buyerEmdReceived ? "Yes" : "No"} />
                <InfoRow
                  label="Total Draws"
                  value={`$${deal.draws.reduce((s, d) => s + d.amount, 0).toLocaleString()}`}
                />
                <InfoRow
                  label="Net After Draws"
                  value={
                    deal.assignmentFee
                      ? `$${(deal.assignmentFee - deal.draws.reduce((s, d) => s + d.amount, 0)).toLocaleString()}`
                      : "—"
                  }
                />
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="draws">
          {deal.draws.length === 0 ? (
            <EmptyState
              icon={Banknote}
              title="No draws"
              description="No draws have been issued for this deal yet."
            />
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Rep
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Balance
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deal.draws.map((d) => (
                    <tr key={d.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{d.repName}</td>
                      <td className="py-3 px-4 text-right font-mono">${d.amount.toLocaleString()}</td>
                      <td className="py-3 px-4">
                        {d.status === "paid" && d.amountRecouped > 0 && d.remainingBalance > 0 ? (
                          <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-success/15 text-success border-l-2 border-l-success">
                            Partially recouped
                          </span>
                        ) : (
                          <StatusBadge status={d.status} type="draw" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">{d.dateIssued || "—"}</td>
                      <td className="py-3 px-4 text-right font-mono">${d.remainingBalance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="points">
          {deal.pointEvents.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No points awarded"
              description="Points appear when deals fund or manual adjustments are posted."
            />
          ) : (
            <div className="rounded-lg border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Rep
                    </th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Points
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {deal.pointEvents.map((pe) => (
                    <tr key={pe.id} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium">{pe.userName}</td>
                      <td className="py-3 px-4 text-right font-bold font-mono text-success">+{pe.points}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{pe.reason}</td>
                      <td className="py-3 px-4 text-muted-foreground">{pe.createdAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="activity">
          {deal.statusHistory.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No history yet"
              description="Status changes will appear here."
            />
          ) : (
            <div className="rounded-lg border bg-card divide-y">
              {deal.statusHistory.map((h) => (
                <div key={h.id} className="p-4 flex flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground text-xs">
                      {format(new Date(h.changedAt), "MMM d, yyyy h:mm a")}
                    </span>
                    <span className="font-medium">
                      {h.fromStatus ? (
                        <>
                          {DEAL_STATUS_CONFIG[h.fromStatus].label}
                          <span className="text-muted-foreground mx-1">→</span>
                        </>
                      ) : null}
                      {DEAL_STATUS_CONFIG[h.toStatus].label}
                    </span>
                    <span className="text-xs text-muted-foreground">· {h.changedByName}</span>
                  </div>
                  {h.note && <p className="text-xs text-muted-foreground pl-0">{h.note}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <div className="rounded-lg border bg-card p-5 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <FileText className="h-4 w-4" /> Notes
            </h3>
            {deal.notes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            ) : (
              <ul className="space-y-3">
                {deal.notes.map((n) => (
                  <li key={n.id} className="border-b border-border/50 last:border-0 pb-3 last:pb-0">
                    <p className="text-sm whitespace-pre-wrap">{n.body}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {n.authorName} · {format(new Date(n.createdAt), "MMM d, yyyy h:mm a")}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2 pt-2 border-t">
              <Label htmlFor="new-note">Add note</Label>
              <Textarea
                id="new-note"
                placeholder="Add a note…"
                rows={3}
                value={noteDraft}
                onChange={(e) => setNoteDraft(e.target.value)}
              />
              <Button size="sm" type="button" onClick={onAddNote} disabled={addNote.isPending || !noteDraft.trim()}>
                {addNote.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Add note
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documents">
          <EmptyState
            icon={Paperclip}
            title="No documents"
            description="Upload contracts, assignments, and closing documents here."
            actionLabel="Upload Document"
            onAction={() => {}}
          />
        </TabsContent>
      </Tabs>

      {can("deal:edit") && <DealEditSheet deal={deal} open={editOpen} onOpenChange={setEditOpen} />}
    </div>
  );
}
