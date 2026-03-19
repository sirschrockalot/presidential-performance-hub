import type { Metadata } from "next";

import { auth } from "@/auth";
import { AppProviders } from "@/components/providers/AppProviders";
import { AppShell } from "@/components/layout/AppShell";

import "@/index.css";

export const metadata: Metadata = {
  title: "Presidential Digs Performance Hub",
  description: "Wholesale real estate operations dashboard for deal tracking, KPI management, and profit sharing.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <AppProviders session={session}>
          <AppShell>{children}</AppShell>
        </AppProviders>
      </body>
    </html>
  );
}
