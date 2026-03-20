import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActor } from "@/lib/auth/api-route-guard";
import {
  listCommissionWindows,
  listPotentialRepSummaries,
  listRepWindowSummaries,
} from "@/features/commissions/server/commissions.service";
import type { DealActor } from "@/features/deals/server/deal-scope";

export async function GET(req: Request) {
  const auth = await guardSessionActor();
  if (auth.ok === false) return auth.response;
  const user = auth.user;

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
