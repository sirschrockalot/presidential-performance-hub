"use client";

import { useParams } from "next/navigation";
import RepPointsDetailPage from "@/features/points/components/RepPointsDetailPage";

export default function RepPointsDetailRoute() {
  const params = useParams<{ id: string }>();
  return <RepPointsDetailPage repId={params.id} />;
}

