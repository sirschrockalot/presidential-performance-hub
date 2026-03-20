import { describe, it, expect } from "vitest";

import { assertCreatableTeamMemberRole, CREATABLE_TEAM_MEMBER_ROLES_FOR_NON_ADMIN } from "./team-role-invariants";

describe("assertCreatableTeamMemberRole", () => {
  it("allows admin to request any role code path (caller still validates role exists in DB)", () => {
    expect(() => assertCreatableTeamMemberRole("ADMIN", "ACQUISITIONS_MANAGER")).not.toThrow();
    expect(() => assertCreatableTeamMemberRole("ADMIN", "ADMIN")).not.toThrow();
  });

  it("blocks non-admin from creating ADMIN", () => {
    expect(() => assertCreatableTeamMemberRole("ACQUISITIONS_MANAGER", "ADMIN")).toThrow("Forbidden");
  });

  it("blocks non-admin from privileged roles outside the creatable set", () => {
    expect(() => assertCreatableTeamMemberRole("ACQUISITIONS_MANAGER", "ACQUISITIONS_MANAGER")).toThrow("Forbidden");
    expect(() => assertCreatableTeamMemberRole("DISPOSITIONS_MANAGER", "DISPOSITIONS_MANAGER")).toThrow("Forbidden");
  });

  it("allows non-admin only REP and TRANSACTION_COORDINATOR", () => {
    for (const code of CREATABLE_TEAM_MEMBER_ROLES_FOR_NON_ADMIN) {
      expect(() => assertCreatableTeamMemberRole("ACQUISITIONS_MANAGER", code)).not.toThrow();
    }
  });
});
