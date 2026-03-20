import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { roleHasPermission } from "@/lib/auth/permissions";
import { dealBulkImportSchema } from "@/features/deals/schemas/deal-bulk-import.schemas";
import { bulkImportDeals } from "@/features/deals/server/deal-bulk-import.service";
import { revalidateDealReads } from "@/lib/cache/revalidation";

export async function POST(req: Request) {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roleHasPermission(actor.roleCode, "deal:create")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = dealBulkImportSchema.safeParse(body);
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

  try {
    const result = await bulkImportDeals(prisma, actor, parsed.data);
    revalidateDealReads();
    return NextResponse.json({ result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to import deals";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
