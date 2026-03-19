import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import { reportsFiltersSchema } from "@/features/reports/schemas";
import { listReportsData } from "@/features/reports/server/reports.queries";

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!roleHasPermission(user.roleCode, "nav:reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);

  const parsed = reportsFiltersSchema.safeParse({
    datePreset: searchParams.get("datePreset") ?? undefined,
    repId: searchParams.get("repId") ?? undefined,
    team: searchParams.get("team") ?? undefined,
    dealStatus: searchParams.get("dealStatus") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const actor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode } as const;

  const data = await listReportsData(prisma, actor as any, {
    ...parsed.data,
    dealStatus: parsed.data.dealStatus ?? "CLOSED_FUNDED",
  });
  return NextResponse.json({ data });
}

