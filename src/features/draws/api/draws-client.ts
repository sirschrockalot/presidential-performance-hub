import type { DrawStatus } from "@/types";
import type {
  CreateDrawInput,
  DrawDetailDto,
  DrawRequestDealOptionDto,
  DrawRequestRepOptionDto,
  DrawWithDetailsDto,
  UpdateDrawStatusInput,
} from "@/features/draws/server/draws.service";

export type { DrawWithDetailsDto, DrawDetailDto, DrawRequestDealOptionDto, DrawRequestRepOptionDto };
export type { CreateDrawInput, UpdateDrawStatusInput };

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

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

export async function fetchDrawsList(status?: DrawStatus | "partially_recouped" | "all") {
  const qs = buildQuery({ status: status && status !== "all" ? status : undefined });
  const res = await fetch(`/api/draws${qs}`, { credentials: "include" });
  const data = await parseJson<{ draws: DrawWithDetailsDto[] }>(res);
  return data.draws;
}

export async function fetchDrawMetrics() {
  const res = await fetch(`/api/draws/metrics`, { credentials: "include" });
  const data = await parseJson<{ metrics: { outstanding: number; pendingCount: number; totalRecouped: number; ineligibleCount: number } }>(res);
  return data.metrics;
}

export async function fetchDrawDetail(id: string) {
  const res = await fetch(`/api/draws/${encodeURIComponent(id)}`, { credentials: "include" });
  if (res.status === 404) return null;
  const data = await parseJson<{ draw: DrawDetailDto }>(res);
  return data.draw;
}

export async function createDrawRequestApi(input: CreateDrawInput) {
  const res = await fetch(`/api/draws`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ draw: DrawDetailDto }>(res);
  return data.draw;
}

export async function updateDrawStatusApi(id: string, input: UpdateDrawStatusInput) {
  const res = await fetch(`/api/draws/${encodeURIComponent(id)}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ draw: DrawDetailDto }>(res);
  return data.draw;
}

export async function fetchDrawFormReps(team?: "acquisitions" | "dispositions") {
  const qs = buildQuery({ team });
  const res = await fetch(`/api/draws/form-reps${qs}`, { credentials: "include" });
  const data = await parseJson<{ reps: DrawRequestRepOptionDto[] }>(res);
  return data.reps;
}

export async function fetchDrawFormDeals(repId: string) {
  const qs = buildQuery({ repId });
  const res = await fetch(`/api/draws/form-deals${qs}`, { credentials: "include" });
  const data = await parseJson<{ deals: DrawRequestDealOptionDto[] }>(res);
  return data.deals;
}

export async function fetchRepDrawHistoryApi(repId?: string) {
  const qs = buildQuery({ repId });
  const res = await fetch(`/api/draws/rep-history${qs}`, { credentials: "include" });
  const data = await parseJson<{ history: DrawWithDetailsDto[] }>(res);
  return data.history;
}

