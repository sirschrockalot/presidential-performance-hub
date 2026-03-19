/**
 * Stable primary keys for seed rows (safe to reference across seed steps).
 * Re-running seed truncates app tables first; these IDs are recreated each run.
 */
export const SEED_IDS = {
  role: {
    ADMIN: "seed_role_admin",
    ACQUISITIONS_MANAGER: "seed_role_acquisitions_manager",
    DISPOSITIONS_MANAGER: "seed_role_dispositions_manager",
    TRANSACTION_COORDINATOR: "seed_role_transaction_coordinator",
    REP: "seed_role_rep",
  },
  team: {
    ACQUISITIONS: "seed_team_acquisitions",
    DISPOSITIONS: "seed_team_dispositions",
    OPERATIONS: "seed_team_operations",
  },
  /** Align with `src/data/mock-data.ts` user ids (u1–u8) for auth + scoped fixtures */
  user: {
    ADMIN: "u1",
    ACQUISITIONS_MANAGER: "u2",
    DISPOSITIONS_MANAGER: "u3",
    TC: "u4",
    REP_ACQ_JORDAN: "u5",
    REP_ACQ_SARAH: "u6",
    REP_DISPO_ALEX: "u7",
    REP_DISPO_CASEY: "u8",
  },
  reportingPeriod: {
    WEEK_2026_02_24: "seed_rp_week_2026_02_24",
    WEEK_2026_03_03: "seed_rp_week_2026_03_03",
  },
  deal: {
    D1: "seed_deal_001",
    D2: "seed_deal_002",
    D3: "seed_deal_003",
    D4: "seed_deal_004",
    D5: "seed_deal_005",
    D6: "seed_deal_006",
    D7: "seed_deal_007",
    D8: "seed_deal_008",
    D9: "seed_deal_009",
    D10: "seed_deal_010",
    D11: "seed_deal_011",
    D12: "seed_deal_012",
  },
  draw: {
    DR1: "seed_draw_001",
    DR2: "seed_draw_002",
    DR3: "seed_draw_003",
    DR4: "seed_draw_004",
    DR5: "seed_draw_005",
    DR6: "seed_draw_006",
  },
  pointAdjustment: {
    MANUAL_1: "seed_point_adjustment_001",
  },
} as const;
