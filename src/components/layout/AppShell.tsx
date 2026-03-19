"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { AppLayout } from "@/components/layout/AppLayout";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.startsWith("/login")) {
    return <>{children}</>;
  }
  return <AppLayout>{children}</AppLayout>;
}
