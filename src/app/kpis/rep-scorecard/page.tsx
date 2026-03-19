"use client";

import { Suspense } from "react";
import KpiRepScorecardPage from "@/features/kpis/components/KpiRepScorecardPage";
import { LoadingState } from "@/components/shared/LoadingState";

export default function RepScorecardPage() {
  return (
    <Suspense fallback={<LoadingState variant="page" />}>
      <KpiRepScorecardPage />
    </Suspense>
  );
}
