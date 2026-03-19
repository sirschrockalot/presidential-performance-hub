import { z } from "zod";

/** UI deal status literals (match `src/types` DealStatus) */
export const dealUiStatusSchema = z.enum([
  "lead",
  "under_contract",
  "marketed",
  "buyer_committed",
  "emd_received",
  "assigned",
  "closed_funded",
  "canceled",
]);

export type DealUiStatus = z.infer<typeof dealUiStatusSchema>;

const emptyToNull = (v: unknown) => (v === "" ? null : v);

const optionalDateString = z
  .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal(""), z.null()])
  .optional()
  .transform((v) => (v === "" || v === undefined ? null : v));

const requiredDateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

/** Empty / null / undefined → undefined; otherwise non-negative number */
const optionalNonNegNumber = z.preprocess((v) => {
  if (v === "" || v === null || v === undefined) return undefined;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}, z.number().nonnegative().optional());

export const createDealSchema = z.object({
  propertyAddress: z.string().min(1, "Property address is required"),
  sellerName: z.string().min(1, "Seller name is required"),
  buyerName: z.preprocess(emptyToNull, z.string().optional().nullable()),
  acquisitionsRepId: z.string().min(1, "Acquisitions rep is required"),
  dispoRepId: z.preprocess(emptyToNull, z.string().optional().nullable()),
  transactionCoordinatorId: z.preprocess(emptyToNull, z.string().optional().nullable()),
  contractDate: requiredDateString,
  assignedDate: optionalDateString,
  closedFundedDate: optionalDateString,
  inspectionEndDate: optionalDateString,
  contractPrice: z.coerce.number().nonnegative("Must be zero or positive"),
  assignmentPrice: optionalNonNegNumber.nullable(),
  assignmentFee: optionalNonNegNumber.nullable(),
  buyerEmdAmount: optionalNonNegNumber.nullable(),
  buyerEmdReceived: z.coerce.boolean().default(false),
  titleCompany: z.string().min(1, "Title company is required"),
  status: dealUiStatusSchema.optional().default("lead"),
  initialNote: z.preprocess(emptyToNull, z.string().max(10000).optional().nullable()),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;

export const updateDealSchema = z.object({
  propertyAddress: z.string().min(1).optional(),
  sellerName: z.string().min(1).optional(),
  buyerName: z.preprocess(emptyToNull, z.string().optional().nullable()),
  acquisitionsRepId: z.string().min(1).optional(),
  dispoRepId: z.preprocess(emptyToNull, z.string().optional().nullable()),
  transactionCoordinatorId: z.preprocess(emptyToNull, z.string().optional().nullable()),
  contractDate: requiredDateString.optional(),
  assignedDate: optionalDateString,
  closedFundedDate: optionalDateString,
  inspectionEndDate: optionalDateString,
  contractPrice: z.coerce.number().nonnegative().optional(),
  assignmentPrice: optionalNonNegNumber.nullable().optional(),
  assignmentFee: optionalNonNegNumber.nullable().optional(),
  buyerEmdAmount: optionalNonNegNumber.nullable().optional(),
  buyerEmdReceived: z.coerce.boolean().optional(),
  titleCompany: z.string().min(1).optional(),
});

export type UpdateDealInput = z.infer<typeof updateDealSchema>;

export const updateDealStatusSchema = z.object({
  status: dealUiStatusSchema,
  note: z.preprocess(emptyToNull, z.string().max(2000).optional().nullable()),
});

export type UpdateDealStatusInput = z.infer<typeof updateDealStatusSchema>;

export const addDealNoteSchema = z.object({
  body: z.string().min(1, "Note cannot be empty").max(10000),
});

export type AddDealNoteInput = z.infer<typeof addDealNoteSchema>;

export const listDealsQuerySchema = z.object({
  search: z.string().optional(),
  status: z.union([dealUiStatusSchema, z.literal("all")]).optional().default("all"),
  sortBy: z
    .enum(["propertyAddress", "contractDate", "status", "contractPrice", "updatedAt"])
    .optional()
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
});

export type ListDealsQuery = z.infer<typeof listDealsQuerySchema>;
