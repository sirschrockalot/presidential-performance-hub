import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { getApiSessionUser } from "@/lib/auth/require-api-user";
import { addDealNoteSchema } from "@/features/deals/schemas/deal.schemas";
import { addDealNote } from "@/features/deals/server/deals.service";
import { revalidateDealReads } from "@/lib/cache/revalidation";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(req: Request, { params }: RouteParams) {
  const actor = await getApiSessionUser();
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = addDealNoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const deal = await addDealNote(prisma, actor, id, parsed.data.body);
  if (!deal) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  revalidateDealReads();
  return NextResponse.json({ deal });
}
