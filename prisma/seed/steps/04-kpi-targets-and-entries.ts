import type { PrismaClient } from "@prisma/client";
import { SEED_IDS } from "../ids.js";

/**
 * KPI targets: global defaults (no reportingPeriodId).
 * Entries: two weeks × four reps — enough for dashboard cards and trend charts.
 */
export async function seedKpiTargetsAndEntries(prisma: PrismaClient): Promise<void> {
  const { ACQUISITIONS, DISPOSITIONS } = SEED_IDS.team;
  const weekPrev = SEED_IDS.reportingPeriod.WEEK_2026_02_24;
  const weekCurr = SEED_IDS.reportingPeriod.WEEK_2026_03_03;

  await prisma.kpiTarget.createMany({
    data: [
      // Acquisitions weekly targets
      { teamId: ACQUISITIONS, metricKey: "DIALS", targetValue: 400 },
      { teamId: ACQUISITIONS, metricKey: "TALK_TIME_MINUTES", targetValue: 2400 },
      { teamId: ACQUISITIONS, metricKey: "LEADS_WORKED", targetValue: 60 },
      { teamId: ACQUISITIONS, metricKey: "OFFERS_MADE", targetValue: 12 },
      { teamId: ACQUISITIONS, metricKey: "CONTRACTS_SIGNED", targetValue: 4 },
      { teamId: ACQUISITIONS, metricKey: "FALLOUT_COUNT", targetValue: 2 },
      { teamId: ACQUISITIONS, metricKey: "REVENUE_FROM_FUNDED", targetValue: 120000 },
      // Dispositions weekly targets
      { teamId: DISPOSITIONS, metricKey: "DIALS", targetValue: 350 },
      { teamId: DISPOSITIONS, metricKey: "TALK_TIME_MINUTES", targetValue: 2100 },
      { teamId: DISPOSITIONS, metricKey: "BUYER_CONVERSATIONS", targetValue: 45 },
      { teamId: DISPOSITIONS, metricKey: "PROPERTIES_MARKETED", targetValue: 18 },
      { teamId: DISPOSITIONS, metricKey: "EMDS_RECEIVED", targetValue: 8 },
      { teamId: DISPOSITIONS, metricKey: "ASSIGNMENTS_SECURED", targetValue: 5 },
      { teamId: DISPOSITIONS, metricKey: "AVG_ASSIGNMENT_FEE", targetValue: 12500 },
      { teamId: DISPOSITIONS, metricKey: "FALLOUT_COUNT", targetValue: 2 },
      { teamId: DISPOSITIONS, metricKey: "REVENUE_FROM_FUNDED", targetValue: 95000 },
    ],
  });

  const u = SEED_IDS.user;

  await prisma.kpiEntry.createMany({
    data: [
      // Previous week — acquisitions reps
      {
        userId: u.REP_ACQ_JORDAN,
        teamId: ACQUISITIONS,
        reportingPeriodId: weekPrev,
        dials: 312,
        talkTimeMinutes: 2280,
        falloutCount: 1,
        revenueFromFunded: 42000,
        leadsWorked: 48,
        offersMade: 9,
        contractsSigned: 2,
      },
      {
        userId: u.REP_ACQ_SARAH,
        teamId: ACQUISITIONS,
        reportingPeriodId: weekPrev,
        dials: 288,
        talkTimeMinutes: 2010,
        falloutCount: 2,
        revenueFromFunded: 38000,
        leadsWorked: 44,
        offersMade: 8,
        contractsSigned: 3,
      },
      // Previous week — dispositions reps
      {
        userId: u.REP_DISPO_ALEX,
        teamId: DISPOSITIONS,
        reportingPeriodId: weekPrev,
        dials: 265,
        talkTimeMinutes: 1890,
        falloutCount: 1,
        revenueFromFunded: 51000,
        buyerConversations: 38,
        propertiesMarketed: 14,
        emdsReceived: 6,
        assignmentsSecured: 3,
        avgAssignmentFee: 11800,
      },
      {
        userId: u.REP_DISPO_CASEY,
        teamId: DISPOSITIONS,
        reportingPeriodId: weekPrev,
        dials: 241,
        talkTimeMinutes: 1755,
        falloutCount: 0,
        revenueFromFunded: 46500,
        buyerConversations: 35,
        propertiesMarketed: 12,
        emdsReceived: 5,
        assignmentsSecured: 2,
        avgAssignmentFee: 12200,
      },
      // Current week (matches UI default “2026-03-03”) — slightly higher activity
      {
        userId: u.REP_ACQ_JORDAN,
        teamId: ACQUISITIONS,
        reportingPeriodId: weekCurr,
        dials: 342,
        talkTimeMinutes: 2460,
        falloutCount: 1,
        revenueFromFunded: 52000,
        leadsWorked: 52,
        offersMade: 11,
        contractsSigned: 3,
      },
      {
        userId: u.REP_ACQ_SARAH,
        teamId: ACQUISITIONS,
        reportingPeriodId: weekCurr,
        dials: 318,
        talkTimeMinutes: 2190,
        falloutCount: 2,
        revenueFromFunded: 48500,
        leadsWorked: 49,
        offersMade: 10,
        contractsSigned: 4,
      },
      {
        userId: u.REP_DISPO_ALEX,
        teamId: DISPOSITIONS,
        reportingPeriodId: weekCurr,
        dials: 292,
        talkTimeMinutes: 2055,
        falloutCount: 1,
        revenueFromFunded: 58000,
        buyerConversations: 42,
        propertiesMarketed: 16,
        emdsReceived: 7,
        assignmentsSecured: 4,
        avgAssignmentFee: 12600,
      },
      {
        userId: u.REP_DISPO_CASEY,
        teamId: DISPOSITIONS,
        reportingPeriodId: weekCurr,
        dials: 268,
        talkTimeMinutes: 1920,
        falloutCount: 0,
        revenueFromFunded: 53200,
        buyerConversations: 39,
        propertiesMarketed: 14,
        emdsReceived: 6,
        assignmentsSecured: 3,
        avgAssignmentFee: 12400,
      },
    ],
  });
}
