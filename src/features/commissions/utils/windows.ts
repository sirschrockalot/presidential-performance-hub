import type { CommissionWindow } from "../types";

const WINDOW_DAYS = 45;
const YEAR_START = "2026-01-01";
const YEAR_END = "2026-12-31";

/**
 * Generate all 45-day rolling windows for the 2026 calendar year.
 * Windows are consecutive: Jan 1–Feb 14, Feb 15–Mar 31, Apr 1–May 15, …
 */
export function generate2026Windows(): CommissionWindow[] {
  const windows: CommissionWindow[] = [];
  const yearEnd = new Date(YEAR_END + "T23:59:59Z");
  let start = new Date(YEAR_START + "T00:00:00Z");
  let num = 1;
  const now = new Date();

  while (start <= yearEnd) {
    const endMs = start.getTime() + (WINDOW_DAYS - 1) * 86_400_000;
    const end = new Date(Math.min(endMs, yearEnd.getTime()));

    const isCurrent = now >= start && now <= end;

    windows.push({
      id: `w${num}`,
      windowNumber: num,
      startDate: start.toISOString().slice(0, 10),
      endDate: end.toISOString().slice(0, 10),
      isCurrent,
    });

    // next window starts day after end
    start = new Date(end.getTime() + 86_400_000);
    num++;
  }

  return windows;
}

export function formatWindowLabel(w: CommissionWindow): string {
  const s = new Date(w.startDate + "T00:00:00Z");
  const e = new Date(w.endDate + "T00:00:00Z");
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return `${fmt(s)} – ${fmt(e)}`;
}
