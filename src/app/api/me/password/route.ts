import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { guardSessionActor } from "@/lib/auth/api-route-guard";
import { changeOwnPassword } from "@/features/auth/server/password.service";
import { passwordMutationHttpStatus } from "@/features/auth/server/password-http";
import { changeOwnPasswordSchema } from "@/features/auth/schemas/password.schema";

export async function POST(req: Request) {
  const auth = await guardSessionActor();
  if (auth.ok === false) return auth.response;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = changeOwnPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;

  try {
    await changeOwnPassword(prisma, auth.user.id, currentPassword, newPassword);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to update password";
    return NextResponse.json({ error: msg }, { status: passwordMutationHttpStatus(msg) });
  }
}
