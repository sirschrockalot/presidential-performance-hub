import type { PointsLeaderboardEntryDto, PointsMetricsDto } from "@/features/points/server/points.queries";

export type PointEventRowDto = {
  id: string;
  userId: string;
  userName: string;
  teamCode: string;
  roleCode: string;
  dealId: string | null;
  dealAddress: string | null;
  points: number;
  reason: string;
  kind: string;
  isManualAdjustment: boolean;
  createdAt: string;
};

export async function fetchPointsMetrics(): Promise<PointsMetricsDto> {
  const res = await fetch("/api/points/metrics", { method: "GET" });
  if (!res.ok) throw new Error("Failed to load points metrics");
  const json = (await res.json()) as { metrics: PointsMetricsDto };
  return json.metrics;
}

export async function fetchPointsLeaderboard(): Promise<PointsLeaderboardEntryDto[]> {
  const res = await fetch("/api/points/leaderboard", { method: "GET" });
  if (!res.ok) throw new Error("Failed to load points leaderboard");
  const json = (await res.json()) as { leaderboard: PointsLeaderboardEntryDto[] };
  return json.leaderboard;
}

export async function fetchPointEvents(options?: {
  repId?: string;
  year?: number;
  month?: number;
}): Promise<PointEventRowDto[]> {
  const params = new URLSearchParams();
  if (options?.repId) params.set("repId", options.repId);
  if (options?.year) params.set("year", String(options.year));
  if (options?.month) params.set("month", String(options.month));

  const qs = params.toString();
  const res = await fetch(`/api/points/events${qs ? `?${qs}` : ""}`, { method: "GET" });
  if (!res.ok) throw new Error("Failed to load point events");
  const json = (await res.json()) as { events: PointEventRowDto[] };
  return json.events;
}

export async function fetchPointRecipients(): Promise<{ value: string; label: string }[]> {
  const res = await fetch("/api/points/recipients", { method: "GET" });
  if (!res.ok) throw new Error("Failed to load point recipients");
  const json = (await res.json()) as { recipients: { value: string; label: string }[] };
  return json.recipients;
}

export type CreateManualPointAdjustmentInput = {
  recipientUserId: string;
  points: number;
  reason: string;
  dealId?: string | null;
};

export async function createManualPointAdjustmentApi(input: CreateManualPointAdjustmentInput): Promise<{ adjustmentId: string }> {
  const res = await fetch("/api/points/adjustments", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = json?.error ?? "Failed to create points adjustment";
    throw new Error(msg);
  }
  return json as { adjustmentId: string };
}

export async function fetchRepPointsDetail(repId: string, options?: { year?: number; month?: number }) {
  const params = new URLSearchParams();
  if (options?.year) params.set("year", String(options.year));
  if (options?.month) params.set("month", String(options.month));

  const qs = params.toString();
  const res = await fetch(`/api/points/reps/${repId}${qs ? `?${qs}` : ""}`, { method: "GET" });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Failed to load rep points");
  return json as { summary: { repId: string; points: number; manualAdjustments: number; fundedDealEventCount: number }; events: PointEventRowDto[] };
}

