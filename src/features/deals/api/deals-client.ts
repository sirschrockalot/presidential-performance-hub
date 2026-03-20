import type { DealStatus } from "@/types";
import type { CreateDealInput, UpdateDealInput, UpdateDealStatusInput } from "@/features/deals/schemas/deal.schemas";
import type { DealBulkImportInput } from "@/features/deals/schemas/deal-bulk-import.schemas";
import type {
  AssignmentUserDto,
  DealDetailDto,
  DealListRow,
  DealMetricsDto,
} from "@/features/deals/server/deals.service";
import type { BulkImportDealsResult } from "@/features/deals/server/deal-bulk-import.service";

export type { DealDetailDto, DealListRow, DealMetricsDto, AssignmentUserDto };

export type DealListFilters = {
  search?: string;
  status?: DealStatus | "all";
  sortBy?: "propertyAddress" | "contractDate" | "status" | "contractPrice" | "updatedAt";
  sortOrder?: "asc" | "desc";
  limit?: number;
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(text || res.statusText);
  }
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error ?? res.statusText);
  }
  return data as T;
}

function buildListQuery(f?: DealListFilters): string {
  const sp = new URLSearchParams();
  if (f?.search) sp.set("search", f.search);
  if (f?.status && f.status !== "all") sp.set("status", f.status);
  if (f?.sortBy) sp.set("sortBy", f.sortBy);
  if (f?.sortOrder) sp.set("sortOrder", f.sortOrder);
  if (f?.limit != null) sp.set("limit", String(f.limit));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function fetchDealsList(filters?: DealListFilters): Promise<DealListRow[]> {
  const res = await fetch(`/api/deals${buildListQuery(filters)}`, { credentials: "include" });
  const data = await parseJson<{ deals: DealListRow[] }>(res);
  return data.deals;
}

export async function fetchDealDetail(id: string): Promise<DealDetailDto | null> {
  const res = await fetch(`/api/deals/${encodeURIComponent(id)}`, { credentials: "include" });
  if (res.status === 404) return null;
  const data = await parseJson<{ deal: DealDetailDto }>(res);
  return data.deal;
}

export async function fetchDealMetrics(): Promise<DealMetricsDto> {
  const res = await fetch("/api/deals/metrics", { credentials: "include" });
  const data = await parseJson<{ metrics: DealMetricsDto }>(res);
  return data.metrics;
}

export async function fetchDealFormUsers(): Promise<AssignmentUserDto[]> {
  const res = await fetch("/api/deals/form-users", { credentials: "include" });
  const data = await parseJson<{ users: AssignmentUserDto[] }>(res);
  return data.users;
}

export async function createDealApi(input: CreateDealInput): Promise<DealDetailDto> {
  const res = await fetch("/api/deals", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ deal: DealDetailDto }>(res);
  return data.deal;
}

export async function updateDealApi(id: string, input: UpdateDealInput): Promise<DealDetailDto> {
  const res = await fetch(`/api/deals/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ deal: DealDetailDto }>(res);
  return data.deal;
}

export async function updateDealStatusApi(id: string, input: UpdateDealStatusInput): Promise<DealDetailDto> {
  const res = await fetch(`/api/deals/${encodeURIComponent(id)}/status`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ deal: DealDetailDto }>(res);
  return data.deal;
}

export async function addDealNoteApi(id: string, body: string): Promise<DealDetailDto> {
  const res = await fetch(`/api/deals/${encodeURIComponent(id)}/notes`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body }),
  });
  const data = await parseJson<{ deal: DealDetailDto }>(res);
  return data.deal;
}

export async function bulkImportDealsApi(payload: DealBulkImportInput): Promise<BulkImportDealsResult> {
  const res = await fetch("/api/deals/bulk-import", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await parseJson<{ result: BulkImportDealsResult }>(res);
  return data.result;
}
