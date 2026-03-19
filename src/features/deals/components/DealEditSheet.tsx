"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateDealSchema, type UpdateDealInput } from "@/features/deals/schemas/deal.schemas";
import type { DealDetailDto } from "@/features/deals/api/deals-client";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { DealFormFields } from "@/features/deals/components/DealFormFields";
import { useDealFormUsers, useUpdateDeal } from "@/features/deals/hooks/use-deals";
import { EmptyState } from "@/components/shared/EmptyState";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";

function dealToFormValues(deal: DealDetailDto): UpdateDealInput {
  return {
    propertyAddress: deal.propertyAddress,
    sellerName: deal.sellerName,
    buyerName: deal.buyerName,
    acquisitionsRepId: deal.acquisitionsRepId,
    dispoRepId: deal.dispoRepId,
    transactionCoordinatorId: deal.transactionCoordinatorId,
    contractDate: deal.contractDate,
    assignedDate: deal.assignedDate,
    closedFundedDate: deal.closedFundedDate,
    inspectionEndDate: deal.inspectionEndDate,
    contractPrice: deal.contractPrice,
    assignmentPrice: deal.assignmentPrice,
    assignmentFee: deal.assignmentFee,
    buyerEmdAmount: deal.buyerEmdAmount,
    buyerEmdReceived: deal.buyerEmdReceived,
    titleCompany: deal.titleCompany,
  };
}

export function DealEditSheet({
  deal,
  open,
  onOpenChange,
}: {
  deal: DealDetailDto;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: users = [], isLoading: usersLoading, isError: usersError, error, refetch } = useDealFormUsers();
  const updateMut = useUpdateDeal(deal.id);

  const form = useForm<UpdateDealInput>({
    resolver: zodResolver(updateDealSchema),
    defaultValues: dealToFormValues(deal),
  });

  useEffect(() => {
    if (open) {
      form.reset(dealToFormValues(deal));
    }
  }, [deal, open, form]);

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await updateMut.mutateAsync(values);
      toast.success("Deal updated");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    }
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit deal</SheetTitle>
          <SheetDescription>Update fields and save. Status changes use the status panel on the page.</SheetDescription>
        </SheetHeader>
        {usersLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading…
          </div>
        ) : usersError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load team members"
            description={error instanceof Error ? error.message : "Could not load assignee options."}
            actionLabel="Try Again"
            onAction={() => void refetch()}
            className="mt-6 py-10"
          />
        ) : (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4 mt-6">
              <DealFormFields form={form} users={users} />
              <Button type="submit" className="w-full" disabled={updateMut.isPending}>
                {updateMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save changes
              </Button>
            </form>
          </Form>
        )}
      </SheetContent>
    </Sheet>
  );
}
