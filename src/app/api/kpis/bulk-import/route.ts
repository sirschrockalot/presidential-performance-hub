import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/current-user";
import { roleHasPermission } from "@/lib/auth/permissions";

import { kpiBulkImportSchema } from "@/features/kpis/schemas/kpi-bulk-import.schemas";
import { bulkImportKpis } from "@/features/kpis/server/kpi-bulk-import.service";
import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { revalidateKpiReads } from "@/lib/cache/revalidation";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user?.roleCode || !user?.teamCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!roleHasPermission(user.roleCode, "kpi:new_entry")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = kpiBulkImportSchema.safeParse(body);
  if (!parsed.success) {
    const firstMessages = parsed.error.issues.map((i) => i.message).slice(0, 5).join("; ");
    return NextResponse.json(
      {
        error: `Validation failed: ${firstMessages}`,
        details: parsed.error.flatten(),
      },
      { status: 400 }
    );
  }

  const actor: KpiActor = { id: user.id, roleCode: user.roleCode, teamCode: user.teamCode };

  try {
    const result = await bulkImportKpis(prisma, actor, parsed.data);
    revalidateKpiReads();
    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to import KPI data";
    if (msg.toLowerCase().includes("forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

