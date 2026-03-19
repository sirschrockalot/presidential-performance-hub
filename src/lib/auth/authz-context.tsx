"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Session } from "next-auth";
import type { UserRoleCode } from "@prisma/client";

import { dataScopeFromSession, type DataScope } from "@/lib/auth/data-scope";
import { type Permission, roleHasPermission } from "@/lib/auth/permissions";

type AuthzContextValue = {
  status: "loading" | "authenticated" | "unauthenticated";
  user: Session["user"] | null;
  roleCode: UserRoleCode | undefined;
  dataScope: DataScope;
  can: (permission: Permission) => boolean;
};

const AuthzContext = createContext<AuthzContextValue | null>(null);

export function AuthzProvider({
  children,
  session,
  status,
}: {
  children: ReactNode;
  session: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
}) {
  const user = session?.user ?? null;
  const roleCode = user?.roleCode;
  const mockScopeId = user?.mockScopeId;

  const dataScope = useMemo(
    () => dataScopeFromSession(roleCode, mockScopeId),
    [roleCode, mockScopeId]
  );

  const value = useMemo<AuthzContextValue>(() => {
    return {
      status,
      user,
      roleCode,
      dataScope,
      can: (permission: Permission) => roleHasPermission(roleCode, permission),
    };
  }, [status, user, roleCode, dataScope]);

  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>;
}

export function useAuthz(): AuthzContextValue {
  const ctx = useContext(AuthzContext);
  if (!ctx) {
    throw new Error("useAuthz must be used within AuthzProvider");
  }
  return ctx;
}
