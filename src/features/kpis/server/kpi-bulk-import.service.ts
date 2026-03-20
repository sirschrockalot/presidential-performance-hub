import type { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

import type { KpiActor } from "@/features/kpis/server/kpi-scope";
import { canMutateKpiEntries, kpiEntryUserWhereForScope, uiTeamToPrismaTeamCode } from "@/features/kpis/server/kpi-scope";
import { roleHasPermission } from "@/lib/auth/permissions";
import { writeAuditLog } from "@/lib/audit/audit-log";

import type { KpiBulkImportInput } from "@/features/kpis/schemas/kpi-bulk-import.schemas";

type UiTeamKey = "acquisitions" | "dispositions";

export type BulkImportKpisError = {
  code: "UNKNOWN_REP" | "AMBIGUOUS_REP" | "LOCKED_PERIOD" | "FORBIDDEN_TEAM";
  message: string;
  weekStarting?: string;
  repName?: string;
  team?: UiTeamKey;
};

export type BulkImportKpisResult = {
  imported: number; // created
  updated: number; // updated
  skipped: number; // skipped rows (unknown reps, locked weeks, forbidden teams)
  errors: BulkImportKpisError[];
};

function parseWeekStartingUtc(weekStarting: string): Date {
  return new Date(`${weekStarting}T00:00:00.000Z`);
}

function weekKeyUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computePeriodEnd(periodStart: Date): Date {
  // Mirror seed logic: periodEnd is exactly +7 days at 00:00:00.000Z.
  return new Date(periodStart.getTime() + 7 * 24 * 60 * 60 * 1000);
}

function normalizeRepName(name: string): string {
  // Normalize for matching against DB user.name (which may include last names, punctuation, etc.)
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function bulkImportKpis(
  prisma: PrismaClient,
  actor: KpiActor,
  input: KpiBulkImportInput
): Promise<BulkImportKpisResult> {
  if (!canMutateKpiEntries(actor) || !roleHasPermission(actor.roleCode, "kpi:new_entry")) {
    throw new Error("Forbidden");
  }

  const MAX_ERRORS = 50;
  const errors: BulkImportKpisError[] = [];
  const pushError = (e: BulkImportKpisError) => {
    if (errors.length < MAX_ERRORS) errors.push(e);
  };

  const requestedWeekKeys = Array.from(new Set(input.weeks.map((w) => w.weekStarting)));

  const weekStarts = requestedWeekKeys.map(parseWeekStartingUtc);
  const periodEndByStart = new Map<string, Date>(
    weekStarts.map((start) => [weekKeyUtc(start), computePeriodEnd(start)])
  );

  const teamsInPayload: Record<UiTeamKey, boolean> = {
    acquisitions: input.weeks.some((w) => w.acquisitions.length > 0),
    dispositions: input.weeks.some((w) => w.dispositions.length > 0),
  };

  const teamAllowed: Record<UiTeamKey, boolean> = {
    acquisitions: false,
    dispositions: false,
  };

  for (const team of Object.keys(teamsInPayload) as UiTeamKey[]) {
    if (!teamsInPayload[team]) continue;
    const prismaTeamCode = uiTeamToPrismaTeamCode(team);
    const scope = kpiEntryUserWhereForScope(actor, prismaTeamCode);
    teamAllowed[team] = scope.userId !== "__none__";
    if (!teamAllowed[team]) {
      pushError({
        code: "FORBIDDEN_TEAM",
        message: `You do not have permission to import KPI entries for team "${team}".`,
        team,
      });
    }
  }

  // Transaction is important to ensure ReportingPeriods exist and the set of upserts is consistent.
  return prisma.$transaction(async (tx) => {
    // 1) Ensure weekly reporting periods exist.
    const existingPeriods = await tx.reportingPeriod.findMany({
      where: {
        kind: "WEEKLY",
        periodStart: { in: weekStarts },
      },
      select: { id: true, periodStart: true, isLocked: true },
    });

    const byStart = new Map<string, { id: string; isLocked: boolean }>();
    for (const p of existingPeriods) {
      byStart.set(weekKeyUtc(p.periodStart), { id: p.id, isLocked: p.isLocked });
    }

    const missingStarts = requestedWeekKeys.filter((k) => !byStart.has(k));
    if (missingStarts.length > 0) {
      await tx.reportingPeriod.createMany({
        data: missingStarts.map((k) => {
          const start = parseWeekStartingUtc(k);
          const end = periodEndByStart.get(k)!;
          return {
            kind: "WEEKLY",
            periodStart: start,
            periodEnd: end,
            label: `Week of ${k}`,
            isLocked: false,
          };
        }),
        skipDuplicates: true,
      });
    }

    const allPeriods = await tx.reportingPeriod.findMany({
      where: { kind: "WEEKLY", periodStart: { in: weekStarts } },
      select: { id: true, periodStart: true, isLocked: true },
    });

    const periodIdByWeek = new Map<string, { id: string; isLocked: boolean }>();
    for (const p of allPeriods) {
      periodIdByWeek.set(weekKeyUtc(p.periodStart), { id: p.id, isLocked: p.isLocked });
    }

    const lockedWeeks = new Set<string>(
      Array.from(periodIdByWeek.entries())
        .filter(([, v]) => v.isLocked)
        .map(([k]) => k)
    );

    for (const w of lockedWeeks) {
      pushError({
        code: "LOCKED_PERIOD",
        message: `Reporting period is locked for week "${w}".`,
        weekStarting: w,
      });
    }

    // 2) Resolve repName -> User id for each team.
    const usersByTeam: Record<UiTeamKey, Array<{ id: string; teamId: string; normalizedName: string }>> = {
      acquisitions: [],
      dispositions: [],
    };

    const allowedRepRoleCodes = ["REP", "ACQUISITIONS_MANAGER", "DISPOSITIONS_MANAGER"] as const;

    for (const team of Object.keys(usersByTeam) as UiTeamKey[]) {
      if (!teamAllowed[team]) continue;
      const prismaTeamCode = uiTeamToPrismaTeamCode(team);

      // KPI entries are keyed by `userId`, and DB may not currently populate `roleCode=REP`.
      // So we match against users for the team using the legacy contractor/contributor role codes too.
      const users = await tx.user.findMany({
        where: {
          team: { code: prismaTeamCode },
          role: { code: { in: allowedRepRoleCodes as any } },
        },
        select: { id: true, name: true, teamId: true },
      });

      usersByTeam[team] = users.map((u) => ({
        id: u.id,
        teamId: u.teamId,
        normalizedName: normalizeRepName(u.name),
      }));
    }

    function resolveUserIdByName(team: UiTeamKey, repName: string): { id: string; teamId: string } | null {
      const needle = normalizeRepName(repName);
      if (!needle) return null;

      const pool = usersByTeam[team];
      if (!pool.length) return null;

      // Allow payload to use first-name-only / last-name-only.
      const exact = pool.filter((u) => u.normalizedName === needle);
      if (exact.length === 1) return { id: exact[0].id, teamId: exact[0].teamId };
      if (exact.length > 1) return null; // ambiguous exact

      const prefix = pool.filter((u) => u.normalizedName.startsWith(`${needle} `));
      const suffix = pool.filter((u) => u.normalizedName.endsWith(` ${needle}`));

      const combined = [...prefix, ...suffix];
      if (combined.length === 1) return { id: combined[0].id, teamId: combined[0].teamId };

      // If multiple matches (e.g. multiple people share the same first name), fail loudly.
      if (combined.length > 1) {
        return null;
      }

      // No prefix/suffix matches.
      return null;
    }

    // 3) Build upsert list.
    type UpsertRow = {
      weekStarting: string;
      weekPeriodId: string;
      team: UiTeamKey;
      repUserId: string;
      repTeamId: string;
      dials: number;
      talkTimeMinutes: number;
      // Acquisitions
      leadsWorked: number | null;
      offersMade: number | null;
      contractsSigned: number | null;
      // Dispositions
      buyerConversations: number | null;
      propertiesMarketed: number | null;
      emdsReceived: number | null;
      assignmentsSecured: number | null;
      avgAssignmentFee: Decimal | null;
      // shared
      falloutCount: number;
      revenueFromFunded: Decimal;
    };

    const rows: UpsertRow[] = [];
    let skipped = 0;

    const ensureNotLocked = (weekStarting: string) => !lockedWeeks.has(weekStarting);

    for (const week of input.weeks) {
      if (!ensureNotLocked(week.weekStarting)) {
        // Count entries as skipped but avoid flooding errors.
        if (week.acquisitions.length > 0 && teamAllowed.acquisitions) skipped += week.acquisitions.length;
        if (week.dispositions.length > 0 && teamAllowed.dispositions) skipped += week.dispositions.length;
        continue;
      }

      const period = periodIdByWeek.get(week.weekStarting);
      if (!period) continue;

      if (teamAllowed.acquisitions) {
        for (const rep of week.acquisitions) {
          const user = resolveUserIdByName("acquisitions", rep.repName);
          if (!user) {
            skipped += 1;
            const needle = normalizeRepName(rep.repName);
            const ambiguous = usersByTeam.acquisitions.filter((u) => {
              return (
                u.normalizedName.startsWith(`${needle} `) ||
                u.normalizedName.endsWith(` ${needle}`) ||
                u.normalizedName === needle
              );
            }).length;
            pushError({
              code: ambiguous > 1 ? "AMBIGUOUS_REP" : "UNKNOWN_REP",
              message:
                ambiguous > 1
                  ? `Ambiguous rep "${rep.repName}" for acquisitions team. Please include last name.`
                  : `Unknown rep "${rep.repName}" for acquisitions team.`,
              weekStarting: week.weekStarting,
              repName: rep.repName,
              team: "acquisitions",
            });
            continue;
          }
          rows.push({
            weekStarting: week.weekStarting,
            weekPeriodId: period.id,
            team: "acquisitions",
            repUserId: user.id,
            repTeamId: user.teamId,
            dials: rep.dials,
            talkTimeMinutes: rep.talkTimeMinutes,
            offersMade: rep.offersMade,
            contractsSigned: rep.contractsSigned,
            leadsWorked: 0,
            buyerConversations: null,
            propertiesMarketed: null,
            emdsReceived: null,
            assignmentsSecured: null,
            avgAssignmentFee: null,
            falloutCount: 0,
            revenueFromFunded: new Decimal(0),
          });
        }
      } else if (week.acquisitions.length > 0) {
        // Team forbidden: count all rows that won't be imported.
        skipped += week.acquisitions.length;
      }

      if (teamAllowed.dispositions) {
        for (const rep of week.dispositions) {
          const user = resolveUserIdByName("dispositions", rep.repName);
          if (!user) {
            skipped += 1;
            const needle = normalizeRepName(rep.repName);
            const ambiguous = usersByTeam.dispositions.filter((u) => {
              return (
                u.normalizedName.startsWith(`${needle} `) ||
                u.normalizedName.endsWith(` ${needle}`) ||
                u.normalizedName === needle
              );
            }).length;
            pushError({
              code: ambiguous > 1 ? "AMBIGUOUS_REP" : "UNKNOWN_REP",
              message:
                ambiguous > 1
                  ? `Ambiguous rep "${rep.repName}" for dispositions team. Please include last name.`
                  : `Unknown rep "${rep.repName}" for dispositions team.`,
              weekStarting: week.weekStarting,
              repName: rep.repName,
              team: "dispositions",
            });
            continue;
          }
          rows.push({
            weekStarting: week.weekStarting,
            weekPeriodId: period.id,
            team: "dispositions",
            repUserId: user.id,
            repTeamId: user.teamId,
            dials: rep.dials,
            talkTimeMinutes: rep.talkTimeMinutes,
            offersMade: null,
            contractsSigned: null,
            leadsWorked: null,
            buyerConversations: 0,
            propertiesMarketed: 0,
            emdsReceived: 0,
            assignmentsSecured: 0,
            avgAssignmentFee: new Decimal(0),
            falloutCount: 0,
            revenueFromFunded: new Decimal(0),
          });
        }
      } else if (week.dispositions.length > 0) {
        // Team forbidden: count all rows that won't be imported.
        skipped += week.dispositions.length;
      }
    }

    // Deduplicate by the KpiEntry unique key to avoid miscounting create-vs-update.
    const dedupedByUniqueKey = new Map<string, typeof rows[number]>();
    for (const r of rows) {
      dedupedByUniqueKey.set(`${r.repUserId}:${r.weekPeriodId}`, r);
    }
    const dedupedRows = Array.from(dedupedByUniqueKey.values());

    if (dedupedRows.length === 0) {
      return {
        imported: 0,
        updated: 0,
        skipped,
        errors,
      };
    }

    // 4) Prefetch existing entries for create-vs-update audit.
    const userIds = Array.from(new Set(dedupedRows.map((r) => r.repUserId)));
    const periodIds = Array.from(new Set(dedupedRows.map((r) => r.weekPeriodId)));
    const keySet = new Set(dedupedRows.map((r) => `${r.repUserId}:${r.weekPeriodId}`));

    const existing = await tx.kpiEntry.findMany({
      where: {
        userId: { in: userIds },
        reportingPeriodId: { in: periodIds },
      },
      select: {
        id: true,
        userId: true,
        reportingPeriodId: true,
        dials: true,
        talkTimeMinutes: true,
        falloutCount: true,
        revenueFromFunded: true,
        leadsWorked: true,
        offersMade: true,
        contractsSigned: true,
        buyerConversations: true,
        propertiesMarketed: true,
        emdsReceived: true,
        assignmentsSecured: true,
        avgAssignmentFee: true,
      },
    });

    const existingByKey = new Map<
      string,
      Omit<(typeof existing)[number], "id"> & { id: string }
    >();
    for (const row of existing) {
      const key = `${row.userId}:${row.reportingPeriodId}`;
      if (!keySet.has(key)) continue;
      existingByKey.set(key, row);
    }

    let imported = 0;
    let updated = 0;

    // 5) Upsert rows + audit.
    for (const r of dedupedRows) {
      const key = `${r.repUserId}:${r.weekPeriodId}`;
      const before = existingByKey.get(key) ?? null;

      const createData = {
        userId: r.repUserId,
        teamId: r.repTeamId,
        reportingPeriodId: r.weekPeriodId,
        dials: r.dials,
        talkTimeMinutes: r.talkTimeMinutes,
        falloutCount: r.falloutCount,
        revenueFromFunded: r.revenueFromFunded,
        leadsWorked: r.team === "acquisitions" ? r.leadsWorked : null,
        offersMade: r.team === "acquisitions" ? r.offersMade : null,
        contractsSigned: r.team === "acquisitions" ? r.contractsSigned : null,
        buyerConversations: r.team === "dispositions" ? r.buyerConversations : null,
        propertiesMarketed: r.team === "dispositions" ? r.propertiesMarketed : null,
        emdsReceived: r.team === "dispositions" ? r.emdsReceived : null,
        assignmentsSecured: r.team === "dispositions" ? r.assignmentsSecured : null,
        avgAssignmentFee: r.team === "dispositions" ? r.avgAssignmentFee : null,
      } as const;

      const updateData = {
        dials: r.dials,
        talkTimeMinutes: r.talkTimeMinutes,
        falloutCount: r.falloutCount,
        revenueFromFunded: r.revenueFromFunded,
        leadsWorked: r.team === "acquisitions" ? r.leadsWorked : null,
        offersMade: r.team === "acquisitions" ? r.offersMade : null,
        contractsSigned: r.team === "acquisitions" ? r.contractsSigned : null,
        buyerConversations: r.team === "dispositions" ? r.buyerConversations : null,
        propertiesMarketed: r.team === "dispositions" ? r.propertiesMarketed : null,
        emdsReceived: r.team === "dispositions" ? r.emdsReceived : null,
        assignmentsSecured: r.team === "dispositions" ? r.assignmentsSecured : null,
        avgAssignmentFee: r.team === "dispositions" ? r.avgAssignmentFee : null,
        teamId: r.repTeamId,
        reportingPeriodId: r.weekPeriodId,
      } as const;

      const next = await tx.kpiEntry.upsert({
        where: {
          userId_reportingPeriodId: {
            userId: r.repUserId,
            reportingPeriodId: r.weekPeriodId,
          },
        },
        create: createData,
        update: updateData,
        select: { id: true },
      });

      if (before) updated += 1;
      else imported += 1;

      await writeAuditLog(tx, {
        actorUserId: actor.id,
        action: before ? "kpi.entry.update" : "kpi.entry.create",
        entityType: "kpi_entry",
        entityId: next.id,
        metadata: {
          team: r.team,
          weekStarting: r.weekStarting,
          repUserId: r.repUserId,
          reportingPeriodId: r.weekPeriodId,
          before: before
            ? {
                dials: before.dials,
                talkTimeMinutes: before.talkTimeMinutes,
                falloutCount: before.falloutCount,
                revenueFromFunded: before.revenueFromFunded,
                leadsWorked: before.leadsWorked,
                offersMade: before.offersMade,
                contractsSigned: before.contractsSigned,
                buyerConversations: before.buyerConversations,
                propertiesMarketed: before.propertiesMarketed,
                emdsReceived: before.emdsReceived,
                assignmentsSecured: before.assignmentsSecured,
                avgAssignmentFee: before.avgAssignmentFee,
              }
            : null,
          after: {
            dials: r.dials,
            talkTimeMinutes: r.talkTimeMinutes,
            falloutCount: r.falloutCount,
            revenueFromFunded: r.revenueFromFunded,
            leadsWorked: r.team === "acquisitions" ? r.leadsWorked : null,
            offersMade: r.team === "acquisitions" ? r.offersMade : null,
            contractsSigned: r.team === "acquisitions" ? r.contractsSigned : null,
            buyerConversations: r.team === "dispositions" ? r.buyerConversations : null,
            propertiesMarketed: r.team === "dispositions" ? r.propertiesMarketed : null,
            emdsReceived: r.team === "dispositions" ? r.emdsReceived : null,
            assignmentsSecured: r.team === "dispositions" ? r.assignmentsSecured : null,
            avgAssignmentFee: r.team === "dispositions" ? r.avgAssignmentFee : null,
          },
        },
      });
    }

    return {
      imported,
      updated,
      skipped,
      errors,
    };
  });
}

