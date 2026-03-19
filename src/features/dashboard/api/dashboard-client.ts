export type DashboardOverviewDto = {
  fundedDealsThisMonth: number;
  totalAssignmentRevenueThisMonth: number;
  avgAssignmentFeeThisMonth: number;
  assignmentRevenueTrend: { month: string; revenue: number; fundedDeals?: number }[];
  pointsTrend: { month: string; points: number }[];
  weeklySnapshot: {
    weekStarting: string | null;
    totalDials: number;
    totalTalkTimeMinutes: number;
    offersMade: number;
    contractsSigned: number;
    conversionRate: number;
    repCount: number;
  };
  recentActivity: {
    id: string;
    type:
      | "deal_created"
      | "deal_funded"
      | "deal_status"
      | "draw_requested"
      | "draw_approved"
      | "points_awarded"
      | "kpi_submitted"
      | "user_joined";
    title: string;
    description: string;
    timestamp: string;
    link?: string;
    actor?: string;
  }[];
  teamSize: { active: number; inactive: number };
};

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error((data && (data as any).error) || res.statusText);
  }
  return data as T;
}

export async function fetchDashboardOverview(): Promise<DashboardOverviewDto> {
  const res = await fetch("/api/dashboard/overview", { credentials: "include" });
  const json = await parseJson<{ overview: DashboardOverviewDto }>(res);
  return json.overview;
}

