import { reportsDatePresetSchema } from "@/features/reports/schemas";
import { z } from "zod";

export type ReportsDatePreset = z.infer<typeof reportsDatePresetSchema>;

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}

function addUtcMonths(d: Date, delta: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + delta, 1, 0, 0, 0));
}

function startOfWeekUtc(d: Date): Date {
  const day = d.getUTCDay(); // 0 Sun ... 6 Sat
  const diffToMonday = (day + 6) % 7; // Monday => 0
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - diffToMonday, 0, 0, 0));
  return monday;
}

export function resolveReportsDateRange(preset: ReportsDatePreset): { start: Date; end: Date } {
  const now = new Date();
  const curDay = startOfUtcDay(now);

  switch (preset) {
    case "this-week": {
      const start = startOfWeekUtc(curDay);
      const end = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + 7, 0, 0, 0));
      return { start, end };
    }
    case "this-month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      const end = addUtcMonths(start, 1);
      return { start, end };
    }
    case "last-month": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
      return { start, end };
    }
    case "this-quarter": {
      const q = Math.floor(now.getUTCMonth() / 3); // 0..3
      const startMonth = q * 3;
      const start = new Date(Date.UTC(now.getUTCFullYear(), startMonth, 1, 0, 0, 0));
      const end = addUtcMonths(start, 3);
      return { start, end };
    }
    case "ytd": {
      const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1, 0, 0, 0));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
      return { start, end };
    }
    default: {
      // Should be unreachable due to zod enum.
      return { start: curDay, end: curDay };
    }
  }
}

export function weekStartingKeyUtc(d: Date): string {
  const monday = startOfWeekUtc(d);
  return monday.toISOString().slice(0, 10);
}

export function monthKeyUtc(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthShortLabel(key: string): string {
  const [yearStr, monthStr] = key.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr); // 1-12
  const d = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
  return d.toLocaleString("en-US", { month: "short" });
}

