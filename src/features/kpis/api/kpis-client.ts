import type { Team } from "@/types";

import type {
  KpiEntryWithRepDto,
  KpiHistoryRowDto,
  KpiTargetsByMetricKey,
  KpiTrendPointDto,
  KpiWeekSummaryDto,
} from "@/features/kpis/server/kpis.service";

export type { KpiEntryWithRepDto, KpiWeekSummaryDto, KpiTrendPointDto, KpiTargetsByMetricKey, KpiHistoryRowDto } from "@/features/kpis/server/kpis.service";

import type { UpsertKpiEntryInput } from "@/features/kpis/server/kpis.service";

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

function buildQuery(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null) sp.set(k, v);
  }
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export async function fetchKpiEntries(team: Team, weekStarting: string | undefined): Promise<KpiEntryWithRepDto[]> {
  const qs = buildQuery({ team, weekStarting });
  const res = await fetch(`/api/kpis/entries${qs}`, { credentials: "include" });
  const data = await parseJson<{ entries: KpiEntryWithRepDto[] }>(res);
  return data.entries;
}

export async function getAvailableWeeks(team: Team): Promise<string[]> {
  const res = await fetch(`/api/kpis/weeks${buildQuery({ team })}`, { credentials: "include" });
  const data = await parseJson<{ weeks: string[] }>(res);
  return data.weeks;
}

export async function fetchKpiTrend(team: Team): Promise<{ points: KpiTrendPointDto[]; targets: KpiTargetsByMetricKey }> {
  const res = await fetch(`/api/kpis/trend${buildQuery({ team })}`, { credentials: "include" });
  const data = await parseJson<{ trend: { points: KpiTrendPointDto[]; targets: KpiTargetsByMetricKey } }>(res);
  return data.trend;
}

export async function fetchKpiWeekSummary(team: Team, weekStarting: string): Promise<KpiWeekSummaryDto> {
  const res = await fetch(`/api/kpis/summary${buildQuery({ team, weekStarting })}`, { credentials: "include" });
  const data = await parseJson<{ summary: KpiWeekSummaryDto }>(res);
  return data.summary;
}

export async function fetchKpiTargets(team: Team): Promise<KpiTargetsByMetricKey> {
  const res = await fetch(`/api/kpis/targets${buildQuery({ team })}`, { credentials: "include" });
  const data = await parseJson<{ targets: KpiTargetsByMetricKey }>(res);
  return data.targets;
}

export async function fetchKpiHistory(team: Team, repUserId?: string): Promise<KpiHistoryRowDto[]> {
  const qs = buildQuery({ team, repUserId });
  const res = await fetch(`/api/kpis/history${qs}`, { credentials: "include" });
  const data = await parseJson<{ history: KpiHistoryRowDto[] }>(res);
  return data.history;
}

export async function fetchKpiFormUsers(team: Team): Promise<{ id: string; name: string }[]> {
  const res = await fetch(`/api/kpis/form-users${buildQuery({ team })}`, { credentials: "include" });
  const data = await parseJson<{ users: { id: string; name: string }[] }>(res);
  return data.users;
}

export async function upsertKpiEntryApi(input: UpsertKpiEntryInput): Promise<{ entry: KpiEntryWithRepDto }> {
  const res = await fetch(`/api/kpis/entry`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const data = await parseJson<{ entry: KpiEntryWithRepDto }>(res);
  return data;
}

