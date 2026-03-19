import { z } from "zod";

export const drawStatusUiSchema = z.enum(["pending", "approved", "paid", "partially_recouped", "recouped", "denied"]);

export type DrawRequestBody = {
  dealId: string;
  repId: string;
  amount: number;
  notes?: string | null;
};

/**
 * Runtime validation only — Zod's `.pipe`/`.strict` combo widens `z.infer` to all-optional in TS;
 * we assert the output type so API routes match `CreateDrawInput`.
 */
export const drawRequestSchema = z
  .object({
    dealId: z.string().min(1),
    repId: z.string().min(1),
    amount: z.union([z.number(), z.string()]).pipe(z.coerce.number().positive().finite()),
    notes: z.string().optional().nullable(),
  })
  .strict() as z.ZodType<DrawRequestBody>;

/** PATCH /api/draws/:id — admin draw workflow */
export type DrawUpdateBody = {
  status: "approved" | "paid" | "recouped" | "denied";
  note?: string | null;
  amountRecoupedDelta?: number;
};

/**
 * Note: avoid `z.preprocess` on fields here — with `.strict()` it can widen `z.infer` so every key
 * becomes optional in TS (Next.js typecheck). Use coerce on a dedicated field schema instead.
 */
export const drawUpdateSchema = z
  .object({
    status: z.enum(["approved", "paid", "recouped", "denied"]),
    note: z.string().optional().nullable(),
    amountRecoupedDelta: z.union([z.number(), z.string()]).pipe(z.coerce.number().nonnegative().finite()).optional(),
  })
  .strict() as z.ZodType<DrawUpdateBody>;

export const drawIdParamSchema = z.object({
  id: z.string().min(1),
});

export const drawListQuerySchema = z.object({
  status: drawStatusUiSchema.optional(),
});

export const drawRepHistoryQuerySchema = z.object({
  repId: z.string().min(1).optional(),
});

