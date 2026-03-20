import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { listUsersForDealAssignment } from "@/features/deals/server/deals.service";

describe("listUsersForDealAssignment scope", () => {
  it("ADMIN uses only active-user filter (full directory for assignment UI)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { user: { findMany, findUnique: vi.fn() } } as unknown as PrismaClient;

    await listUsersForDealAssignment(prisma, {
      id: "admin1",
      roleCode: "ADMIN",
      teamCode: "OPERATIONS",
    });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { active: true },
      })
    );
  });

  it("REP does not receive unscoped active:true-only query (prevents full directory)", async () => {
    const findMany = vi.fn().mockResolvedValue([]);
    const prisma = { user: { findMany, findUnique: vi.fn() } } as unknown as PrismaClient;

    await listUsersForDealAssignment(prisma, {
      id: "rep1",
      roleCode: "REP",
      teamCode: "ACQUISITIONS",
    });

    const where = findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        active: true,
        OR: expect.arrayContaining([{ id: "rep1" }, { team: { code: "DISPOSITIONS" } }, { role: { code: "TRANSACTION_COORDINATOR" } }]),
      })
    );
    expect(where).not.toEqual({ active: true });
  });
});
