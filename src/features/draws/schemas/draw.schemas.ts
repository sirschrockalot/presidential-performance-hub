import { z } from "zod";

import type { DrawStatus } from "@/types";

export const drawStatusUiSchema = z.enum(["pending", "approved", "paid", "partially_recouped", "recouped", "denied"]);

const nonNegMoney = z.coerce.number().nonnegative().finite();
const positiveMoney = z.coerce.number().positive().finite();

export const drawRequestSchema = z
  .object({
    dealId: z.string().min(1),
    repId: z.string().min(1),
    amount: positiveMoney,
    notes: z.string().optional().nullable(),
  })
  .strict();

export const drawUpdateSchema = z
  .object({
    status: z.enum(["approved", "paid", "recouped", "denied"] as const),
    note: z.string().optional().nullable(),
    // Delta approach: amountRecoupedDelta is the additional recouped amount to add.
    amountRecoupedDelta: nonNegMoney.optional(),
  })
  .strict();

export const drawIdParamSchema = z.object({
  id: z.string().min(1),
});

export const drawListQuerySchema = z.object({
  status: drawStatusUiSchema.optional(),
});

export const drawRepHistoryQuerySchema = z.object({
  repId: z.string().min(1).optional(),
});

