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
  potentialPipeline: {
    openPipelineDeals: number;
    dealsWithPotentialProfit: number;
    totalPotentialAssignmentProfit: number;
    potentialPointsByUser: Array<{
      userId: string;
      userName: string;
      potentialPoints: number;
      dealCount: number;
    }>;
  };
  kpiDashboard?: {
    lastWeekStarting: string | null;
    previousWeekStarting: string | null;
    weeklySummaryText?: string | null;
    acquisitions: {
      overallCompliancePercent: number; // 0..100
      totalReps: number;
      metrics: Array<{
        metricKey: string;
        metricLabel: string;
        hitLabel: string; // e.g. "1/2"
        hitRatePercent: number;
        hitLabelPrev?: string;
        hitRatePercentPrev?: number;
      }>;
    };
    dispositions: {
      overallCompliancePercent: number; // 0..100
      totalReps: number;
      metrics: Array<{
        metricKey: string;
        metricLabel: string;
        hitLabel: string; // e.g. "1/2"
        hitRatePercent: number;
        hitLabelPrev?: string;
        hitRatePercentPrev?: number;
      }>;
    };
    offersCompliance?: {
      hitLabel: string;
      hitRatePercent: number;
      hitReps: number;
      totalReps: number;
    };
    offersTierBreakdown?: {
      belowMinimum: { reps: number; totalReps: number };
      metMinimum: { reps: number; totalReps: number };
      hitTarget: { reps: number; totalReps: number };
      prev?: {
        belowMinimum: { reps: number; totalReps: number };
        metMinimum: { reps: number; totalReps: number };
        hitTarget: { reps: number; totalReps: number };
      };
    };
    trendDeltaPctPoints: {
      acquisitions: number; // current - previous, percentage points
      dispositions: number;
    };
    leaderboard: Array<{
      repUserId: string;
      repName: string;
      team: "acquisitions" | "dispositions";
      compliancePercent: number;
      kpisHitCount: number;
      totalKpisTracked: number;
    }>;
    topPerformer?: {
      repUserId: string;
      repName: string;
      team: "acquisitions" | "dispositions";
      compliancePercent: number;
    };
    mostAtRisk?: {
      repUserId: string;
      repName: string;
      team: "acquisitions" | "dispositions";
      compliancePercent: number;
      biggestGapMetricLabel: string | null;
    };
  };
};

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

export async function fetchDashboardOverview(): Promise<DashboardOverviewDto> {
  const res = await fetch("/api/dashboard/overview", { credentials: "include" });
  const json = await parseJson<{ overview: DashboardOverviewDto }>(res);
  return json.overview;
}

