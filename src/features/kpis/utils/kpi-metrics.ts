import type { Team } from "@/types";

export type KpiMetricKey =
  | "DIALS"
  | "TALK_TIME_MINUTES"
  | "LEADS_WORKED"
  | "OFFERS_MADE"
  | "CONTRACTS_SIGNED"
  | "FALLOUT_COUNT"
  | "REVENUE_FROM_FUNDED"
  | "BUYER_CONVERSATIONS"
  | "PROPERTIES_MARKETED"
  | "EMDS_RECEIVED"
  | "ASSIGNMENTS_SECURED"
  | "AVG_ASSIGNMENT_FEE";

export type KpiFieldDef = {
  field: string;
  metricKey: KpiMetricKey;
  label: string;
  kind: "int" | "decimal" | "money";
};

type KpiTeam = Exclude<Team, "operations">;

export const KPI_FIELD_DEFS: Record<KpiTeam, KpiFieldDef[]> = {
  acquisitions: [
    { field: "dials", metricKey: "DIALS", label: "Dials", kind: "int" },
    { field: "talkTimeMinutes", metricKey: "TALK_TIME_MINUTES", label: "Talk Time (min)", kind: "int" },
    { field: "leadsWorked", metricKey: "LEADS_WORKED", label: "Leads Worked", kind: "int" },
    { field: "offersMade", metricKey: "OFFERS_MADE", label: "Offers Made", kind: "int" },
    { field: "contractsSigned", metricKey: "CONTRACTS_SIGNED", label: "Contracts Signed", kind: "int" },
    { field: "falloutCount", metricKey: "FALLOUT_COUNT", label: "Fallout Count", kind: "int" },
    { field: "revenueFromFunded", metricKey: "REVENUE_FROM_FUNDED", label: "Revenue from Funded ($)", kind: "money" },
  ],
  dispositions: [
    { field: "dials", metricKey: "DIALS", label: "Dials", kind: "int" },
    { field: "talkTimeMinutes", metricKey: "TALK_TIME_MINUTES", label: "Talk Time (min)", kind: "int" },
    { field: "buyerConversations", metricKey: "BUYER_CONVERSATIONS", label: "Buyer Conversations", kind: "int" },
    { field: "propertiesMarketed", metricKey: "PROPERTIES_MARKETED", label: "Properties Marketed", kind: "int" },
    { field: "emdsReceived", metricKey: "EMDS_RECEIVED", label: "EMDs Received", kind: "int" },
    { field: "assignmentsSecured", metricKey: "ASSIGNMENTS_SECURED", label: "Assignments Secured", kind: "int" },
    { field: "avgAssignmentFee", metricKey: "AVG_ASSIGNMENT_FEE", label: "Avg Assignment Fee ($)", kind: "money" },
    { field: "falloutCount", metricKey: "FALLOUT_COUNT", label: "Fallout Count", kind: "int" },
    { field: "revenueFromFunded", metricKey: "REVENUE_FROM_FUNDED", label: "Revenue from Funded ($)", kind: "money" },
  ],
};

export const KPI_FIELD_DEF_BY_FIELD: Partial<Record<string, KpiFieldDef>> = Object.fromEntries(
  Object.entries(KPI_FIELD_DEFS).flatMap(([, defs]) => defs.map((d) => [d.field, d] as const))
) as any;

export function kpiMetricKeyForField(field: string): KpiMetricKey | null {
  return (KPI_FIELD_DEF_BY_FIELD[field]?.metricKey as KpiMetricKey | undefined) ?? null;
}

export function formatTalkTimeMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

