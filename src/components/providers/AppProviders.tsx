"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider, useSession } from "next-auth/react";
import type { Session } from "next-auth";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthzProvider } from "@/lib/auth/authz-context";
import { useState, type ReactNode } from "react";

function AuthzBridge({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  return (
    <AuthzProvider session={session ?? null} status={status}>
      {children}
    </AuthzProvider>
  );
}

export function AppProviders({
  children,
  session,
}: {
  children: ReactNode;
  /** Optional server-fetched session for faster hydration */
  session?: Session | null;
}) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider session={session ?? undefined}>
      <AuthzBridge>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            {children}
          </TooltipProvider>
        </QueryClientProvider>
      </AuthzBridge>
    </SessionProvider>
  );
}
