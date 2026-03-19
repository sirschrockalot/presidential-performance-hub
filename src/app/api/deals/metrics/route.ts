import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { getDealMetrics } from "@/features/deals/server/deals.service";

export async function GET() {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const metrics = await getDealMetrics(prisma, actor);
  return NextResponse.json({ metrics });
}
