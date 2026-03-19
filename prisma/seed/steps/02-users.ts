import type { PrismaClient } from "@prisma/client";
import { SEED_IDS } from "../ids.js";

/**
 * Demo accounts — `passwordHash` set from seed entrypoint (bcrypt).
 * Emails align with `src/data/mock-data.ts` for Credentials login.
 */
export async function seedUsers(prisma: PrismaClient, passwordHash: string): Promise<void> {
  const joined = new Date("2024-01-15T12:00:00.000Z");

  await prisma.user.createMany({
    data: [
      {
        id: SEED_IDS.user.ADMIN,
        email: "marcus@presidentialdigs.com",
        name: "Marcus Johnson",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.ADMIN,
        roleId: SEED_IDS.role.ADMIN,
        teamId: SEED_IDS.team.OPERATIONS,
        joinedAt: joined,
      },
      {
        id: SEED_IDS.user.ACQUISITIONS_MANAGER,
        email: "keisha@presidentialdigs.com",
        name: "Keisha Williams",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.ACQUISITIONS_MANAGER,
        roleId: SEED_IDS.role.ACQUISITIONS_MANAGER,
        teamId: SEED_IDS.team.ACQUISITIONS,
        joinedAt: joined,
      },
      {
        id: SEED_IDS.user.DISPOSITIONS_MANAGER,
        email: "derek@presidentialdigs.com",
        name: "Derek Thompson",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.DISPOSITIONS_MANAGER,
        roleId: SEED_IDS.role.DISPOSITIONS_MANAGER,
        teamId: SEED_IDS.team.DISPOSITIONS,
        joinedAt: joined,
      },
      {
        id: SEED_IDS.user.TC,
        email: "jasmine@presidentialdigs.com",
        name: "Jasmine Carter",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.TC,
        roleId: SEED_IDS.role.TRANSACTION_COORDINATOR,
        teamId: SEED_IDS.team.OPERATIONS,
        joinedAt: joined,
      },
      {
        id: SEED_IDS.user.REP_ACQ_JORDAN,
        email: "andre@presidentialdigs.com",
        name: "Andre Davis",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.REP_ACQ_JORDAN,
        roleId: SEED_IDS.role.REP,
        teamId: SEED_IDS.team.ACQUISITIONS,
        joinedAt: joined,
      },
      {
        id: SEED_IDS.user.REP_ACQ_SARAH,
        email: "tanya@presidentialdigs.com",
        name: "Tanya Mitchell",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.REP_ACQ_SARAH,
        roleId: SEED_IDS.role.REP,
        teamId: SEED_IDS.team.ACQUISITIONS,
        joinedAt: joined,
      },
      {
        id: SEED_IDS.user.REP_DISPO_ALEX,
        email: "brandon@presidentialdigs.com",
        name: "Brandon Lewis",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.REP_DISPO_ALEX,
        roleId: SEED_IDS.role.REP,
        teamId: SEED_IDS.team.DISPOSITIONS,
        joinedAt: joined,
      },
      {
        id: SEED_IDS.user.REP_DISPO_CASEY,
        email: "nicole@presidentialdigs.com",
        name: "Nicole Foster",
        active: true,
        passwordHash,
        mockScopeId: SEED_IDS.user.REP_DISPO_CASEY,
        roleId: SEED_IDS.role.REP,
        teamId: SEED_IDS.team.DISPOSITIONS,
        joinedAt: joined,
      },
    ],
  });
}
