import type {
  CommissionWindow,
  PotentialRepSummary,
  RepWindowSummary,
} from "@/features/commissions/types";

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const maybe = data as { error?: unknown } | null;
    const err = maybe?.error;
    throw new Error(typeof err === "string" ? err : res.statusText);
  }
  return data as T;
}

export async function fetchCommissionsData(windowId?: string): Promise<{
  windows: CommissionWindow[];
  summaries: RepWindowSummary[];
  potentialSummaries: PotentialRepSummary[];
  selectedWindowId: string;
}> {
  const sp = new URLSearchParams();
  if (windowId) sp.set("windowId", windowId);
  const q = sp.toString();
  const res = await fetch(`/api/commissions${q ? `?${q}` : ""}`, { credentials: "include" });
  return parseJson(res);
}
