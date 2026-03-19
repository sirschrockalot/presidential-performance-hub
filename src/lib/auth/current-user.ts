import { auth } from "@/auth";
import type { Session } from "next-auth";

/**
 * Server-only: resolved user from JWT session (no extra DB round-trip).
 * Use in Server Components, Route Handlers, and Server Actions.
 */
export async function getCurrentUser(): Promise<NonNullable<Session["user"]> & { id: string } | null> {
  const session = await auth();
  const u = session?.user;
  if (!u?.id) return null;
  return u as NonNullable<Session["user"]> & { id: string };
}

export async function requireCurrentUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Unauthorized");
  }
  return user;
}
