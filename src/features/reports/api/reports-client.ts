import type { ReportsDataDto } from "@/features/reports/server/reports.queries";

export type ReportsFiltersUi = {
  datePreset?: "this-week" | "this-month" | "last-month" | "this-quarter" | "ytd";
  repId?: string | null;
  team?: "acquisitions" | "dispositions" | "operations" | null;
  dealStatus?: "CLOSED_FUNDED" | "ALL";
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const err = data as { error?: string } | null;
    throw new Error(err?.error ?? res.statusText);
  }
  return data as T;
}

export async function fetchReports(filters: ReportsFiltersUi): Promise<ReportsDataDto> {
  const sp = new URLSearchParams();
  if (filters.datePreset) sp.set("datePreset", filters.datePreset);
  if (filters.repId) sp.set("repId", filters.repId);
  if (filters.team && filters.team !== "operations") sp.set("team", filters.team);
  if (filters.dealStatus) sp.set("dealStatus", filters.dealStatus);

  const qs = sp.toString();
  const url = `/api/reports${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { credentials: "include" });
  const json = await parseJson<{ data: ReportsDataDto }>(res);
  return json.data;
}

