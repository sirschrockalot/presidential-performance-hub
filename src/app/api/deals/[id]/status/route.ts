import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardApiSessionUserWithPermission } from "@/lib/auth/api-route-guard";
import { updateDealStatusSchema } from "@/features/deals/schemas/deal.schemas";
import { updateDealStatus } from "@/features/deals/server/deals.service";
import { revalidateDealReads } from "@/lib/cache/revalidation";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await guardApiSessionUserWithPermission("deal:edit");
  if (auth.ok === false) return auth.response;
  const actor = auth.user;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateDealStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const deal = await updateDealStatus(prisma, actor, id, parsed.data);
  if (!deal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidateDealReads();
  return NextResponse.json({ deal });
}
