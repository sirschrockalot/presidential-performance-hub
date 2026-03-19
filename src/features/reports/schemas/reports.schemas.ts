import { z } from "zod";

export const reportsDatePresetSchema = z.enum([
  "this-week",
  "this-month",
  "last-month",
  "this-quarter",
  "ytd",
]);

export const reportsFiltersSchema = z
  .object({
    datePreset: reportsDatePresetSchema.optional().default("this-month"),
    // Rep/team filters are optional; server will additionally enforce RBAC scoping.
    repId: z.string().min(1).optional().nullable(),
    team: z.enum(["acquisitions", "dispositions", "operations"]).optional().nullable(),
    // Where helpful for deals profitability.
    dealStatus: z.enum(["CLOSED_FUNDED", "ALL"]).optional().default("CLOSED_FUNDED"),
  })
  .strict();

