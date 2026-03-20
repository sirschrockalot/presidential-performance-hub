import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  listCommissionWindows,
  listPotentialRepSummaries,
  listRepWindowSummaries,
} from "@/features/commissions/server/commissions.service";
import type { DealActor } from "@/features/deals/server/deal-scope";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const windows = listCommissionWindows();
  const { searchParams } = new URL(req.url);
  const windowId = searchParams.get("windowId") ?? windows.find((w) => w.isCurrent)?.id ?? windows[0]?.id;
  if (!windowId) {
    return NextResponse.json({ windows: [], summaries: [] });
  }

  const actor: DealActor = {
    id: user.id,
    roleCode: user.roleCode,
  };
  const [summaries, potentialSummaries] = await Promise.all([
    listRepWindowSummaries(prisma, actor, windowId),
    listPotentialRepSummaries(prisma, actor),
  ]);

  return NextResponse.json({ windows, summaries, potentialSummaries, selectedWindowId: windowId });
}
