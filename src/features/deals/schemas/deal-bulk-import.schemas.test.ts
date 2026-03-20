import { describe, it, expect } from "vitest";

import { dealBulkImportSchema } from "@/features/deals/schemas/deal-bulk-import.schemas";
import { MAX_DEAL_IMPORT_ROWS } from "@/lib/security/import-limits";

describe("dealBulkImportSchema limits", () => {
  it("rejects payloads over MAX_DEAL_IMPORT_ROWS", () => {
    const deals = Array.from({ length: MAX_DEAL_IMPORT_ROWS + 1 }, () => ({}));
    const parsed = dealBulkImportSchema.safeParse({ deals });
    expect(parsed.success).toBe(false);
  });
});
