import { z } from "zod";

import { weekStartingSchema } from "@/features/kpis/schemas/kpi.schemas";
import {
  MAX_KPI_IMPORT_WEEKS,
  MAX_KPI_REPS_PER_TEAM_PER_WEEK,
} from "@/lib/security/import-limits";

const nonNegInt = z.coerce.number().int().min(0);

// Input uses talkHours (decimal hours); store in DB as talkTimeMinutes (int minutes).
const talkTimeMinutesFromHoursSchema = z.coerce
  .number()
  .min(0)
  .transform((hours) => Math.round(hours * 60))
  .refine((minutes) => Number.isInteger(minutes), "talkHours must convert to whole minutes");

const repNameSchema = z
  .string()
  .min(1, "repName is required")
  .transform((s) => s.trim().replace(/\s+/g, " "));

export const acquisitionsRepImportSchema = z
  .object({
    repName: repNameSchema,
    dials: nonNegInt,
    talkHours: talkTimeMinutesFromHoursSchema,
    offersMade: nonNegInt,
    contractsSigned: nonNegInt,
  })
  .strict()
  .transform((v) => ({
    repName: v.repName,
    dials: v.dials,
    talkTimeMinutes: v.talkHours, // renamed by the transform
    offersMade: v.offersMade,
    contractsSigned: v.contractsSigned,
  }));

export const dispositionsRepImportSchema = z
  .object({
    repName: repNameSchema,
    dials: nonNegInt,
    talkHours: talkTimeMinutesFromHoursSchema,
  })
  .strict()
  .transform((v) => ({
    repName: v.repName,
    dials: v.dials,
    talkTimeMinutes: v.talkHours, // renamed by the transform
  }));

const kpiBulkImportWeekSchemaBase = z
  .object({
    weekStarting: weekStartingSchema,
    acquisitions: z
      .array(acquisitionsRepImportSchema)
      .max(MAX_KPI_REPS_PER_TEAM_PER_WEEK)
      .default([]),
    dispositions: z
      .array(dispositionsRepImportSchema)
      .max(MAX_KPI_REPS_PER_TEAM_PER_WEEK)
      .default([]),
  })
  .strict();

export const kpiBulkImportWeekSchema = kpiBulkImportWeekSchemaBase.refine(
  (w) => w.acquisitions.length + w.dispositions.length > 0,
  "Each week must include acquisitions or dispositions"
);

export const kpiBulkImportSchema = z
  .object({
    weeks: z
      .array(kpiBulkImportWeekSchema)
      .min(1)
      .max(MAX_KPI_IMPORT_WEEKS, `At most ${MAX_KPI_IMPORT_WEEKS} weeks per request`),
  })
  .strict();

export type KpiBulkImportInput = z.infer<typeof kpiBulkImportSchema>;
export type KpiBulkImportWeek = z.infer<typeof kpiBulkImportWeekSchema>;
export type AcquisitionsRepImport = z.infer<typeof acquisitionsRepImportSchema>;
export type DispositionsRepImport = z.infer<typeof dispositionsRepImportSchema>;

