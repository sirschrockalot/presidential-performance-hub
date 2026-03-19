import type { Prisma } from "@prisma/client";
import type { UserRoleCode } from "@prisma/client";

export type DealActor = {
  id: string;
  roleCode: UserRoleCode;
};

/**
 * Row-level scope for deal queries (aligns with mock `DataScope` rules).
 */
export function dealWhereForScope(actor: DealActor): Prisma.DealWhereInput {
  switch (actor.roleCode) {
    case "ADMIN":
    case "ACQUISITIONS_MANAGER":
    case "DISPOSITIONS_MANAGER":
      return {};
    case "TRANSACTION_COORDINATOR":
      return { transactionCoordinatorId: actor.id };
    case "REP":
      return {
        OR: [{ acquisitionsRepId: actor.id }, { dispoRepId: actor.id }],
      };
    default:
      return { id: "__none__" };
  }
}
