import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";

import { canActorViewRepPointsSummary, type PointsActor } from "@/features/points/server/points.queries";

const baseActor = (over: Partial<PointsActor>): PointsActor => ({
  id: "a1",
  roleCode: "REP",
  teamCode: "ACQUISITIONS",
  ...over,
});

describe("canActorViewRepPointsSummary", () => {
  it("REP may only view self", async () => {
    const prisma = {} as PrismaClient;
    await expect(canActorViewRepPointsSummary(prisma, baseActor({ id: "r1" }), "r1")).resolves.toBe(true);
    await expect(canActorViewRepPointsSummary(prisma, baseActor({ id: "r1" }), "r2")).resolves.toBe(false);
  });

  it("ADMIN may view any repId without DB lookup", async () => {
    const prisma = {} as PrismaClient;
    await expect(canActorViewRepPointsSummary(prisma, baseActor({ roleCode: "ADMIN" }), "anyone")).resolves.toBe(true);
  });

  it("ACQUISITIONS_MANAGER cannot view dispositions team rep", async () => {
    const findUnique = vi.fn().mockResolvedValue({ team: { code: "DISPOSITIONS" } });
    const prisma = { user: { findUnique } } as unknown as PrismaClient;

    await expect(
      canActorViewRepPointsSummary(prisma, baseActor({ roleCode: "ACQUISITIONS_MANAGER" }), "x")
    ).resolves.toBe(false);
  });

  it("ACQUISITIONS_MANAGER can view acquisitions team rep", async () => {
    const findUnique = vi.fn().mockResolvedValue({ team: { code: "ACQUISITIONS" } });
    const prisma = { user: { findUnique } } as unknown as PrismaClient;

    await expect(
      canActorViewRepPointsSummary(prisma, baseActor({ roleCode: "ACQUISITIONS_MANAGER" }), "x")
    ).resolves.toBe(true);
  });

  it("TC may view rep linked on coordinated deal", async () => {
    const findUnique = vi.fn().mockResolvedValue({ team: { code: "ACQUISITIONS" } });
    const findFirst = vi.fn().mockResolvedValue({ id: "d1" });
    const prisma = { user: { findUnique }, deal: { findFirst } } as unknown as PrismaClient;

    await expect(
      canActorViewRepPointsSummary(prisma, baseActor({ id: "tc1", roleCode: "TRANSACTION_COORDINATOR" }), "repX")
    ).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalled();
  });
});
