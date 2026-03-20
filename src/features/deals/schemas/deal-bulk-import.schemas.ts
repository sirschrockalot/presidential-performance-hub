import { z } from "zod";

import { MAX_DEAL_IMPORT_ROWS } from "@/lib/security/import-limits";

const optionalTrimmedString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  });

const optionalNonNegative = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") return null;
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num) || num < 0) return null;
    return num;
  });

const optionalDateString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    return trimmed;
  });

export const importDealStatusSchema = z.enum([
  "lead",
  "under_contract",
  "marketed",
  "buyer_committed",
  "emd_received",
  "assigned",
  "closed_funded",
  "canceled",
]);

export const dealImportRowSchema = z
  .object({
    externalRef: optionalTrimmedString,
    propertyAddress: optionalTrimmedString,
    city: optionalTrimmedString,
    state: optionalTrimmedString,
    zipCode: optionalTrimmedString,
    sellerName: optionalTrimmedString,
    buyerName: optionalTrimmedString,
    status: optionalTrimmedString,
    leadSource: optionalTrimmedString,
    assignedTo: optionalTrimmedString,
    acquisitionRep: optionalTrimmedString,
    dispositionRep: optionalTrimmedString,
    contractDate: optionalDateString,
    closingDate: optionalDateString,
    purchasePrice: optionalNonNegative,
    salePrice: optionalNonNegative,
    /** When set with prices, fee = sale − purchase − additionalExpenses (may be negative); otherwise legacy `assignmentFee` may be used. */
    additionalExpenses: optionalNonNegative,
    additionalExpense: optionalNonNegative,
    assignmentFee: optionalNonNegative,
    emdAmount: optionalNonNegative,
    arv: optionalNonNegative,
    mao: optionalNonNegative,
    offerAmount: optionalNonNegative,
    notes: optionalTrimmedString,
  })
  .passthrough();

export const dealBulkImportSchema = z
  .object({
    deals: z
      .array(dealImportRowSchema)
      .min(1, "At least one deal is required")
      .max(MAX_DEAL_IMPORT_ROWS, `At most ${MAX_DEAL_IMPORT_ROWS} deals per request`),
  })
  .strict();

export type DealBulkImportInput = z.infer<typeof dealBulkImportSchema>;
export type DealImportRow = z.infer<typeof dealImportRowSchema>;
