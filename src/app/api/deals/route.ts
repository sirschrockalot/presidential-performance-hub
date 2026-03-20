import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";

import { prisma } from "@/lib/db/prisma";
import {
  guardApiSessionUser,
  guardApiSessionUserWithPermission,
} from "@/lib/auth/api-route-guard";
import { createDealSchema, listDealsQuerySchema } from "@/features/deals/schemas/deal.schemas";
import { createDeal, listDeals } from "@/features/deals/server/deals.service";
import { CACHE_TAGS, revalidateDealReads } from "@/lib/cache/revalidation";
import { INVALID_DEAL_ASSIGNMENT_MESSAGE } from "@/features/deals/server/deal-assignment-invariants";

export async function GET(req: Request) {
  const auth = await guardApiSessionUser();
  if (auth.ok === false) return auth.response;
  const actor = auth.user;

  const { searchParams } = new URL(req.url);
  const raw = {
    search: searchParams.get("search") || undefined,
    status: searchParams.get("status") || undefined,
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: searchParams.get("sortOrder") || undefined,
    limit: searchParams.get("limit") || undefined,
  };
  const parsed = listDealsQuerySchema.safeParse(raw);
  const query = parsed.success
    ? parsed.data
    : listDealsQuerySchema.parse({
        search: raw.search,
        status: "all",
        sortBy: "updatedAt",
        sortOrder: "desc",
      });

  const deals = await unstable_cache(
    () => listDeals(prisma, actor, query),
    ["deals:list", actor.id, actor.roleCode, JSON.stringify(query)],
    { tags: [CACHE_TAGS.deals], revalidate: 120 }
  )();
  return NextResponse.json({ deals });
}

export async function POST(req: Request) {
  const auth = await guardApiSessionUserWithPermission("deal:create");
  if (auth.ok === false) return auth.response;
  const actor = auth.user;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const deal = await createDeal(prisma, actor, parsed.data);
    revalidateDealReads();
    return NextResponse.json({ deal });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === INVALID_DEAL_ASSIGNMENT_MESSAGE) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
