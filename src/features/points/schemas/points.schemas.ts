import { z } from "zod";

export const pointsManualAdjustmentSchema = z
  .object({
    recipientUserId: z.string().min(1),
    // Can be positive or negative; supports 0.5 increments.
    points: z.coerce.number().finite(),
    reason: z.string().min(1).max(2000),
    // Optional linkage for audit traceability.
    dealId: z.string().min(1).optional().nullable(),
  })
  .strict();

export const pointsEventsQuerySchema = z
  .object({
    repId: z.string().min(1).optional(),
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  })
  .strict();

