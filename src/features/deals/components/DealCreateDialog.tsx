"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  createDealSchema,
  type CreateDealFormValues,
  type CreateDealInput,
} from "@/features/deals/schemas/deal.schemas";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DealFormFields } from "@/features/deals/components/DealFormFields";
import { useCreateDeal, useDealFormUsers } from "@/features/deals/hooks/use-deals";
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { EmptyState } from "@/components/shared/EmptyState";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DEAL_STATUS_CONFIG, type DealStatus } from "@/types";
import { AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const defaultValues: CreateDealFormValues = {
  propertyAddress: "",
  sellerName: "",
  buyerName: null,
  acquisitionsRepId: "",
  dispoRepId: null,
  transactionCoordinatorId: null,
  contractDate: new Date().toISOString().slice(0, 10),
  assignedDate: null,
  closedFundedDate: null,
  inspectionEndDate: null,
  contractPrice: 0,
  assignmentPrice: null,
  additionalExpense: null,
  assignmentFee: null,
  buyerEmdAmount: null,
  buyerEmdReceived: false,
  titleCompany: "",
  status: "lead",
  initialNote: null,
};

export function DealCreateDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const router = useRouter();
  const { data: users = [], isLoading: usersLoading, isError: usersError, error, refetch } = useDealFormUsers();
  const createMut = useCreateDeal();

  const form = useForm<CreateDealFormValues, unknown, CreateDealInput>({
    resolver: zodResolver(createDealSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const deal = await createMut.mutateAsync(values);
      toast.success("Deal created");
      onOpenChange(false);
      form.reset(defaultValues);
      router.push(`/deals/${deal.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create deal");
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New deal</DialogTitle>
          <DialogDescription>Add a property to the pipeline. Required fields are marked.</DialogDescription>
        </DialogHeader>
        {usersLoading ? (
          <div className="flex justify-center py-12 text-muted-foreground text-sm">
            <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading team…
          </div>
        ) : usersError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Unable to load team members"
            description={error instanceof Error ? error.message : "Could not load assignee options."}
            actionLabel="Try Again"
            onAction={() => void refetch()}
            className="py-10"
          />
        ) : (
          <Form {...form}>
            <form onSubmit={onSubmit} className="space-y-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Starting status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(Object.keys(DEAL_STATUS_CONFIG) as DealStatus[]).map((key) => (
                          <SelectItem key={key} value={key}>
                            {DEAL_STATUS_CONFIG[key].label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DealFormFields form={form} users={users} showInitialNote autoCalculateAssignmentFee />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMut.isPending}>
                  {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create deal
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
