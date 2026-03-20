import { NextResponse } from "next/server";

import { guardSessionActor } from "@/lib/auth/api-route-guard";
import { getCurrentUser } from "@/lib/auth/current-user";

/** Example protected JSON API using the same session as the UI. */
export async function GET() {
  const auth = await guardSessionActor();
  if (auth.ok === false) return auth.response;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleCode: user.roleCode,
      teamCode: user.teamCode,
      mockScopeId: user.mockScopeId,
    },
  });
}
