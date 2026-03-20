import type { PrismaClient } from "@prisma/client";

import type { DealActor } from "@/features/deals/server/deal-scope";
import { dealWhereForScope } from "@/features/deals/server/deal-scope";
import { createDeal, updateDeal, updateDealStatus } from "@/features/deals/server/deals.service";
import { computeAssignmentFee } from "@/features/deals/utils/assignment-fee";
import type { DealImportRow, DealBulkImportInput } from "@/features/deals/schemas/deal-bulk-import.schemas";
import type { DealUiStatus } from "@/features/deals/schemas/deal.schemas";

export type BulkImportDealsError = {
  code: "INVALID_ROW" | "UNKNOWN_ACQ_REP" | "AMBIGUOUS_ACQ_REP";
  message: string;
  rowIndex: number;
  externalRef: string | null;
};

export type BulkImportDealsResult = {
  imported: number;
  updated: number;
  skipped: number;
  errors: BulkImportDealsError[];
};

const STATUS_ALIASES: Record<string, DealUiStatus> = {
  lead: "lead",
  under_contract: "under_contract",
  "under contract": "under_contract",
  marketed: "marketed",
  buyer_committed: "buyer_committed",
  "buyer committed": "buyer_committed",
  emd_received: "emd_received",
  "emd received": "emd_received",
  assigned: "assigned",
  closed_funded: "closed_funded",
  "closed funded": "closed_funded",
  canceled: "canceled",
  cancelled: "canceled",
};

// Temporary import aliases coming from external deal export handles.
const IMPORT_REP_ALIASES: Record<string, string> = {
  pparsons: "patrick",
  canthony: "joel",
  cwiegand: "joel",
};

function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function emailPrefix(email: string): string {
  return email.split("@")[0]?.trim().toLowerCase() ?? "";
}

