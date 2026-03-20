import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import { guardApiSessionUser, guardApiSessionUserWithPermission } from "@/lib/auth/api-route-guard";
import { updateDealSchema } from "@/features/deals/schemas/deal.schemas";
import { getDealById, updateDeal } from "@/features/deals/server/deals.service";
import { CACHE_TAGS, revalidateDealReads } from "@/lib/cache/revalidation";
import { INVALID_DEAL_ASSIGNMENT_MESSAGE } from "@/features/deals/server/deal-assignment-invariants";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await guardApiSessionUser();
  if (auth.ok === false) return auth.response;
  const actor = auth.user;

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

  const parsed = updateDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  let deal;
  try {
    deal = await updateDeal(prisma, actor, id, parsed.data);
  } catch (e) {
    if (e instanceof Error && e.message === INVALID_DEAL_ASSIGNMENT_MESSAGE) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    throw e;
  }
  if (!deal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidateDealReads();
  return NextResponse.json({ deal });
}
