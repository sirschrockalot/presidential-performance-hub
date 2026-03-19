import type { DefaultSession } from "next-auth";
import type { UserRoleCode, TeamCode } from "@prisma/client";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roleCode: UserRoleCode;
      teamCode: TeamCode;
      /** Legacy mock-data user id (e.g. u5) for scoped fixtures */
      mockScopeId: string;
    } & DefaultSession["user"];
  }

  interface User {
    roleCode?: UserRoleCode;
    teamCode?: TeamCode;
    mockScopeId?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    roleCode?: UserRoleCode;
    teamCode?: TeamCode;
    mockScopeId?: string;
  }
}
