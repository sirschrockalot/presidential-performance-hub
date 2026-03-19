import type { DrawStatus } from "@/types";

import {
  createDrawRequestApi,
  fetchDrawFormDeals,
  fetchDrawFormReps,
  fetchDrawDetail,
  fetchDrawMetrics,
  fetchDrawsList,
  fetchRepDrawHistoryApi,
  updateDrawStatusApi,
} from "@/features/draws/api/draws-client";

export type {
  DrawWithDetailsDto as DrawWithDetails,
  DrawDetailDto,
  DrawRequestDealOptionDto,
  DrawRequestRepOptionDto,
  CreateDrawInput,
  UpdateDrawStatusInput,
} from "@/features/draws/server/draws.service";

export async function fetchDraws(statusFilter?: DrawStatus | "all" | "partially_recouped") {
  return fetchDrawsList(statusFilter);
}

export async function getDrawMetrics() {
  return fetchDrawMetrics();
}

export { fetchDrawDetail, createDrawRequestApi, updateDrawStatusApi, fetchDrawFormDeals, fetchDrawFormReps, fetchRepDrawHistoryApi };
