import type { TeamCode, UserRoleCode } from "@prisma/client";

import { auth } from "@/auth";

export type ApiSessionUser = {
  id: string;
  roleCode: UserRoleCode;
  teamCode?: TeamCode;
};

export async function getApiSessionUser(): Promise<ApiSessionUser | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id || !u.roleCode) return null;
  return { id: u.id, roleCode: u.roleCode, teamCode: u.teamCode };
}
