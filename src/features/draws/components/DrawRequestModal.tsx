"use client";

import { useEffect, useState } from "react";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { drawRequestSchema } from "@/features/draws/schemas";
import type { CreateDrawInput, DrawRequestDealOptionDto, DrawRequestRepOptionDto } from "@/features/draws/server/draws.service";

import { useAuthz } from "@/lib/auth/authz-context";
import { useCreateDrawRequest, useDrawFormDeals, useDrawFormReps } from "@/features/draws/hooks/use-draws";

import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

import { ShieldCheck, ShieldX } from "lucide-react";

export default function DrawRequestModal({ onClose }: { onClose: () => void }) {
  const { user, roleCode } = useAuthz();
  const isRep = roleCode === "REP";

  const { data: reps, isLoading: repsLoading } = useDrawFormReps();
  const [repId, setRepId] = useState<string>("");

  useEffect(() => {
    if (isRep && user?.id) setRepId(user.id);
  }, [isRep, user?.id]);

  useEffect(() => {
    if (!isRep && reps && reps.length && !repId) setRepId(reps[0].id);
  }, [isRep, reps, repId]);

  const { data: deals, isLoading: dealsLoading } = useDrawFormDeals(repId || undefined);

  // Initialize the form once repId is known.
  const form = useForm<CreateDrawInput>({
    resolver: zodResolver(drawRequestSchema),
    defaultValues: {
      dealId: "",
      repId: repId || "",
      amount: 0,
      notes: "",
    },
  });

  // Keep RHF repId in sync with UI selection.
  useEffect(() => {
    form.setValue("repId", repId);
  }, [repId, form]);

  const selectedDealOption = deals?.find((d) => d.id === form.watch("dealId"));
  const amount = form.watch("amount");

  const canSubmit = !!selectedDealOption?.eligible && amount > 0 && !form.formState.isSubmitting;

  const createMut = useCreateDrawRequest();

  const onSubmit = async (values: CreateDrawInput) => {
    if (!selectedDealOption?.eligible) {
      toast.error(selectedDealOption?.reason ?? "Deal not eligible for a draw");
      return;
    }
    try {
      await createMut.mutateAsync(values);
      toast.success("Draw request submitted");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to submit draw request");
    }
  };

  if (repsLoading && !isRep) {
    return <div className="py-8 text-center text-muted-foreground">Loading reps…</div>;
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      {!isRep && (
        <div className="space-y-2">
          <Label>Rep</Label>
          <Select
            value={repId}
            onValueChange={(v) => setRepId(v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select rep" />
            </SelectTrigger>
            <SelectContent>
              {(reps ?? []).map((r: DrawRequestRepOptionDto) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name} ({r.team})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label>Deal</Label>
        <Select
          value={form.watch("dealId")}
          onValueChange={(v) => form.setValue("dealId", v, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue placeholder={dealsLoading ? "Loading deals…" : "Select deal"} />
          </SelectTrigger>
          <SelectContent>
            {(deals ?? []).map((d: DrawRequestDealOptionDto) => (
              <SelectItem key={d.id} value={d.id}>
                {d.propertyAddress.slice(0, 40)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Amount</Label>
        <Input
          type="number"
          placeholder="0.00"
          step="0.01"
          {...form.register("amount", { valueAsNumber: true })}
        />
      </div>

      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea {...form.register("notes")} placeholder="Reason for draw request…" rows={3} />
      </div>

      <div className="bg-muted/50 rounded-md p-3 text-xs text-muted-foreground">
        <strong className="text-foreground">Eligibility:</strong>{" "}
        {selectedDealOption?.eligible ? (
          <span className="inline-flex items-center gap-1 text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Eligible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1">
            <ShieldX className="h-3.5 w-3.5" /> {selectedDealOption?.reason ?? "Select a deal"}
          </span>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={!canSubmit}>
          {createMut.isPending ? "Submitting…" : "Submit Request"}
        </Button>
      </DialogFooter>
    </form>
  );
}
