"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Responsive,
  WidthProvider,
  type Layout,
  type ResponsiveLayouts,
} from "react-grid-layout/legacy";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const ResponsiveGridLayout = WidthProvider(Responsive);

const STORAGE_KEY = "pph-dashboard-grid-layout-v1";

export type DashboardSlotKey = "metrics" | "pipeline" | "charts" | "leaderboard" | "activity" | "insights" | "deals";

/** Stable render / layout order for dashboard widgets */
export const DASHBOARD_SLOT_KEYS: DashboardSlotKey[] = [
  "metrics",
  "pipeline",
  "charts",
  "leaderboard",
  "activity",
  "insights",
  "deals",
];

const WIDGET_LABELS: Record<DashboardSlotKey, string> = {
  metrics: "Headline metrics",
  pipeline: "Pipeline & potential",
  charts: "Trends & pipeline charts",
  leaderboard: "Leaderboard & KPI ranks",
  activity: "Recent activity",
  insights: "Points & KPI snapshot",
  deals: "Recent deals",
};

/** Default 12-column layout: command-center scan order (top → bottom, left → right on wide screens). */
const DEFAULT_LG: Layout = [
  { i: "metrics", x: 0, y: 0, w: 12, h: 3, minW: 6, minH: 2 },
  { i: "pipeline", x: 0, y: 3, w: 12, h: 8, minH: 5 },
  { i: "charts", x: 0, y: 11, w: 12, h: 11, minH: 7 },
  { i: "leaderboard", x: 0, y: 22, w: 4, h: 13, minW: 3, minH: 8 },
  { i: "activity", x: 4, y: 22, w: 4, h: 13, minW: 3, minH: 8 },
  { i: "insights", x: 8, y: 22, w: 4, h: 13, minW: 3, minH: 8 },
  { i: "deals", x: 0, y: 35, w: 12, h: 10, minH: 6 },
];

function allBreakpointsSame(layout: Layout): ResponsiveLayouts {
  return {
    lg: layout,
    md: layout,
    sm: layout,
    xs: layout,
    xxs: layout,
  };
}

const DEFAULT_LAYOUTS = allBreakpointsSame(DEFAULT_LG);

function mergeLayoutsFromStorage(stored: unknown): ResponsiveLayouts {
  if (!stored || typeof stored !== "object") return DEFAULT_LAYOUTS;
  const s = stored as Partial<ResponsiveLayouts>;
  return {
    lg: Array.isArray(s.lg) && s.lg.length ? s.lg : DEFAULT_LAYOUTS.lg,
    md: Array.isArray(s.md) && s.md.length ? s.md : DEFAULT_LAYOUTS.md,
    sm: Array.isArray(s.sm) && s.sm.length ? s.sm : DEFAULT_LAYOUTS.sm,
    xs: Array.isArray(s.xs) && s.xs.length ? s.xs : DEFAULT_LAYOUTS.xs,
    xxs: Array.isArray(s.xxs) && s.xxs.length ? s.xxs : DEFAULT_LAYOUTS.xxs,
  };
}

type Props = {
  className?: string;
  slots: Record<DashboardSlotKey, React.ReactNode>;
};

/**
 * Draggable / resizable dashboard shell. Layout persisted in localStorage (per browser).
 */
const LAYOUT_PERSIST_MS = 320;

export function DashboardGridLayout({ className, slots }: Props) {
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(DEFAULT_LAYOUTS);
  const [mounted, setMounted] = useState(false);
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setLayouts(mergeLayoutsFromStorage(JSON.parse(raw)));
    } catch {
      /* ignore */
    }
  }, []);

  const layoutsRef = useRef(layouts);
  layoutsRef.current = layouts;

  useEffect(
    () => () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(layoutsRef.current));
      } catch {
        /* ignore */
      }
    },
    []
  );

  const onLayoutChange = useCallback((_current: Layout, allLayouts: ResponsiveLayouts) => {
    setLayouts(allLayouts);
    layoutsRef.current = allLayouts;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      persistTimerRef.current = null;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
      } catch {
        /* ignore */
      }
    }, LAYOUT_PERSIST_MS);
  }, []);

  return (
    <div className={cn("dashboard-grid-scope", className)}>
      {!mounted ? (
        <div className="space-y-6">
          {DASHBOARD_SLOT_KEYS.map((k) => (
            <div key={k} className="rounded-lg border bg-card">
              {slots[k]}
            </div>
          ))}
        </div>
      ) : (
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          onLayoutChange={onLayoutChange}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 12, xs: 12, xxs: 12 }}
          rowHeight={36}
          margin={[12, 12]}
          containerPadding={[0, 0]}
          draggableHandle=".dashboard-drag-handle"
          compactType="vertical"
          preventCollision={false}
        >
          {DASHBOARD_SLOT_KEYS.map((id) => (
            <div key={id} className="h-full">
              <div className="flex h-full min-h-0 flex-col gap-1">
                <div
                  className="dashboard-drag-handle flex shrink-0 cursor-grab items-center gap-1.5 rounded-md border border-border/80 bg-muted/50 px-2 py-1 select-none active:cursor-grabbing"
                  title="Drag to move · resize from corner"
                >
                  <GripVertical className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {WIDGET_LABELS[id]}
                  </span>
                </div>
                <div className="min-h-0 flex-1 overflow-auto">{slots[id]}</div>
              </div>
            </div>
          ))}
        </ResponsiveGridLayout>
      )}
    </div>
  );
}