function toDateOnlyOrNull(input: string | null): string | null {
  if (!input) return null;
  const raw = input.trim();
  if (!raw) return null;

  // Already ISO date.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

  // Support YYYY/MM/DD.
  let m = raw.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (m) {
    const y = Number(m[1]);
    const mo = Number(m[2]);
    const d = Number(m[3]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  // Support M/D/YYYY or MM/DD/YY.
  m = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    let y = Number(m[3]);
    if (m[3].length === 2) y += y >= 70 ? 1900 : 2000;
    const mo = Number(m[1]);
    const d = Number(m[2]);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) {
      return `${String(y).padStart(4, "0")}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeStatus(input: string | null): DealUiStatus {
  if (!input) return "lead";
  const key = input.trim().toLowerCase().replace(/\s+/g, " ");
  return STATUS_ALIASES[key] ?? "lead";
}

function normalizePropertyAddress(row: DealImportRow): string | null {
  const base = row.propertyAddress?.trim() || "";
  const city = row.city?.trim() || "";
  const state = row.state?.trim() || "";
  const zip = row.zipCode?.trim() || "";

  if (base) {
    const suffix = [city, state, zip].filter(Boolean).join(", ");
    return suffix ? `${base}, ${suffix}` : base;
  }

  return null;
}

function pickContractPrice(row: DealImportRow): number | null {
  if (row.purchasePrice != null) return row.purchasePrice;
  if (row.offerAmount != null) return row.offerAmount;
  return null;
}

type NormalizedDealImportRow = {
  propertyAddress: string;
  sellerName: string;
  buyerName: string | null;
  acquisitionsRepName: string;
  dispoRepName: string | null;
  contractDate: string;
  closedFundedDate: string | null;
  contractPrice: number;
  assignmentPrice: number | null;
  assignmentFee: number | null;
  buyerEmdAmount: number | null;
  status: DealUiStatus;
  initialNote: string | null;
};

function normalizeRow(row: DealImportRow): { data: NormalizedDealImportRow | null; error?: string } {
  const propertyAddress = normalizePropertyAddress(row);
  const sellerName = row.sellerName?.trim() || "";
  const acquisitionsRepName = row.acquisitionRep?.trim() || row.assignedTo?.trim() || "";
  const contractDate = toDateOnlyOrNull(row.contractDate);
  const contractPrice = pickContractPrice(row);

  if (!propertyAddress) return { data: null, error: "Missing propertyAddress" };
  if (!sellerName) return { data: null, error: "Missing sellerName" };
  if (!acquisitionsRepName) return { data: null, error: "Missing acquisitionRep or assignedTo" };
  if (!contractDate) return { data: null, error: "Missing/invalid contractDate (YYYY-MM-DD)" };
  if (contractPrice == null) return { data: null, error: "Missing purchasePrice or offerAmount" };

  const additionalExpense = row.additionalExpenses ?? row.additionalExpense ?? 0;
  const assignmentFeeComputed =
    row.salePrice != null
      ? computeAssignmentFee(contractPrice, row.salePrice, additionalExpense)
      : null;
  const assignmentFee =
    assignmentFeeComputed != null ? assignmentFeeComputed : row.assignmentFee ?? null;

  return {
    data: {
      propertyAddress,
      sellerName,
      buyerName: row.buyerName ?? null,
      acquisitionsRepName,
      dispoRepName: row.dispositionRep ?? null,
      contractDate,
      closedFundedDate: toDateOnlyOrNull(row.closingDate),
      contractPrice,
      assignmentPrice: row.salePrice,
      assignmentFee,
      buyerEmdAmount: row.emdAmount,
      status: normalizeStatus(row.status),
      initialNote: row.notes ?? null,
    },
  };
}

export async function bulkImportDeals(
  prisma: PrismaClient,
  actor: DealActor,
  payload: DealBulkImportInput
): Promise<BulkImportDealsResult> {
  const users = await prisma.user.findMany({
    where: { active: true },
    select: { id: true, name: true, email: true },
  });

  const userPool = users.map((u) => ({
    id: u.id,
    normalizedName: normalizeName(u.name),
    emailPrefix: emailPrefix(u.email),
    compactInitialLast: normalizeName(u.name).split(" ").length >= 2
      ? `${normalizeName(u.name).split(" ")[0][0] ?? ""}${normalizeName(u.name).split(" ").at(-1) ?? ""}`
      : "",
  }));

  const resolveUserMatches = (rawName: string) => {
    const initialNeedle = normalizeName(rawName);
    const aliasExpanded = IMPORT_REP_ALIASES[initialNeedle] ?? initialNeedle;
    const needle = aliasExpanded;
    const needleCompact = needle.replace(/\s+/g, "");
    if (!needle) return [];

    return userPool.filter((u) => {
      if (u.normalizedName === needle) return true;
      if (u.normalizedName.startsWith(`${needle} `)) return true;
      if (u.emailPrefix === needleCompact) return true;
      if (u.compactInitialLast === needleCompact) return true;
      return false;
    });
  };

  const errors: BulkImportDealsError[] = [];
  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (let i = 0; i < payload.deals.length; i += 1) {
    const raw = payload.deals[i];
    const normalized = normalizeRow(raw);

    if (!normalized.data) {
      errors.push({
        code: "INVALID_ROW",
        message: normalized.error ?? "Invalid row",
        rowIndex: i,
        externalRef: raw.externalRef ?? null,
      });
      skipped += 1;
      continue;
    }

    const acqMatches = resolveUserMatches(normalized.data.acquisitionsRepName);
    if (acqMatches.length === 0) {
      errors.push({
        code: "UNKNOWN_ACQ_REP",
        message: `Unknown acquisitions rep "${normalized.data.acquisitionsRepName}"`,
        rowIndex: i,
        externalRef: raw.externalRef ?? null,
      });
      skipped += 1;
      continue;
    }
    if (acqMatches.length > 1) {
      errors.push({
        code: "AMBIGUOUS_ACQ_REP",
        message: `Ambiguous acquisitions rep "${normalized.data.acquisitionsRepName}"`,
        rowIndex: i,
        externalRef: raw.externalRef ?? null,
      });
      skipped += 1;
      continue;
    }

    const dispoMatches = normalized.data.dispoRepName ? resolveUserMatches(normalized.data.dispoRepName) : [];

    const dispoRepId = dispoMatches.length === 1 ? dispoMatches[0].id : null;

    const existing = await prisma.deal.findFirst({
      where: {
        AND: [
          dealWhereForScope(actor),
          {
            propertyAddress: { equals: normalized.data.propertyAddress, mode: "insensitive" },
            sellerName: { equals: normalized.data.sellerName, mode: "insensitive" },
            contractDate: new Date(`${normalized.data.contractDate}T12:00:00.000Z`),
          },
        ],
      },
      select: { id: true, status: true },
    });

    if (!existing) {
      await createDeal(prisma, actor, {
        propertyAddress: normalized.data.propertyAddress,
        sellerName: normalized.data.sellerName,
        buyerName: normalized.data.buyerName,
        acquisitionsRepId: acqMatches[0].id,
        dispoRepId,
        transactionCoordinatorId: null,
        contractDate: normalized.data.contractDate,
        assignedDate: null,
        closedFundedDate: normalized.data.closedFundedDate,
        inspectionEndDate: null,
        contractPrice: normalized.data.contractPrice,
        assignmentPrice: normalized.data.assignmentPrice,
        assignmentFee: normalized.data.assignmentFee,
        buyerEmdAmount: normalized.data.buyerEmdAmount,
        buyerEmdReceived: Boolean(normalized.data.buyerEmdAmount && normalized.data.buyerEmdAmount > 0),
        titleCompany: "Unknown (Imported)",
        status: normalized.data.status,
        initialNote: normalized.data.initialNote,
      });
      imported += 1;
      continue;
    }

    await updateDeal(prisma, actor, existing.id, {
      propertyAddress: normalized.data.propertyAddress,
      sellerName: normalized.data.sellerName,
      buyerName: normalized.data.buyerName,
      acquisitionsRepId: acqMatches[0].id,
      dispoRepId,
      contractDate: normalized.data.contractDate,
      closedFundedDate: normalized.data.closedFundedDate,
      contractPrice: normalized.data.contractPrice,
      assignmentPrice: normalized.data.assignmentPrice,
      assignmentFee: normalized.data.assignmentFee,
      buyerEmdAmount: normalized.data.buyerEmdAmount,
      buyerEmdReceived: Boolean(normalized.data.buyerEmdAmount && normalized.data.buyerEmdAmount > 0),
      titleCompany: "Unknown (Imported)",
    });

    if (normalized.data.status) {
      await updateDealStatus(prisma, actor, existing.id, {
        status: normalized.data.status,
        note: "Updated via JSON import",
      });
    }

    updated += 1;
  }

  return { imported, updated, skipped, errors };
}
