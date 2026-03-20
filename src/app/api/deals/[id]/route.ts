import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { roleHasPermission } from "@/lib/auth/permissions";
import { updateDealSchema } from "@/features/deals/schemas/deal.schemas";
import { getDealById, updateDeal } from "@/features/deals/server/deals.service";
import { CACHE_TAGS, revalidateDealReads } from "@/lib/cache/revalidation";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const deal = await unstable_cache(
    () => getDealById(prisma, actor, id),
    ["deals:detail", actor.id, actor.roleCode, id],
    { tags: [CACHE_TAGS.dealDetail], revalidate: 120 }
  )();
  if (!deal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ deal });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!roleHasPermission(actor.roleCode, "deal:edit")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const deal = await updateDeal(prisma, actor, id, parsed.data);
  if (!deal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidateDealReads();
  return NextResponse.json({ deal });
}
