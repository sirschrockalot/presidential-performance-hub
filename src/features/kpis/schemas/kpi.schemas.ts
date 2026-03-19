import { z } from "zod";

export const weekStartingSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected date in YYYY-MM-DD format");

const requiredNonNegInt = z.coerce.number().int().min(0);
const requiredNonNegDecimal = z.coerce.number().min(0);

const baseFields = {
  weekStarting: weekStartingSchema,
  repUserId: z.string().min(1, "repUserId is required"),
  dials: requiredNonNegInt,
  talkTimeMinutes: requiredNonNegInt,
  falloutCount: requiredNonNegInt,
  revenueFromFunded: requiredNonNegDecimal,
};

export const acquisitionsKpiUpsertSchema = z
  .object({
    team: z.literal("acquisitions"),
    ...baseFields,
    leadsWorked: requiredNonNegInt,
    offersMade: requiredNonNegInt,
    contractsSigned: requiredNonNegInt,
  })
  .strict();

export const dispositionsKpiUpsertSchema = z
  .object({
    team: z.literal("dispositions"),
    ...baseFields,
    buyerConversations: requiredNonNegInt,
    propertiesMarketed: requiredNonNegInt,
    emdsReceived: requiredNonNegInt,
    assignmentsSecured: requiredNonNegInt,
    avgAssignmentFee: requiredNonNegDecimal,
  })
  .strict();

export const kpiUpsertSchema = z.discriminatedUnion("team", [
  acquisitionsKpiUpsertSchema,
  dispositionsKpiUpsertSchema,
]);

export const kpiTeamQuerySchema = z.object({
  team: z.enum(["acquisitions", "dispositions"]),
});

export const kpiHistoryQuerySchema = z.object({
  team: z.enum(["acquisitions", "dispositions"]),
  repUserId: z.string().min(1).optional(),
});

export const kpiEntriesQuerySchema = z.object({
  team: z.enum(["acquisitions", "dispositions"]),
  weekStarting: weekStartingSchema.optional(),
});

