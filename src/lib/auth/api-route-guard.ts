/**
 * API route guard rails — use these instead of calling `getCurrentUser` / `getApiSessionUser` directly.
 *
 * Intended handler shape: **authenticate** (guard*) → **authorize** (*WithPermission / require*Or403) → **validate** (Zod) → **execute** (service).
 */
import { NextResponse } from "next/server";
import type { TeamCode, UserRoleCode } from "@prisma/client";

import { getCurrentUser } from "@/lib/auth/current-user";
import { getApiSessionUser, type ApiSessionUser } from "@/lib/auth/require-api-user";
import { roleHasPermission, type Permission } from "@/lib/auth/permissions";

/** Session shape shared by route guards (matches JWT session + DB-backed role). */
export type SessionActor = {
  id: string;
  roleCode: UserRoleCode;
  teamCode?: TeamCode;
};

export type ApiGuardOk<T> = { ok: true; user: T };
export type ApiGuardFail = { ok: false; response: NextResponse };
export type ApiGuardResult<T> = ApiGuardOk<T> | ApiGuardFail;

export function jsonUnauthorized(message = "Unauthorized"): NextResponse {
  return NextResponse.json({ error: message }, { status: 401 });
}

export function jsonForbidden(message = "Forbidden"): NextResponse {
  return NextResponse.json({ error: message }, { status: 403 });
}

export function jsonBadRequest(message: string): NextResponse {
  return NextResponse.json({ error: message }, { status: 400 });
}

/**
 * Prefer this for `/api/*` handlers that already use `getApiSessionUser` — requires `roleCode` on session.
 */
export async function guardApiSessionUser(): Promise<ApiGuardResult<ApiSessionUser>> {
  const user = await getApiSessionUser();
  if (!user) return { ok: false, response: jsonUnauthorized() };
  return { ok: true, user };
}

/**
 * Prefer this for routes using `getCurrentUser` — requires `id` + `roleCode`.
 */
export async function guardSessionActor(): Promise<ApiGuardResult<SessionActor>> {
  const u = await getCurrentUser();
  if (!u?.id || !u.roleCode) return { ok: false, response: jsonUnauthorized() };
  return {
    ok: true,
    user: { id: u.id, roleCode: u.roleCode, teamCode: u.teamCode },
  };
}

/** Returns a 403 response if the role lacks the permission, else `null`. */
export function requirePermissionOr403(roleCode: UserRoleCode, permission: Permission): NextResponse | null {
  if (!roleHasPermission(roleCode, permission)) {
    return jsonForbidden();
  }
  return null;
}

/**
 * Combine permission check with an authenticated session actor.
 * Example: `const g = await guardSessionActorWithPermission("deal:create"); if (!g.ok) return g.response;`
 */
export async function guardSessionActorWithPermission(
  permission: Permission
): Promise<ApiGuardResult<SessionActor>> {
  const auth = await guardSessionActor();
  if (auth.ok === false) return auth;
  const denied = requirePermissionOr403(auth.user.roleCode, permission);
  if (denied) return { ok: false, response: denied };
  return auth;
}

export async function guardApiSessionUserWithPermission(
  permission: Permission
): Promise<ApiGuardResult<ApiSessionUser>> {
  const auth = await guardApiSessionUser();
  if (auth.ok === false) return auth;
  const denied = requirePermissionOr403(auth.user.roleCode, permission);
  if (denied) return { ok: false, response: denied };
  return auth;
}

/** Returns 403 unless the role has at least one of the given permissions. */
export function requireAnyPermissionOr403(
  roleCode: UserRoleCode,
  permissions: readonly Permission[]
): NextResponse | null {
  const allowed = permissions.some((p) => roleHasPermission(roleCode, p));
  if (!allowed) return jsonForbidden();
  return null;
}

export async function guardApiSessionUserWithAnyPermission(
  permissions: readonly Permission[]
): Promise<ApiGuardResult<ApiSessionUser>> {
  const auth = await guardApiSessionUser();
  if (auth.ok === false) return auth;
  const denied = requireAnyPermissionOr403(auth.user.roleCode, permissions);
  if (denied) return { ok: false, response: denied };
  return auth;
}

/** Session actor with guaranteed `teamCode` (required for team/points routes that scope by team). */
export type SessionActorWithTeam = SessionActor & { teamCode: TeamCode };

export async function guardSessionActorWithTeam(): Promise<ApiGuardResult<SessionActorWithTeam>> {
  const auth = await guardSessionActor();
  if (auth.ok === false) return { ok: false, response: auth.response };
  if (!auth.user.teamCode) return { ok: false, response: jsonUnauthorized() };
  return { ok: true, user: { ...auth.user, teamCode: auth.user.teamCode } };
}

export async function guardSessionActorWithTeamAndPermission(
  permission: Permission
): Promise<ApiGuardResult<SessionActorWithTeam>> {
  const auth = await guardSessionActorWithTeam();
  if (auth.ok === false) return auth;
  const denied = requirePermissionOr403(auth.user.roleCode, permission);
  if (denied) return { ok: false, response: denied };
  return auth;
}
