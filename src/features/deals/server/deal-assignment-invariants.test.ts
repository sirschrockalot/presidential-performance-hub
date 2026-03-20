import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import {
  INVALID_DEAL_ASSIGNMENT_MESSAGE,
  resolveValidatedDealAssignments,
} from "@/features/deals/server/deal-assignment-invariants";

function prismaWithUsers(
  users: Record<string, { teamCode: "ACQUISITIONS" | "DISPOSITIONS" | "OPERATIONS"; roleCode: string }>
) {
  const findMany = vi.fn(async (args: { where: { id: { in: string[] }; active: boolean } }) => {
    const ids = args.where.id.in;
    return ids
      .map((id) => {
        const u = users[id];
        if (!u) return null;
        return {
          id,
          team: { code: u.teamCode },
          role: { code: u.roleCode },
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null);
  });

  const findUnique = vi.fn(async (args: { where: { id: string } }) => {
    const u = users[args.where.id];
    if (!u) return null;
    return { team: { code: u.teamCode } };
  });

  return { user: { findMany, findUnique } } as unknown as PrismaClient;
}

describe("resolveValidatedDealAssignments", () => {
  it("REP on ACQUISITIONS forces acquisitionsRepId to actor and rejects wrong acq in input", async () => {
    const prisma = prismaWithUsers({
      rep1: { teamCode: "ACQUISITIONS", roleCode: "REP" },
      acq2: { teamCode: "ACQUISITIONS", roleCode: "REP" },
    });

    const out = await resolveValidatedDealAssignments(prisma, { id: "rep1", roleCode: "REP", teamCode: "ACQUISITIONS" }, "acq2", null, null);

    expect(out.acqId).toBe("rep1");
  });

  it("ADMIN rejects unknown user id", async () => {
    const prisma = prismaWithUsers({
      adm: { teamCode: "OPERATIONS", roleCode: "ADMIN" },
      acq1: { teamCode: "ACQUISITIONS", roleCode: "REP" },
    });

    await expect(
      resolveValidatedDealAssignments(prisma, { id: "adm", roleCode: "ADMIN" }, "no_such_user", null, null)
    ).rejects.toThrow(INVALID_DEAL_ASSIGNMENT_MESSAGE);
  });

  it("REP on DISPOSITIONS forces dispoRepId to actor", async () => {
    const prisma = prismaWithUsers({
      repD: { teamCode: "DISPOSITIONS", roleCode: "REP" },
      acq1: { teamCode: "ACQUISITIONS", roleCode: "REP" },
    });

    const out = await resolveValidatedDealAssignments(
      prisma,
      { id: "repD", roleCode: "REP", teamCode: "DISPOSITIONS" },
      "acq1",
      "someone_else",
      null
    );

    expect(out.dispoId).toBe("repD");
    expect(out.acqId).toBe("acq1");
  });

  it("non-REP cannot assign acquisitions user not on ACQUISITIONS team", async () => {
    const prisma = prismaWithUsers({
      tc1: { teamCode: "OPERATIONS", roleCode: "TRANSACTION_COORDINATOR" },
      bad: { teamCode: "DISPOSITIONS", roleCode: "REP" },
    });

    await expect(
      resolveValidatedDealAssignments(prisma, { id: "tc1", roleCode: "TRANSACTION_COORDINATOR" }, "bad", null, null)
    ).rejects.toThrow(INVALID_DEAL_ASSIGNMENT_MESSAGE);
  });
});
