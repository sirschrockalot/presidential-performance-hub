import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { roleHasPermission } from "@/lib/auth/permissions";
import { createDealSchema, listDealsQuerySchema } from "@/features/deals/schemas/deal.schemas";
import { createDeal, listDeals } from "@/features/deals/server/deals.service";

export async function GET(req: Request) {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

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

  const deals = await listDeals(prisma, actor, query);
  return NextResponse.json({ deals });
}

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

  const parsed = createDealSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const deal = await createDeal(prisma, actor, parsed.data);
    return NextResponse.json({ deal });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Failed to create deal" }, { status: 500 });
  }
}
