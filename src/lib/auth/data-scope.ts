import type { UserRoleCode } from "@prisma/client";
import type { Deal } from "@/types";
import type { ActivityItem } from "@/components/shared/ActivityFeed";
import { deals as mockDeals, getUserById } from "@/mock/mock-data";

export type DataScope =
  | { mode: "full" }
  | { mode: "rep"; userId: string }
  | { mode: "tc"; userId: string };

export function dataScopeFromSession(roleCode: UserRoleCode | undefined, mockScopeId: string | undefined): DataScope {
  const scopeId = mockScopeId ?? "";
  if (!roleCode || !scopeId) return { mode: "full" };

  if (roleCode === "REP") return { mode: "rep", userId: scopeId };
  if (roleCode === "TRANSACTION_COORDINATOR") return { mode: "tc", userId: scopeId };

  return { mode: "full" };
}

export function filterDealsByScope(deals: Deal[], scope: DataScope): Deal[] {
  if (scope.mode === "full") return deals;
  if (scope.mode === "tc") {
    return deals.filter((d) => d.transactionCoordinatorId === scope.userId);
  }
  return deals.filter(
    (d) => d.acquisitionsRepId === scope.userId || d.dispoRepId === scope.userId
  );
}

export function canAccessDeal(dealId: string, scope: DataScope): boolean {
  const deal = mockDeals.find((d) => d.id === dealId);
  if (!deal) return false;
  return filterDealsByScope([deal], scope).length > 0;
}

/** Which mock user ids appear on the points leaderboard */
export function leaderboardUserIdsForScope(scope: DataScope): string[] {
  if (scope.mode === "rep") return [scope.userId];
  return ["u5", "u6", "u7", "u8", "u4"];
}

export function filterActivityFeed(items: ActivityItem[], scope: DataScope): ActivityItem[] {
  if (scope.mode === "full") return items;

  const user = getUserById(scope.userId);
  const nameLower = user?.name?.toLowerCase() ?? "";

  return items.filter((item) => {
    if (item.type === "kpi_submitted") return false;

    const dealMatch = item.link?.match(/^\/deals\/([^/]+)$/);
    if (dealMatch) {
      return canAccessDeal(dealMatch[1], scope);
    }

    if (!nameLower) return false;
    return item.description.toLowerCase().includes(nameLower) || item.title.toLowerCase().includes(nameLower);
  });
}
