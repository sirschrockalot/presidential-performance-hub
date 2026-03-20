"use client";

import { useEffect } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { computeAssignmentFee } from "@/features/deals/utils/assignment-fee";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AssignmentUserDto } from "@/features/deals/api/deals-client";

type FormValues = Record<string, unknown>;

function userLabel(u: AssignmentUserDto): string {
  const role = u.roleCode.replace(/_/g, " ");
  return `${u.name} (${role})`;
}

export function DealFormFields<T extends FormValues>({
  form,
  users,
  showInitialNote,
  autoCalculateAssignmentFee,
}: {
  form: UseFormReturn<T>;
  users: AssignmentUserDto[];
  showInitialNote?: boolean;
  /** When true: assignment fee = assignment price − contract price [− additional expense if entered]. */
  autoCalculateAssignmentFee?: boolean;
}) {
  const contractPrice = useWatch({ control: form.control, name: "contractPrice" as any });
  const assignmentPrice = useWatch({ control: form.control, name: "assignmentPrice" as any });
  const additionalExpense = useWatch({ control: form.control, name: "additionalExpense" as any });

  useEffect(() => {
    if (!autoCalculateAssignmentFee) return;
    const fee = computeAssignmentFee(
      contractPrice as number | null | undefined,
      assignmentPrice as number | null | undefined,
      additionalExpense as number | null | undefined
    );
    form.setValue("assignmentFee" as any, fee as any, {
      shouldValidate: false,
      shouldDirty: false,
      shouldTouch: true,
    });
  }, [autoCalculateAssignmentFee, assignmentPrice, additionalExpense, contractPrice, form]);

  const acqCandidates = users.filter(
    (u) => u.teamCode === "ACQUISITIONS" && (u.roleCode === "REP" || u.roleCode === "ACQUISITIONS_MANAGER")
  );
  const dispoCandidates = users.filter(
    (u) => u.teamCode === "DISPOSITIONS" && (u.roleCode === "REP" || u.roleCode === "DISPOSITIONS_MANAGER")
  );
  const tcCandidates = users.filter((u) => u.roleCode === "TRANSACTION_COORDINATOR" || u.roleCode === "ADMIN");

  const acqOptions = acqCandidates.length ? acqCandidates : users;
  const dispoOptions = dispoCandidates.length ? dispoCandidates : users;
  const tcOptions = tcCandidates.length ? tcCandidates : users;

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name={"propertyAddress" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Property address</FormLabel>
            <FormControl>
              <Input placeholder="123 Main St, City ST 00000" {...field} value={(field.value as string) ?? ""} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={"sellerName" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Seller name</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"buyerName" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Buyer name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={"acquisitionsRepId" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Acquisitions rep</FormLabel>
              <Select onValueChange={field.onChange} value={(field.value as string) || undefined}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select rep" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {acqOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {userLabel(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"dispoRepId" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Dispositions rep</FormLabel>
              <Select
                onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
                value={(field.value as string) || "__none__"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="__none__">Unassigned</SelectItem>
                  {dispoOptions.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {userLabel(u)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={"transactionCoordinatorId" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Transaction coordinator</FormLabel>
            <Select
              onValueChange={(v) => field.onChange(v === "__none__" ? null : v)}
              value={(field.value as string) || "__none__"}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="__none__">Unassigned</SelectItem>
                {tcOptions.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {userLabel(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={"contractDate" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contract date</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"titleCompany" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title company</FormLabel>
              <FormControl>
                <Input {...field} value={(field.value as string) ?? ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={"assignedDate" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"closedFundedDate" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Closed / funded date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={"inspectionEndDate" as any}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Inspection end date</FormLabel>
            <FormControl>
              <Input
                type="date"
                {...field}
                value={(field.value as string) ?? ""}
                onChange={(e) => field.onChange(e.target.value || null)}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={"contractPrice" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contract price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...field}
                  value={field.value === undefined || field.value === null ? "" : String(field.value)}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? undefined : Number(v));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"assignmentPrice" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment price</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...field}
                  value={field.value === undefined || field.value === null ? "" : String(field.value)}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : Number(v));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {autoCalculateAssignmentFee && (
        <FormField
          control={form.control}
          name={"additionalExpense" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional expense</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...field}
                  value={field.value === undefined || field.value === null ? "" : String(field.value)}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : Number(v));
                  }}
                />
              </FormControl>
              <FormDescription>
                Optional. If you enter a value: Assignment price − Contract price − Additional expense = Assignment fee.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name={"assignmentFee" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assignment fee</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  readOnly={!!autoCalculateAssignmentFee}
                  tabIndex={autoCalculateAssignmentFee ? -1 : undefined}
                  className={autoCalculateAssignmentFee ? "bg-muted cursor-default" : undefined}
                  {...field}
                  value={field.value === undefined || field.value === null ? "" : String(field.value)}
                  onChange={(e) => {
                    if (autoCalculateAssignmentFee) return;
                    const v = e.target.value;
                    field.onChange(v === "" ? null : Number(v));
                  }}
                />
              </FormControl>
              {autoCalculateAssignmentFee ? (
                <FormDescription>
                  Assignment price − Contract price = Assignment fee. With an additional expense entered: Assignment price
                  − Contract price − Additional expense = Assignment fee.
                </FormDescription>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={"buyerEmdAmount" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Buyer EMD amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  {...field}
                  value={field.value === undefined || field.value === null ? "" : String(field.value)}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === "" ? null : Number(v));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={form.control}
        name={"buyerEmdReceived" as any}
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <FormLabel>Buyer EMD received</FormLabel>
            </div>
            <FormControl>
              <Switch checked={!!field.value} onCheckedChange={field.onChange} />
            </FormControl>
          </FormItem>
        )}
      />

      {showInitialNote && (
        <FormField
          control={form.control}
          name={"initialNote" as any}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial note (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Context for the team…"
                  {...field}
                  value={(field.value as string) ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
