import { describe, it, expect } from "vitest";

import { kpiBulkImportSchema } from "@/features/kpis/schemas/kpi-bulk-import.schemas";
import { MAX_KPI_IMPORT_WEEKS } from "@/lib/security/import-limits";

const validWeek = {
  weekStarting: "2025-01-06",
  acquisitions: [
    {
      repName: "Test Rep",
      dials: 0,
      talkHours: 0,
      offersMade: 0,
      contractsSigned: 0,
    },
  ],
  dispositions: [],
};

describe("kpiBulkImportSchema limits", () => {
  it("rejects more than MAX_KPI_IMPORT_WEEKS", () => {
    const weeks = Array.from({ length: MAX_KPI_IMPORT_WEEKS + 1 }, () => ({ ...validWeek }));
    const parsed = kpiBulkImportSchema.safeParse({ weeks });
    expect(parsed.success).toBe(false);
  });
});
