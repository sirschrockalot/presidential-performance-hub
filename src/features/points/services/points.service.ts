import type { PointsLeaderboardEntryDto, PointsMetricsDto } from "@/features/points/server/points.queries";
import type { PointEventRowDto, CreateManualPointAdjustmentInput } from "@/features/points/api/points-client";
import {
  createManualPointAdjustmentApi,
  fetchPointEvents,
  fetchPointsLeaderboard,
  fetchPointsMetrics,
  fetchPointRecipients,
  fetchRepPointsDetail,
} from "@/features/points/api/points-client";

// Client-facing service: UI hooks call these functions.

export type { PointEventRowDto, CreateManualPointAdjustmentInput };
export type { PointsLeaderboardEntryDto, PointsMetricsDto };

export async function getPointsMetricsApi(): Promise<PointsMetricsDto> {
  return fetchPointsMetrics();
}

export async function getLeaderboardApi(): Promise<PointsLeaderboardEntryDto[]> {
  return fetchPointsLeaderboard();
}

export async function fetchPointEventsApi(options?: { repId?: string; year?: number; month?: number }): Promise<PointEventRowDto[]> {
  return fetchPointEvents(options);
}

export async function fetchPointRecipientsApi(): Promise<{ value: string; label: string }[]> {
  return fetchPointRecipients();
}

export async function createManualPointAdjustment(
  input: CreateManualPointAdjustmentInput
): Promise<{ adjustmentId: string }> {
  return createManualPointAdjustmentApi(input);
}

export async function fetchRepPointsDetailApi(
  repId: string,
  options?: { year?: number; month?: number }
) {
  return fetchRepPointsDetail(repId, options);
}
