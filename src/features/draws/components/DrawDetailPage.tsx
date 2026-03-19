"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { StatusBadge } from "@/components/shared/StatusBadge";
import { CheckCircle, AlertTriangle, ShieldCheck, ShieldX, Banknote, User, Building2 } from "lucide-react";
import { useAuthz } from "@/lib/auth/authz-context";

import { useDrawDetail, useUpdateDrawStatus } from "@/features/draws/hooks/use-draws";

import { DrawDetailDto } from "@/features/draws/server/draws.service";

function DrawStatusBadge({ statusDisplay }: { statusDisplay: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "Pending", className: "bg-warning/15 text-warning border-l-2 border-l-warning" },
    approved: { label: "Approved", className: "bg-info/15 text-info border-l-2 border-l-info" },
    paid: { label: "Paid", className: "bg-success/15 text-success border-l-2 border-l-success" },
    partially_recouped: { label: "Partially recouped", className: "bg-success/15 text-success border-l-2 border-l-success" },
    recouped: { label: "Recouped", className: "bg-muted text-muted-foreground border-l-2 border-l-muted" },
    denied: { label: "Denied", className: "bg-destructive/15 text-destructive border-l-2 border-l-destructive" },
  };
  const c = config[statusDisplay] ?? { label: statusDisplay, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

export default function DrawDetailPage() {
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";

  const { can } = useAuthz();
  const { data: draw, isLoading, isFetching } = useDrawDetail(id);
  const updateMut = useUpdateDrawStatus(id);

  const [noteDraft, setNoteDraft] = useState("");
  const [recoupDelta, setRecoupDelta] = useState<number>(0);

  const recoupHint = useMemo(() => {
    if (!draw) return "";
    const remaining = draw.remainingBalance;
    return remaining > 0 ? `Remaining: $${remaining.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";
  }, [draw]);

  if (isLoading && !draw) {
    return <LoadingState variant="detail" className="max-w-[900px] mx-auto" />;
  }

  if (!draw) {
    return (
      <EmptyState
        icon={Banknote}
        title="Draw not found"
        description="The draw you’re looking for doesn’t exist or you don’t have access."
      />
    );
  }

  const canApprove = can("draw:approve") && (draw.status === "pending" || draw.status === "approved");
  const isPending = draw.status === "pending";
  const isApprovedOrPaid = draw.status === "approved" || draw.status === "paid";
  const showRecoupActions = can("draw:approve") && isApprovedOrPaid && draw.remainingBalance > 0;

  return (
    <div className="space-y-6 max-w-[1000px] mx-auto">
      <PageHeader
        title="Draw Detail"
        description={draw.dealAddress}
      >
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {draw.eligible ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success bg-success/10 rounded-full px-2.5 py-1">
              <ShieldCheck className="h-3.5 w-3.5" /> Eligible
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted rounded-full px-2.5 py-1">
              <ShieldX className="h-3.5 w-3.5" /> Ineligible
            </span>
          )}

          <DrawStatusBadge statusDisplay={draw.statusDisplay} />

          {can("draw:approve") && (
            <span className="text-xs text-muted-foreground">
              Approved by: {draw.approvedByName ?? "—"}
            </span>
          )}
        </div>
      </PageHeader>

      {isFetching && (
        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <span className="animate-spin h-2 w-2 rounded-full bg-muted-foreground/60" />
          Syncing…
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <User className="h-4 w-4" /> Rep
          </h3>
          <p className="text-sm font-medium">{draw.repName}</p>
          <p className="text-xs text-muted-foreground">{draw.repId}</p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Banknote className="h-4 w-4" /> Amount
          </h3>
          <p className="text-sm font-medium font-mono">
            ${draw.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-muted-foreground">Recouped: ${draw.amountRecouped.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          <p className="text-xs text-muted-foreground">{recoupHint}</p>
        </div>

        <div className="rounded-lg border bg-card p-5">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
            <Building2 className="h-4 w-4" /> Status
          </h3>
          <p className="text-sm text-muted-foreground">
            Date issued: {draw.dateIssued ?? "—"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Eligible at submission: {draw.eligible ? "Yes" : "No"}
          </p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-5 space-y-4">
        <h3 className="text-sm font-semibold">Notes</h3>
        {draw.notes ? <p className="text-sm text-muted-foreground whitespace-pre-wrap">{draw.notes}</p> : <p className="text-sm text-muted-foreground">No notes.</p>}

        {can("draw:approve") && (
          <div className="space-y-3 pt-2 border-t">
            <h3 className="text-sm font-semibold">Update Status</h3>

            {isPending && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  type="button"
                  onClick={() => updateMut.mutate({ status: "approved", note: noteDraft.trim() || null })}
                  disabled={updateMut.isPending}
                >
                  {updateMut.isPending ? "Updating…" : "Approve"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  type="button"
                  onClick={() => updateMut.mutate({ status: "denied", note: noteDraft.trim() || null })}
                  disabled={updateMut.isPending}
                >
                  Deny
                </Button>
              </div>
            )}

            {draw.status !== "pending" && (
              <div className="space-y-2">
                <label className="text-xs text-muted-foreground">Add/update notes (optional)</label>
                <Textarea
                  rows={2}
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  placeholder="Reason / context for this update…"
                />
              </div>
            )}

            {showRecoupActions && (
              <div className="space-y-3 pt-2 border-t">
                <h4 className="text-sm font-semibold">Recoupment</h4>
                <div className="flex gap-3 flex-wrap items-end">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Amount to recoup (delta)</label>
                    <Input
                      type="number"
                      step="0.01"
                      min={0}
                      value={recoupDelta}
                      onChange={(e) => setRecoupDelta(Number(e.target.value))}
                      className="h-9 w-44"
                    />
                  </div>

                  <Button
                    size="sm"
                    type="button"
                    disabled={updateMut.isPending || recoupDelta <= 0}
                    onClick={() =>
                      updateMut.mutate({
                        status: "paid",
                        amountRecoupedDelta: recoupDelta,
                        note: noteDraft.trim() || null,
                      })
                    }
                  >
                    Mark Paid
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    type="button"
                    disabled={updateMut.isPending || recoupDelta <= 0 || recoupDelta > draw.remainingBalance}
                    onClick={() =>
                      updateMut.mutate({
                        status: "recouped",
                        amountRecoupedDelta: recoupDelta,
                        note: noteDraft.trim() || null,
                      })
                    }
                  >
                    Mark Recouped
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Tip: set delta equal to the remaining balance to mark fully recouped.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

