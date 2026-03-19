import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getDashboardOverview } from "@/features/dashboard/server/dashboard.analytics";

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const overview = await getDashboardOverview(prisma, {
    id: user.id,
    roleCode: user.roleCode,
    teamCode: user.teamCode,
  });

  return NextResponse.json({ overview });
}

